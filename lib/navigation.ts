import "server-only";
import type { MenuItem } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AppLocale } from "@/lib/i18n";
import {
  categoryPathFromRows,
  getCategoryRows,
  getPageRows,
  menuHref,
  pagePathFromRows,
  type CategoryNode,
} from "@/lib/content";
import type { CategoryNavItem, NavItemView } from "@/lib/view";

function categoryNodeToNav(node: CategoryNode): CategoryNavItem {
  return {
    id: node.id,
    name: node.name,
    href: node.href,
    children: node.children.map(categoryNodeToNav),
  };
}

function buildCategoryTree(
  rows: Awaited<ReturnType<typeof getCategoryRows>>,
  locale: AppLocale,
  service?: "PHOTO" | "VIDEO" | "DRONE",
  parentId: string | null = null,
  depth = 0,
): CategoryNavItem[] {
  if (depth > 18) return [];
  return rows
    .filter((row) => row.parentId === parentId && (!service || row.service === service))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => {
      const translation =
        row.translations.find((item) => item.locale === (locale === "fr" ? "FR" : "EN")) ??
        row.translations.find((item) => item.locale === "FR");
      return {
        id: row.id,
        name: translation?.name ?? "—",
        href: categoryPathFromRows(row.id, rows, locale),
        children: buildCategoryTree(rows, locale, service, row.id, depth + 1),
      };
    });
}

export async function getNavigationItems(locale: AppLocale, menuKey: string): Promise<NavItemView[]> {
  const [menu, pageRows, categoryRows] = await Promise.all([
    prisma.menu.findUnique({
      where: { key: menuKey },
      include: {
        items: { where: { enabled: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    }),
    getPageRows(false),
    getCategoryRows(undefined, false),
  ]);
  if (!menu) return [];

  const rowMap = new Map(pageRows.map((row) => [row.id, row]));
  const categoryMap = new Map(categoryRows.map((row) => [row.id, row]));

  function buildMenuItems(parentId: string | null, depth = 0): NavItemView[] {
    if (depth > 10) return [];
    return menu!.items
      .filter((item) => item.parentId === parentId)
      .map((item) => {
        const pagePath = item.pageId && rowMap.has(item.pageId)
          ? pagePathFromRows(item.pageId, pageRows, locale)
          : null;
        const href = pagePath ?? menuHref({ ...item, pagePath }, locale);
        let children: CategoryNavItem[] = buildMenuItems(item.id, depth + 1).map((child) => ({
          id: child.id,
          name: child.label,
          href: child.href,
          children: child.children,
        }));

        if (children.length === 0 && ["PHOTO", "VIDEO", "DRONE"].includes(item.target)) {
          children = buildCategoryTree(categoryRows, locale, item.target as "PHOTO" | "VIDEO" | "DRONE");
        }
        if (children.length === 0 && item.categoryId && categoryMap.has(item.categoryId)) {
          const category = categoryMap.get(item.categoryId)!;
          const parent = category.parentId ? categoryMap.get(category.parentId) : null;
          if (!parent) {
            children = buildCategoryTree(categoryRows, locale, category.service, null).filter(
              (entry) => entry.id === category.id,
            );
          }
        }

        return {
          id: item.id,
          label: locale === "fr" ? item.labelFr : item.labelEn || item.labelFr,
          href,
          target: item.target,
          openInNewTab: item.openInNewTab,
          children,
        };
      });
  }

  return buildMenuItems(null);
}

export async function getPrivacyPath(locale: AppLocale) {
  const page = await prisma.pageTranslation.findFirst({
    where: {
      locale: locale === "fr" ? "FR" : "EN",
      slug: { in: ["confidentialite", "privacy"] },
      page: { deletedAt: null, status: "PUBLISHED" },
    },
    select: { slug: true },
  });
  return page ? `/${locale}/${page.slug}` : null;
}

