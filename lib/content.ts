import "server-only";
import { cache } from "react";
import type { ContentStatus, Locale, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/lib/i18n";
import { absoluteUrl, safeExternalUrl, slugify, truncate } from "@/lib/utils";
import { plainText } from "@/lib/markdown";

export function localeEnum(locale: AppLocale): Locale {
  return locale === "fr" ? "FR" : "EN";
}

export function pickTranslation<T extends { locale: Locale }>(
  items: T[],
  locale: AppLocale,
): T | undefined {
  return (
    items.find((item) => item.locale === localeEnum(locale)) ??
    items.find((item) => item.locale === "FR") ??
    items[0]
  );
}

export function hasTranslation<T extends { locale: Locale }>(
  items: T[],
  locale: AppLocale,
): boolean {
  return items.some((item) => item.locale === localeEnum(locale));
}

export const publishedWhere = (): Prisma.CategoryWhereInput => ({
  deletedAt: null,
  status: "PUBLISHED",
  publishedAt: { lte: new Date() },
});

const categoryInclude = {
  translations: true,
  coverMedia: true,
} satisfies Prisma.CategoryInclude;

type CategoryRow = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;
export type CategoryTranslationRow = CategoryRow["translations"][number];

export type CategoryNode = CategoryRow & {
  name: string;
  slug: string;
  description: string | null;
  href: string;
  children: CategoryNode[];
};

function translationsForCategory(row: CategoryRow, locale: AppLocale) {
  const translation = pickTranslation(row.translations, locale);
  return {
    name: translation?.name ?? "—",
    slug: translation?.slug ?? slugify(translation?.name ?? "categorie"),
    description: translation?.description ?? null,
    translation,
  };
}

function buildTree(
  rows: CategoryRow[],
  locale: AppLocale,
  parentId: string | null = null,
  depth = 0,
): CategoryNode[] {
  if (depth > 20) return [];
  return rows
    .filter((row) => row.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => {
      const localized = translationsForCategory(row, locale);
      const fullPath = categoryPathFromRows(row.id, rows, locale);
      return {
        ...row,
        ...localized,
        href: fullPath,
        children: buildTree(rows, locale, row.id, depth + 1),
      };
    });
}

export function categoryPathFromRows(
  categoryId: string,
  rows: Pick<CategoryRow, "id" | "parentId" | "service" | "translations">[],
  locale: AppLocale,
): string {
  const chain: typeof rows = [];
  let current = rows.find((row) => row.id === categoryId);
  let guard = 0;
  while (current && guard < 25) {
    chain.unshift(current);
    current = current.parentId ? rows.find((row) => row.id === current?.parentId) : undefined;
    guard += 1;
  }
  const service = chain[0]?.service ?? "PHOTO";
  const segments = chain.map((row) => {
    const translation = pickTranslation(row.translations, locale);
    return translation?.slug ?? slugify(translation?.name ?? "category");
  });
  return `/${locale}/${service.toLowerCase()}${segments.length ? `/${segments.join("/")}` : ""}`;
}

export function categoryAlternatePath(
  categoryId: string,
  rows: Pick<CategoryRow, "id" | "parentId" | "service" | "translations">[],
  locale: AppLocale,
): string | null {
  const chain: typeof rows = [];
  let current = rows.find((row) => row.id === categoryId);
  let guard = 0;
  while (current && guard < 25) {
    chain.unshift(current);
    current = current.parentId ? rows.find((row) => row.id === current?.parentId) : undefined;
    guard += 1;
  }
  const service = chain[0]?.service ?? "PHOTO";
  const segments: string[] = [];
  for (const row of chain) {
    const translation = row.translations.find((item) => item.locale === localeEnum(locale));
    if (!translation) return null;
    segments.push(translation.slug);
  }
  return `/${locale}/${service.toLowerCase()}/${segments.join("/")}`;
}

export const getCategoryRows = cache(async (service?: "PHOTO" | "VIDEO" | "DRONE", includeDrafts = false) => {
  return prisma.category.findMany({
    where: {
      ...(service ? { service } : {}),
      deletedAt: null,
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: categoryInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
});

export async function getCategoryTree(service: "PHOTO" | "VIDEO" | "DRONE", locale: AppLocale, includeDrafts = false) {
  const rows = await getCategoryRows(service, includeDrafts);
  return buildTree(rows, locale);
}

export async function resolveCategoryPath(
  service: "PHOTO" | "VIDEO" | "DRONE",
  locale: AppLocale,
  segments: string[],
  includeDrafts = false,
) {
  if (segments.length === 0) return null;
  const rows = await getCategoryRows(service, includeDrafts);
  const matchSegment = (row: CategoryRow, segment: string) =>
    row.translations.some((translation) => translation.slug === segment && translation.locale === localeEnum(locale)) ||
    row.translations.some((translation) => translation.slug === segment && translation.locale === "FR");

  let parentId: string | null = null;
  let current: CategoryRow | null = null;
  for (const segment of segments) {
    const candidates = rows.filter((row) => row.parentId === parentId && matchSegment(row, segment));
    if (candidates.length !== 1) return null;
    current = candidates[0];
    parentId = current.id;
  }
  if (!current) return null;
  return {
    category: current,
    ...translationsForCategory(current, locale),
    href: categoryPathFromRows(current.id, rows, locale),
    ancestors: categoryAncestors(current.id, rows, locale),
    alternateHref: categoryAlternatePath(current.id, rows, locale === "fr" ? "en" : "fr"),
  };
}

export function categoryAncestors(
  categoryId: string,
  rows: Pick<CategoryRow, "id" | "parentId" | "service" | "translations">[],
  locale: AppLocale,
) {
  const chain: { name: string; href: string }[] = [];
  let current = rows.find((row) => row.id === categoryId);
  let guard = 0;
  const ancestors: typeof rows = [];
  while (current?.parentId && guard < 25) {
    const parent = rows.find((row) => row.id === current?.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
    guard += 1;
  }
  for (const ancestor of ancestors) {
    const translation = pickTranslation(ancestor.translations, locale);
    chain.push({
      name: translation?.name ?? "—",
      href: categoryPathFromRows(ancestor.id, rows, locale),
    });
  }
  return chain;
}

export async function getCategoryById(id: string, locale: AppLocale, includeDrafts = true) {
  const row = await prisma.category.findUnique({ where: { id }, include: categoryInclude });
  if (!row || row.deletedAt) return null;
  if (!includeDrafts && (row.status !== "PUBLISHED" || !row.publishedAt || row.publishedAt > new Date())) {
    return null;
  }
  const rows = await getCategoryRows(row.service, includeDrafts);
  return { ...row, ...translationsForCategory(row, locale), href: categoryPathFromRows(row.id, rows, locale) };
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const projectCardInclude = {
  translations: true,
  coverMedia: true,
  categories: {
    include: { category: { include: { translations: true } } },
  },
} satisfies Prisma.ProjectInclude;

export type ProjectCard = Prisma.ProjectGetPayload<{ include: typeof projectCardInclude }> & {
  title: string;
  summary: string | null;
  slug: string;
  href: string;
  categoryNames: string[];
};

function mapProjectCard(project: Prisma.ProjectGetPayload<{ include: typeof projectCardInclude }>, locale: AppLocale): ProjectCard {
  const translation = pickTranslation(project.translations, locale);
  return {
    ...project,
    title: translation?.title ?? "—",
    summary: translation?.summary ?? null,
    slug: translation?.slug ?? "project",
    href: `/${locale}/project/${translation?.slug ?? ""}`,
    categoryNames: project.categories.map(
      (entry) => pickTranslation(entry.category.translations, locale)?.name ?? "",
    ).filter(Boolean),
  };
}

export async function getProjectsForCategory(categoryId: string, locale: AppLocale, includeDrafts = false) {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      categories: { some: { categoryId } },
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: projectCardInclude,
    orderBy: [{ sortOrder: "asc" }, { projectDate: "desc" }, { createdAt: "desc" }],
  });
  return projects.map((project) => mapProjectCard(project, locale));
}

export async function getProjectsForCategoryBranch(categoryId: string, locale: AppLocale, includeDrafts = false) {
  const root = await prisma.category.findUnique({ where: { id: categoryId }, include: { translations: true } });
  if (!root) return [];
  const rows = await getCategoryRows(root.service, includeDrafts);
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (row.parentId && ids.has(row.parentId) && !ids.has(row.id)) {
        ids.add(row.id);
        changed = true;
      }
    }
  }
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      categories: { some: { categoryId: { in: [...ids] } } },
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: projectCardInclude,
    orderBy: [{ sortOrder: "asc" }, { projectDate: "desc" }, { createdAt: "desc" }],
  });
  return projects.map((project) => mapProjectCard(project, locale));
}

