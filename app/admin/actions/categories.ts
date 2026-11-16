"use server";

import { redirect } from "next/navigation";
import type { ContentStatus, GalleryLayout, Locale, ServiceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionDate,
  actionInt,
  actionNullableText,
  actionText,
  actionBool,
  actionGuard,
  adminError,
  databaseErrorMessage,
  slugify,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const SERVICES: ServiceType[] = ["PHOTO", "VIDEO", "DRONE"];
const STATUSES: ContentStatus[] = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"];
const LAYOUTS: GalleryLayout[] = ["GRID", "MASONRY", "SLIDER", "FULLWIDTH", "EDITORIAL"];

function serviceValue(formData: FormData): ServiceType {
  const raw = actionText(formData, "service").toUpperCase() as ServiceType;
  return SERVICES.includes(raw) ? raw : "PHOTO";
}

function statusValue(formData: FormData): ContentStatus {
  const raw = actionText(formData, "status").toUpperCase() as ContentStatus;
  return STATUSES.includes(raw) ? raw : "DRAFT";
}

function layoutValue(formData: FormData): GalleryLayout {
  const raw = actionText(formData, "galleryLayout").toUpperCase() as GalleryLayout;
  return LAYOUTS.includes(raw) ? raw : "GRID";
}

function publishedAtFor(status: ContentStatus, requested: Date | null, current?: Date | null) {
  if (status === "PUBLISHED") return current ?? new Date();
  if (status === "SCHEDULED") return requested ?? current ?? null;
  return current ?? null;
}

function translationsFrom(formData: FormData) {
  const rows: {
    locale: Locale;
    name: string;
    slug: string;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  }[] = [];
  for (const locale of ["FR", "EN"] as Locale[]) {
    const suffix = locale === "FR" ? "Fr" : "En";
    const name = actionText(formData, `name${suffix}`);
    const slug = slugify(actionText(formData, `slug${suffix}`) || name);
    rows.push({
      locale,
      name,
      slug,
      description: actionNullableText(formData, `description${suffix}`),
      seoTitle: actionNullableText(formData, `seoTitle${suffix}`),
      seoDescription: actionNullableText(formData, `seoDescription${suffix}`),
    });
  }
  return rows;
}

function validateTranslations(rows: { locale: Locale; name: string; slug: string }[]) {
  for (const row of rows) {
    if (!row.name) return `Le nom ${row.locale} est obligatoire.`;
    if (!row.slug) return `Le slug ${row.locale} est obligatoire.`;
  }
  return null;
}

export async function createCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.CATEGORIES_MANAGE);
  if (!guard.ok) return guard.state;

  const translations = translationsFrom(formData);
  const invalid = validateTranslations(translations);
  if (invalid) return adminError(invalid);

  const status = statusValue(formData);
  const parentId = actionNullableText(formData, "parentId");
  let id: string;
  try {
    const category = await prisma.category.create({
      data: {
        service: serviceValue(formData),
        parentId,
        status,
        sortOrder: actionInt(formData, "sortOrder", 0),
        featured: actionBool(formData, "featured"),
        coverMediaId: actionNullableText(formData, "coverMediaId"),
        galleryLayout: layoutValue(formData),
        publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt")),
        translations: { create: translations },
      },
    });
    id = category.id;
    await logAudit({
      actorId: guard.session.user.id,
      action: "category.create",
      entityType: "Category",
      entityId: category.id,
      summary: `Catégorie créée : ${translations[0].name}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/categories/${id}?created=1`);
}

export async function updateCategoryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.CATEGORIES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const translations = translationsFrom(formData);
  const invalid = validateTranslations(translations);
  if (invalid) return adminError(invalid);

  const status = statusValue(formData);
  const parentId = actionNullableText(formData, "parentId");
  if (parentId === id) return adminError("Une catégorie ne peut pas être sa propre parente.");

  try {
    const current = await prisma.category.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Catégorie introuvable.");

    if (parentId) {
      const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
      let cursor: string | null = parentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) return adminError("Ce parent créerait une boucle dans la hiérarchie.");
        if (seen.has(cursor)) break;
        seen.add(cursor);
        cursor = all.find((row) => row.id === cursor)?.parentId ?? null;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.category.update({
        where: { id },
        data: {
          service: serviceValue(formData),
          parentId,
          status,
          sortOrder: actionInt(formData, "sortOrder", 0),
          featured: actionBool(formData, "featured"),
          coverMediaId: actionNullableText(formData, "coverMediaId"),
          galleryLayout: layoutValue(formData),
          publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt"), current.publishedAt),
          deletedAt: null,
        },
      });
      for (const row of translations) {
        await tx.categoryTranslation.upsert({
          where: { categoryId_locale: { categoryId: id, locale: row.locale } },
          update: {
            name: row.name,
            slug: row.slug,
            description: row.description,
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
          },
          create: { categoryId: id, ...row },
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "category.update",
      entityType: "Category",
      entityId: id,
      summary: `Catégorie mise à jour : ${translations[0].name}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/categories/${id}?saved=1`);
}

export async function deleteCategoryAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.CATEGORIES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");

  const [category, children, projects] = await Promise.all([
    prisma.category.findUnique({ where: { id }, include: { translations: { where: { locale: "FR" } } } }),
    prisma.category.count({ where: { parentId: id, deletedAt: null } }),
    prisma.projectCategory.count({ where: { categoryId: id } }),
  ]);
  if (!category || category.deletedAt) redirect("/admin/categories?error=introuvable");
  if (children > 0) {
    redirect(`/admin/categories/${id}?error=${encodeURIComponent("Déplacez ou supprimez d'abord les sous-catégories.")}`);
  }
  if (projects > 0) {
    redirect(`/admin/categories/${id}?error=${encodeURIComponent("Des projets utilisent cette catégorie. Retirez-la de ces projets avant suppression.")}`);
  }

  await prisma.category.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "category.delete",
    entityType: "Category",
    entityId: id,
    summary: `Catégorie archivée : ${category.translations[0]?.name ?? id}`,
  });
  redirect("/admin/categories?deleted=1");
}
