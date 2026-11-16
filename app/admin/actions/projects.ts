"use server";

import { redirect } from "next/navigation";
import type { ContentStatus, GalleryLayout, Locale } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
  actionDate,
  actionGuard,
  actionIds,
  actionInt,
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
const LAYOUTS: GalleryLayout[] = ["GRID", "MASONRY", "SLIDER", "FULLWIDTH", "EDITORIAL"];

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

function projectTranslations(formData: FormData) {
  const rows: {
    locale: Locale;
    title: string;
    slug: string;
    summary: string | null;
    description: string | null;
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
      summary: actionNullableText(formData, `summary${suffix}`),
      description: actionNullableText(formData, `description${suffix}`),
      seoTitle: actionNullableText(formData, `seoTitle${suffix}`),
      seoDescription: actionNullableText(formData, `seoDescription${suffix}`),
      seoImageId: actionNullableText(formData, `seoImage${suffix}Id`),
    });
  }
  return rows;
}

function validateProject(formData: FormData, translations: { locale: Locale; title: string; slug: string }[]) {
  for (const row of translations) {
    if (!row.title) return `Le titre ${row.locale} est obligatoire.`;
    if (!row.slug) return `Le slug ${row.locale} est obligatoire.`;
  }
  if (!actionText(formData, "projectDate")) return null;
  if (!actionDate(formData, "projectDate")) return "La date du projet est invalide.";
  return null;
}

function projectData(formData: FormData) {
  const status = statusValue(formData);
  const clientId = actionNullableText(formData, "clientId");
  return {
    status,
    featured: actionBool(formData, "featured"),
    coverMediaId: actionNullableText(formData, "coverMediaId"),
    galleryLayout: layoutValue(formData),
    clientId,
    projectType: actionNullableText(formData, "projectType"),
    location: actionNullableText(formData, "location"),
    projectDate: actionDate(formData, "projectDate"),
    sortOrder: actionInt(formData, "sortOrder", 0),
  };
}

export async function createProjectAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PROJECTS_MANAGE);
  if (!guard.ok) return guard.state;

  const translations = projectTranslations(formData);
  const invalid = validateProject(formData, translations);
  if (invalid) return adminError(invalid);

  const base = projectData(formData);
  const categoryIds = actionIds(formData, "categoryIds").filter(Boolean);
  const mediaIds = actionIds(formData, "mediaIds");
  const relatedIds = actionIds(formData, "relatedIds");
  const status = base.status;

  let id: string;
  try {
    const project = await prisma.project.create({
      data: {
        ...base,
        publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt")),
        translations: { create: translations },
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
        media: { create: mediaIds.map((mediaId, index) => ({ mediaId, sortOrder: index })) },
        relatedFrom: { create: relatedIds.map((relatedProjectId) => ({ relatedProjectId })) },
      },
    });
    id = project.id;
    if (base.clientId) {
      await prisma.clientProject.upsert({
        where: { clientId_projectId: { clientId: base.clientId, projectId: project.id } },
        create: { clientId: base.clientId, projectId: project.id },
        update: {},
      });
    }
    await logAudit({
      actorId: guard.session.user.id,
      action: "project.create",
      entityType: "Project",
      entityId: project.id,
      summary: `Projet créé : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/projects/${id}?created=1`);
}

export async function updateProjectAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PROJECTS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const translations = projectTranslations(formData);
  const invalid = validateProject(formData, translations);
  if (invalid) return adminError(invalid);

  const base = projectData(formData);
  const categoryIds = actionIds(formData, "categoryIds");
  const mediaIds = actionIds(formData, "mediaIds");
  const relatedIds = actionIds(formData, "relatedIds").filter((relatedId) => relatedId !== id);

  try {
    const current = await prisma.project.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Projet introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: {
          ...base,
          publishedAt: publishedAtFor(base.status, actionDate(formData, "publishedAt"), current.publishedAt),
          deletedAt: null,
        },
      });
      for (const row of translations) {
        await tx.projectTranslation.upsert({
          where: { projectId_locale: { projectId: id, locale: row.locale } },
          update: {
            title: row.title,
            slug: row.slug,
            summary: row.summary,
            description: row.description,
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            seoImageId: row.seoImageId,
          },
          create: { projectId: id, ...row },
        });
      }
      await tx.projectCategory.deleteMany({ where: { projectId: id } });
      if (categoryIds.length) {
        await tx.projectCategory.createMany({
          data: categoryIds.map((categoryId) => ({ projectId: id, categoryId })),
          skipDuplicates: true,
        });
      }
      await tx.projectMedia.deleteMany({ where: { projectId: id } });
      if (mediaIds.length) {
        await tx.projectMedia.createMany({
          data: mediaIds.map((mediaId, index) => ({ projectId: id, mediaId, sortOrder: index })),
          skipDuplicates: true,
        });
      }
      await tx.projectRelation.deleteMany({ where: { projectId: id } });
      if (relatedIds.length) {
        await tx.projectRelation.createMany({
          data: relatedIds.map((relatedProjectId) => ({ projectId: id, relatedProjectId })),
          skipDuplicates: true,
        });
      }
      await tx.clientProject.deleteMany({ where: { projectId: id } });
      if (base.clientId) {
        await tx.clientProject.create({ data: { clientId: base.clientId, projectId: id } });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "project.update",
      entityType: "Project",
      entityId: id,
      summary: `Projet mis à jour : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/projects/${id}?saved=1`);
}

export async function deleteProjectAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.PROJECTS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const project = await prisma.project.findUnique({
    where: { id },
    include: { translations: { where: { locale: "FR" } } },
  });
  if (!project || project.deletedAt) redirect("/admin/projects?error=introuvable");
  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED", featured: false },
  });
  await logAudit({
    actorId: guard.session.user.id,
    action: "project.delete",
    entityType: "Project",
    entityId: id,
    summary: `Projet archivé : ${project.translations[0]?.title ?? id}`,
  });
  redirect("/admin/projects?deleted=1");
}
