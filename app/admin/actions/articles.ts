"use server";

import { redirect } from "next/navigation";
import type { ContentStatus, Locale } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
  actionDate,
  actionGuard,
  actionIds,
  actionNullableText,
  actionText,
  adminError,
  databaseErrorMessage,
  slugify,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const STATUSES: ContentStatus[] = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"];

function statusValue(formData: FormData): ContentStatus {
  const raw = actionText(formData, "status").toUpperCase() as ContentStatus;
  return STATUSES.includes(raw) ? raw : "DRAFT";
}

function publishedAtFor(status: ContentStatus, requested: Date | null, current?: Date | null) {
  if (status === "PUBLISHED") return current ?? new Date();
  if (status === "SCHEDULED") return requested ?? current ?? null;
  return current ?? null;
}

function articleTranslations(formData: FormData) {
  const rows: {
    locale: Locale;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImageId: string | null;
  }[] = [];
  for (const locale of ["FR", "EN"] as Locale[]) {
    const suffix = locale === "FR" ? "Fr" : "En";
    const title = actionText(formData, `title${suffix}`);
    rows.push({
      locale,
      title,
      slug: slugify(actionText(formData, `slug${suffix}`) || title),
      excerpt: actionNullableText(formData, `excerpt${suffix}`),
      content: actionText(formData, `content${suffix}`),
      seoTitle: actionNullableText(formData, `seoTitle${suffix}`),
      seoDescription: actionNullableText(formData, `seoDescription${suffix}`),
      seoImageId: actionNullableText(formData, `seoImage${suffix}Id`),
    });
  }
  return rows;
}

function articleBase(formData: FormData) {
  const status = statusValue(formData);
  return {
    status,
    featured: actionBool(formData, "featured"),
    coverMediaId: actionNullableText(formData, "coverMediaId"),
    categoryId: actionNullableText(formData, "categoryId"),
    authorId: actionNullableText(formData, "authorId"),
    publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt")),
  };
}

export async function createArticleAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) return guard.state;

  const translations = articleTranslations(formData);
  for (const row of translations) {
    if (!row.title) return adminError(`Le titre ${row.locale} est obligatoire.`);
    if (!row.slug) return adminError(`Le slug ${row.locale} est obligatoire.`);
  }

  const base = articleBase(formData);
  const tagIds = actionIds(formData, "tagIds");
  let id: string;
  try {
    const article = await prisma.article.create({
      data: {
        ...base,
        authorId: base.authorId ?? guard.session.user.id,
        translations: { create: translations },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    });
    id = article.id;
    await logAudit({
      actorId: guard.session.user.id,
      action: "article.create",
      entityType: "Article",
      entityId: article.id,
      summary: `Article créé : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/articles/${id}?created=1`);
}

export async function updateArticleAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const translations = articleTranslations(formData);
  for (const row of translations) {
    if (!row.title) return adminError(`Le titre ${row.locale} est obligatoire.`);
    if (!row.slug) return adminError(`Le slug ${row.locale} est obligatoire.`);
  }

  const base = articleBase(formData);
  const status = base.status;
  const tagIds = actionIds(formData, "tagIds");

  try {
    const current = await prisma.article.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Article introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: {
          ...base,
          authorId: base.authorId ?? current.authorId,
          publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt"), current.publishedAt),
          deletedAt: null,
        },
      });
      for (const row of translations) {
        await tx.articleTranslation.upsert({
          where: { articleId_locale: { articleId: id, locale: row.locale } },
          update: {
            title: row.title,
            slug: row.slug,
            excerpt: row.excerpt,
            content: row.content,
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            seoImageId: row.seoImageId,
          },
          create: { articleId: id, ...row },
        });
      }
      await tx.articleTagRelation.deleteMany({ where: { articleId: id } });
      if (tagIds.length) {
        await tx.articleTagRelation.createMany({
          data: tagIds.map((tagId) => ({ articleId: id, tagId })),
          skipDuplicates: true,
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "article.update",
      entityType: "Article",
      entityId: id,
      summary: `Article mis à jour : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/articles/${id}?saved=1`);
}

export async function deleteArticleAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const article = await prisma.article.findUnique({
    where: { id },
    include: { translations: { where: { locale: "FR" } } },
  });
  if (!article || article.deletedAt) redirect("/admin/articles?error=introuvable");
  await prisma.article.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED", featured: false },
  });
  await logAudit({
    actorId: guard.session.user.id,
    action: "article.delete",
    entityType: "Article",
    entityId: id,
    summary: `Article archivé : ${article.translations[0]?.title ?? id}`,
  });
  redirect("/admin/articles?deleted=1");
}