export async function getProjectsForService(
  service: "PHOTO" | "VIDEO" | "DRONE",
  locale: AppLocale,
  limit = 12,
  includeDrafts = false,
) {
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      categories: { some: { category: { service } } },
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: projectCardInclude,
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { projectDate: "desc" }],
    take: limit,
  });
  return projects.map((project) => mapProjectCard(project, locale));
}

export async function getCategoryGallery(categoryId: string, limit = 12) {
  const rows = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { service: true },
  });
  if (!rows) return [];
  const all = await getCategoryRows(rows.service, false);
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of all) {
      if (row.parentId && ids.has(row.parentId) && !ids.has(row.id)) {
        ids.add(row.id);
        changed = true;
      }
    }
  }
  const mediaRows = await prisma.projectMedia.findMany({
    where: {
      media: { kind: "IMAGE", deletedAt: null },
      project: {
        deletedAt: null,
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        categories: { some: { categoryId: { in: [...ids] } } },
      },
    },
    include: { media: true },
    orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
    take: limit * 3,
  });
  const seen = new Set<string>();
  const items: Awaited<ReturnType<typeof getMediaByIds>> = [];
  for (const row of mediaRows) {
    if (seen.has(row.media.id)) continue;
    seen.add(row.media.id);
    items.push({
      id: row.media.id,
      kind: row.media.kind,
      url: row.media.url,
      thumbnailUrl: row.media.thumbnailUrl,
      posterUrl: row.media.posterUrl,
      mimeType: row.media.mimeType,
      width: row.media.width,
      height: row.media.height,
      altFr: row.media.altFr,
      altEn: row.media.altEn,
      captionFr: row.media.captionFr,
      captionEn: row.media.captionEn,
      originalName: row.media.originalName,
    });
    if (items.length >= limit) break;
  }
  return items;
}