export async function saveArticleCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionNullableText(formData, "id");
  const nameFr = actionText(formData, "nameFr");
  const nameEn = actionText(formData, "nameEn");
  if (!nameFr || !nameEn) return adminError("Les noms FR et EN sont obligatoires.");
  const slugFr = slugify(actionText(formData, "slugFr") || nameFr);
  const slugEn = slugify(actionText(formData, "slugEn") || nameEn);
  if (!slugFr || !slugEn) return adminError("Les slugs FR et EN sont obligatoires.");

  try {
    if (id) {
      await prisma.articleCategory.update({
        where: { id },
        data: { nameFr, nameEn, slugFr, slugEn },
      });
      await logAudit({
        actorId: guard.session.user.id,
        action: "article_category.update",
        entityType: "ArticleCategory",
        entityId: id,
        summary: `Catégorie d'articles mise à jour : ${nameFr}`,
      });
    } else {
      const created = await prisma.articleCategory.create({
        data: { nameFr, nameEn, slugFr, slugEn },
      });
      await logAudit({
        actorId: guard.session.user.id,
        action: "article_category.create",
        entityType: "ArticleCategory",
        entityId: created.id,
        summary: `Catégorie d'articles créée : ${nameFr}`,
      });
    }
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/articles/taxonomy?saved=1");
}

export async function deleteArticleCategoryAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const count = await prisma.article.count({ where: { categoryId: id, deletedAt: null } });
  if (count > 0) {
    redirect(`/admin/articles/taxonomy?error=${encodeURIComponent("Déplacez les articles de cette catégorie avant de la supprimer.")}`);
  }
  const category = await prisma.articleCategory.findUnique({ where: { id } });
  if (!category) redirect("/admin/articles/taxonomy?error=introuvable");
  await prisma.articleCategory.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "article_category.delete",
    entityType: "ArticleCategory",
    entityId: id,
    summary: `Catégorie d'articles supprimée : ${category.nameFr}`,
  });
  redirect("/admin/articles/taxonomy?deleted=1");
}

export async function createArticleTagAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) return guard.state;

  const nameFr = actionText(formData, "nameFr");
  const nameEn = actionText(formData, "nameEn") || nameFr;
  if (!nameFr) return adminError("Le nom FR est obligatoire.");
  const slug = slugify(actionText(formData, "slug") || nameFr);
  if (!slug) return adminError("Le slug est obligatoire.");

  try {
    const tag = await prisma.articleTag.create({ data: { nameFr, nameEn, slug } });
    await logAudit({
      actorId: guard.session.user.id,
      action: "article_tag.create",
      entityType: "ArticleTag",
      entityId: tag.id,
      summary: `Étiquette créée : ${nameFr}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/articles/taxonomy?saved=1");
}

export async function deleteArticleTagAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.ARTICLES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const tag = await prisma.articleTag.findUnique({ where: { id } });
  if (!tag) redirect("/admin/articles/taxonomy?error=introuvable");
  await prisma.articleTag.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "article_tag.delete",
    entityType: "ArticleTag",
    entityId: id,
    summary: `Étiquette supprimée : ${tag.nameFr}`,
  });
  redirect("/admin/articles/taxonomy?deleted=1");
}