export async function getArticleCategories() {
  return prisma.articleCategory.findMany({
    include: { _count: { select: { articles: { where: { deletedAt: null, status: "PUBLISHED" } } } } },
    orderBy: { nameFr: "asc" },
  });
}

export async function getTestimonials(locale: AppLocale, limit = 6) {
  const rows = await prisma.testimonial.findMany({
    where: { active: true },
    include: { photo: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map((row) => ({
    ...row,
    quote: locale === "fr" ? row.quoteFr : row.quoteEn || row.quoteFr,
  }));
}

export async function getFeaturedProjects(locale: AppLocale, limit = 6) {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() }, featured: true },
    include: projectCardInclude,
    orderBy: [{ sortOrder: "asc" }, { projectDate: "desc" }],
    take: limit,
  });
  return projects.map((project) => mapProjectCard(project, locale));
}

export async function getProjectsByIds(ids: string[], locale: AppLocale) {
  if (!ids.length) return [];
  const projects = await prisma.project.findMany({
    where: { id: { in: ids }, deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: projectCardInclude,
  });
  const map = new Map(projects.map((project) => [project.id, mapProjectCard(project, locale)]));
  return ids.map((id) => map.get(id)).filter(Boolean) as ProjectCard[];
}

export async function getLatestProjects(locale: AppLocale, limit = 6) {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: projectCardInclude,
    orderBy: [{ projectDate: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return projects.map((project) => mapProjectCard(project, locale));
}

export async function getProjectBySlug(slug: string, locale: AppLocale, includeDrafts = false) {
  const project = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      translations: { some: { slug, locale: localeEnum(locale) } },
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: {
      translations: true,
      coverMedia: true,
      client: { include: { translations: true } },
      categories: { include: { category: { include: { translations: true } } } },
      media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
      relatedFrom: { include: { relatedProject: { include: projectCardInclude } } },
    },
  });
  if (!project) {
    // Fallback to a French slug in another locale
    const fallback = await prisma.project.findFirst({
      where: {
        deletedAt: null,
        translations: { some: { slug, locale: "FR" } },
        ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
      },
      include: {
        translations: true,
        coverMedia: true,
        client: { include: { translations: true } },
        categories: { include: { category: { include: { translations: true } } } },
        media: { include: { media: true }, orderBy: { sortOrder: "asc" } },
        relatedFrom: { include: { relatedProject: { include: projectCardInclude } } },
      },
    });
    if (!fallback) return null;
    return shapeProjectDetail(fallback, locale);
  }
  return shapeProjectDetail(project, locale);
}

function shapeProjectDetail(
  project: Prisma.ProjectGetPayload<{
    include: {
      translations: true;
      coverMedia: true;
      client: { include: { translations: true } };
      categories: { include: { category: { include: { translations: true } } } };
      media: { include: { media: true } };
      relatedFrom: { include: { relatedProject: { include: typeof projectCardInclude } } };
    };
  }>,
  locale: AppLocale,
) {
  const translation = pickTranslation(project.translations, locale);
  const clientTranslation = project.client ? pickTranslation(project.client.translations, locale) : null;
  return {
    ...project,
    title: translation?.title ?? "—",
    summary: translation?.summary ?? null,
    description: translation?.description ?? "",
    slug: translation?.slug ?? "project",
    seoTitle: translation?.seoTitle ?? null,
    seoDescription: translation?.seoDescription ?? null,
    clientName: clientTranslation?.displayName ?? project.client?.name ?? null,
    categories: project.categories.map((entry) => ({
      id: entry.category.id,
      name: pickTranslation(entry.category.translations, locale)?.name ?? "",
    })),
    related: project.relatedFrom.map((relation) => mapProjectCard(relation.relatedProject, locale)),
    alternateSlug: project.translations.find((item) => item.locale !== localeEnum(locale))?.slug ?? null,
  };
}

export async function getProjectAlternateSlug(projectId: string, targetLocale: AppLocale) {
  const translation = await prisma.projectTranslation.findUnique({
    where: { projectId_locale: { projectId, locale: localeEnum(targetLocale) } },
    select: { slug: true },
  });
  return translation?.slug ?? null;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export type ArticleListItem = Awaited<ReturnType<typeof getArticles>>["items"][number];

export async function getArticles(options: {
  locale: AppLocale;
  page?: number;
  perPage?: number;
  query?: string;
  categorySlug?: string;
  featuredOnly?: boolean;
  includeDrafts?: boolean;
  includeScheduled?: boolean;
}) {
  const {
    locale,
    page = 1,
    perPage = 9,
    query,
    categorySlug,
    featuredOnly,
    includeDrafts = false,
    includeScheduled = false,
  } = options;

  const statusFilter = includeDrafts
    ? {}
    : includeScheduled
      ? { status: { in: ["PUBLISHED", "SCHEDULED"] as ContentStatus[] }, publishedAt: { lte: new Date() } }
      : { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };

  const where: Prisma.ArticleWhereInput = {
    deletedAt: null,
    ...statusFilter,
    ...(featuredOnly ? { featured: true } : {}),
    ...(categorySlug
      ? {
          category: {
            OR: [{ slugFr: categorySlug }, { slugEn: categorySlug }],
          },
        }
      : {}),
    ...(query
      ? {
          translations: {
            some: {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { excerpt: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        }
      : {}),
  };

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      include: {
        translations: true,
        coverMedia: true,
        category: true,
        author: { select: { name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (Math.max(page, 1) - 1) * perPage,
      take: perPage,
    }),
  ]);

  const items = articles.map((article) => {
    const translation = pickTranslation(article.translations, locale);
    return {
      id: article.id,
      title: translation?.title ?? "—",
      slug: translation?.slug ?? "article",
      excerpt: translation?.excerpt ?? plainText(translation?.content, 180),
      href: `/${locale}/blog/${translation?.slug ?? ""}`,
      publishedAt: article.publishedAt,
      coverMedia: article.coverMedia,
      category: article.category,
      featured: article.featured,
      authorName: article.author?.name ?? "TWOK STUDIO",
      readingMinutes: Math.max(2, Math.round((translation?.content?.split(/\s+/).length ?? 200) / 200)),
      hasEnglish: hasTranslation(article.translations, "en"),
      hasFrench: hasTranslation(article.translations, "fr"),
    };
  });

  return {
    items,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getArticleBySlug(slug: string, locale: AppLocale, includeDrafts = false) {
  const article = await prisma.article.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { translations: { some: { slug, locale: localeEnum(locale) } } },
        { translations: { some: { slug, locale: "FR" } } },
      ],
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: {
      translations: true,
      coverMedia: true,
      category: true,
      author: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!article) return null;
  const translation = pickTranslation(article.translations, locale);
  const alternates = {
    fr: article.translations.find((item) => item.locale === "FR")?.slug ?? null,
    en: article.translations.find((item) => item.locale === "EN")?.slug ?? null,
  };
  return {
    ...article,
    title: translation?.title ?? "—",
    slug: translation?.slug ?? "article",
    excerpt: translation?.excerpt ?? "",
    content: translation?.content ?? "",
    seoTitle: translation?.seoTitle ?? null,
    seoDescription: translation?.seoDescription ?? null,
    authorName: article.author?.name ?? "TWOK STUDIO",
    alternates: {
      fr: alternates.fr ? `/fr/blog/${alternates.fr}` : null,
      en: alternates.en ? `/en/blog/${alternates.en}` : null,
    },
    tags: article.tags.map((entry) => entry.tag),
  };
}

export async function getRelatedArticles(articleId: string, categoryId: string | null, locale: AppLocale, limit = 3) {  const articles = await prisma.article.findMany({
    where: {
      id: { not: articleId },
      deletedAt: null,
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      ...(categoryId ? { categoryId } : {}),
    },
    include: { translations: true, coverMedia: true, category: true, author: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
  return articles.map((article) => {
    const translation = pickTranslation(article.translations, locale);
    return {
      id: article.id,
      title: translation?.title ?? "—",
      href: `/${locale}/blog/${translation?.slug ?? ""}`,
      excerpt: translation?.excerpt ?? "",
      coverMedia: article.coverMedia,
      publishedAt: article.publishedAt,
      category: article.category,
    };
  });
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

const pageInclude = { translations: true, coverMedia: true } satisfies Prisma.PageInclude;
type PageRow = Prisma.PageGetPayload<{ include: typeof pageInclude }>;

export function pagePathFromRows(pageId: string, rows: Pick<PageRow, "id" | "parentId" | "translations">[], locale: AppLocale) {
  const chain: typeof rows = [];
  let current = rows.find((row) => row.id === pageId);
  let guard = 0;
  while (current && guard < 25) {
    chain.unshift(current);
    current = current.parentId ? rows.find((row) => row.id === current?.parentId) : undefined;
    guard += 1;
  }
  const segments = chain.map((row) => {
    const translation = pickTranslation(row.translations, locale);
    return translation?.slug ?? "page";
  });
  return `/${locale}/${segments.join("/")}`;
}

export const getPageRows = cache(async (includeDrafts = false) => {
  return prisma.page.findMany({
    where: {
      deletedAt: null,
      ...(includeDrafts ? {} : { status: "PUBLISHED", publishedAt: { lte: new Date() } }),
    },
    include: pageInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
});

export async function resolvePagePath(locale: AppLocale, segments: string[], includeDrafts = false) {
  if (!segments.length) return null;
  const rows = await getPageRows(includeDrafts);
  const matchSegment = (row: PageRow, segment: string) =>
    row.translations.some(
      (translation) =>
        translation.slug === segment &&
        (translation.locale === localeEnum(locale) || translation.locale === "FR"),
    );
  let parentId: string | null = null;
  let current: PageRow | null = null;
  for (const segment of segments) {
    const candidates = rows.filter((row) => row.parentId === parentId && matchSegment(row, segment));
    if (candidates.length !== 1) return null;
    current = candidates[0];
    parentId = current.id;
  }
  if (!current) return null;
  const translation = pickTranslation(current.translations, locale);
  return {
    page: current,
    title: translation?.title ?? "—",
    excerpt: translation?.excerpt ?? null,
    seoTitle: translation?.seoTitle ?? null,
    seoDescription: translation?.seoDescription ?? null,
    href: pagePathFromRows(current.id, rows, locale),
    alternateHref: (() => {
      const target: AppLocale = locale === "fr" ? "en" : "fr";
      let cursor: PageRow | undefined = current ?? undefined;
      let guard = 0;
      const path: string[] = [];
      while (cursor && guard < 25) {
        const item = cursor.translations.find((entry) => entry.locale === localeEnum(target));
        if (!item) return null;
        path.unshift(item.slug);
        cursor = cursor.parentId ? rows.find((row) => row.id === cursor?.parentId) : undefined;
        guard += 1;
      }
      return `/${target}/${path.join("/")}`;
    })(),
  };
}

export async function getPageById(id: string) {
  return prisma.page.findUnique({
    where: { id },
    include: {
      translations: { include: { seoImage: true } },
      blocks: { orderBy: { sortOrder: "asc" } },
      coverMedia: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const getMenu = cache(async (key: string) => {
  return prisma.menu.findUnique({
    where: { key },
    include: {
      items: {
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
});

export function menuHref(
  item: { target: string; url: string | null; pagePath?: string | null },
  locale: AppLocale,
): string {
  switch (item.target) {
    case "HOME":
      return `/${locale}`;
    case "PHOTO":
      return `/${locale}/photo`;
    case "VIDEO":
      return `/${locale}/video`;
    case "DRONE":
      return `/${locale}/drone`;
    case "BLOG":
      return `/${locale}/blog`;
    case "CONTACT":
      return `/${locale}/contact`;
    case "BOOKING":
      return `/${locale}/booking`;
    case "PROJECTS":
      return `/${locale}/photo`;
    case "CLIENTS":
      return `/${locale}/clients`;
    case "CUSTOM":
    default: {
      if (!item.url) return `/${locale}`;
      if (/^https?:\/\//.test(item.url)) return item.url;
      if (/^\/[a-z]{2}(\/|$)/.test(item.url)) return item.url;
      return `/${locale}${item.url.startsWith("/") ? item.url : `/${item.url}`}`;
    }
  }
}

export async function getMenuWithPaths(key: string, locale: AppLocale) {
  const menu = await getMenu(key);
  if (!menu) return null;
  const pages = await prisma.page.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    include: { translations: true },
  });
  return {
    ...menu,
    items: menu.items.map((item) => ({
      ...item,
      href: item.target === "CUSTOM" && item.pageId
        ? pagePathFromRows(item.pageId, pages, locale)
        : menuHref(item, locale),
      label: locale === "fr" ? item.labelFr : item.labelEn,
    })),
  };
}

// ---------------------------------------------------------------------------
// Homepage, clients, services
// ---------------------------------------------------------------------------

export async function getHomepageSections(includeDisabled = false) {
  return prisma.homepageSection.findMany({
    where: includeDisabled ? {} : { enabled: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getClients() {
  return prisma.client.findMany({
    where: { active: true, deletedAt: null },
    include: { logoMedia: true, translations: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getServiceLandingCovers(locale: AppLocale) {
  const rows = await getCategoryRows(undefined, false);
  const result: Record<"photo" | "video" | "drone", { cover: string | null; count: number }> = {
    photo: { cover: null, count: 0 },
    video: { cover: null, count: 0 },
    drone: { cover: null, count: 0 },
  };
  for (const service of ["PHOTO", "VIDEO", "DRONE"] as const) {
    const roots = rows.filter((row) => row.service === service && !row.parentId);
    const key = service.toLowerCase() as "photo" | "video" | "drone";
    result[key] = {
      cover: roots.find((row) => row.coverMedia?.url)?.coverMedia?.url ?? null,
      count: roots.length,
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------------

export async function findRedirect(locale: AppLocale, path: string) {
  const redirect = await prisma.redirect.findUnique({
    where: { locale_fromPath: { locale: localeEnum(locale), fromPath: path } },
  });
  return redirect && redirect.statusCode >= 300 && redirect.statusCode < 400 ? redirect : null;
}

export async function recordRedirect(locale: AppLocale, fromPath: string, toPath: string) {
  if (fromPath === toPath) return;
  // Redirects are managed explicitly in the CMS. Unknown public paths are
  // reported by 404 pages instead of being recorded automatically.
  void locale; void fromPath; void toPath;
}

// ---------------------------------------------------------------------------
// SEO helpers
// ---------------------------------------------------------------------------

export function alternatesFor(paths: { fr: string | null; en: string | null }) {
  const languages: Record<string, string> = {};
  if (paths.fr) languages["fr-MA"] = absoluteUrl(paths.fr);
  if (paths.en) languages["en-MA"] = absoluteUrl(paths.en);
  return languages;
}

export function seoDescription(input: string | null | undefined, fallback = "") {
  return truncate(plainText(input ?? "", 170) || fallback, 170);
}

export async function getSitemapData() {
  const [categories, projects, articles, pages] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: { translations: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: { translations: true },
    }),
    prisma.article.findMany({
      where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: { translations: true },
    }),
    prisma.page.findMany({
      where: { deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
      include: { translations: true },
    }),
  ]);
  return { categories, projects, articles, pages };
}

export { projectCardInclude, categoryInclude, pageInclude };

export async function getMediaByIds(ids: string[]) {
  if (!ids.length) return [];
  const media = await prisma.media.findMany({ where: { id: { in: ids }, deletedAt: null } });
  return media.map((item) => ({
    id: item.id,
    kind: item.kind,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    posterUrl: item.posterUrl,
    mimeType: item.mimeType,
    width: item.width,
    height: item.height,
    altFr: item.altFr,
    altEn: item.altEn,
    captionFr: item.captionFr,
    captionEn: item.captionEn,
    originalName: item.originalName,
  }));
}

export async function getArticlesByIds(ids: string[], locale: AppLocale) {
  if (!ids.length) return [];
  const articles = await prisma.article.findMany({
    where: { id: { in: ids }, deletedAt: null, status: "PUBLISHED", publishedAt: { lte: new Date() } },
    include: { translations: true, coverMedia: true, category: true, author: { select: { name: true } } },
  });
  const map = new Map<string, {
    id: string;
    title: string;
    href: string;
    excerpt: string;
    coverMedia: (typeof articles)[number]["coverMedia"];
    publishedAt: Date | null;
    category: (typeof articles)[number]["category"];
  }>(
    articles.map((article) => {
      const translation = pickTranslation(article.translations, locale);
      return [
        article.id,
        {
          id: article.id,
          title: translation?.title ?? "—",
          href: `/${locale}/blog/${translation?.slug ?? ""}`,
          excerpt: translation?.excerpt ?? plainText(translation?.content, 180),
          coverMedia: article.coverMedia,
          publishedAt: article.publishedAt,
          category: article.category,
        },
      ] as const;
    }),
  );
  return ids.map((id) => map.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function getProjectVideos(projectIds: string[]) {
  if (!projectIds.length) return [];
  const rows = await prisma.projectMedia.findMany({
    where: { projectId: { in: projectIds }, media: { kind: "VIDEO" } },
    include: { media: true, project: { include: { translations: true } } },
    orderBy: [{ projectId: "asc" }, { sortOrder: "asc" }],
  });
  return rows.map((row) => ({ ...row, media: row.media, project: row.project }));
}
