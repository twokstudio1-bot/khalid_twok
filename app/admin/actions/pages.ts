"use server";

import { redirect } from "next/navigation";
import type { ContentStatus, PageTemplate } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
  actionDate,
  actionGuard,
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
const TEMPLATES: PageTemplate[] = ["DEFAULT", "FULL_WIDTH", "LANDING", "SIDEBAR"];

function statusValue(formData: FormData): ContentStatus {
  const raw = actionText(formData, "status").toUpperCase() as ContentStatus;
  return STATUSES.includes(raw) ? raw : "DRAFT";
}

function templateValue(formData: FormData): PageTemplate {
  const raw = actionText(formData, "template").toUpperCase() as PageTemplate;
  return TEMPLATES.includes(raw) ? raw : "DEFAULT";
}

function publishedAtFor(status: ContentStatus, requested: Date | null, current?: Date | null) {
  if (status === "PUBLISHED") return current ?? new Date();
  if (status === "SCHEDULED") return requested ?? current ?? null;
  return current ?? null;
}

function pageTranslations(formData: FormData) {
  const rows: {
    locale: "FR" | "EN";
    title: string;
    slug: string;
    excerpt: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImageId: string | null;
  }[] = [];
  for (const locale of ["FR", "EN"] as const) {
    const suffix = locale === "FR" ? "Fr" : "En";
    const title = actionText(formData, `title${suffix}`);
    rows.push({
      locale,
      title,
      slug: slugify(actionText(formData, `slug${suffix}`) || title),
      excerpt: actionNullableText(formData, `excerpt${suffix}`),
      seoTitle: actionNullableText(formData, `seoTitle${suffix}`),
      seoDescription: actionNullableText(formData, `seoDescription${suffix}`),
      seoImageId: actionNullableText(formData, `seoImage${suffix}Id`),
    });
  }
  return rows;
}

function parseSettings(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const value = JSON.parse(trimmed);
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  throw new Error("invalid");
}

export async function createPageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) return guard.state;

  const translations = pageTranslations(formData);
  for (const row of translations) {
    if (!row.title) return adminError(`Le titre ${row.locale} est obligatoire.`);
    if (!row.slug) return adminError(`Le slug ${row.locale} est obligatoire.`);
  }

  const status = statusValue(formData);
  const parentId = actionNullableText(formData, "parentId");
  let id: string;
  try {
    const page = await prisma.page.create({
      data: {
        parentId,
        status,
        template: templateValue(formData),
        sortOrder: actionInt(formData, "sortOrder", 0),
        showInNav: actionBool(formData, "showInNav"),
        coverMediaId: actionNullableText(formData, "coverMediaId"),
        publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt")),
        translations: { create: translations },
      },
    });
    id = page.id;
    await logAudit({
      actorId: guard.session.user.id,
      action: "page.create",
      entityType: "Page",
      entityId: page.id,
      summary: `Page créée : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/pages/${id}?created=1`);
}

export async function updatePageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const translations = pageTranslations(formData);
  for (const row of translations) {
    if (!row.title) return adminError(`Le titre ${row.locale} est obligatoire.`);
    if (!row.slug) return adminError(`Le slug ${row.locale} est obligatoire.`);
  }

  const status = statusValue(formData);
  const parentId = actionNullableText(formData, "parentId");
  if (parentId === id) return adminError("Une page ne peut pas être sa propre parente.");

  try {
    const current = await prisma.page.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Page introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.page.update({
        where: { id },
        data: {
          parentId,
          status,
          template: templateValue(formData),
          sortOrder: actionInt(formData, "sortOrder", 0),
          showInNav: actionBool(formData, "showInNav"),
          coverMediaId: actionNullableText(formData, "coverMediaId"),
          publishedAt: publishedAtFor(status, actionDate(formData, "publishedAt"), current.publishedAt),
          deletedAt: null,
        },
      });
      for (const row of translations) {
        await tx.pageTranslation.upsert({
          where: { pageId_locale: { pageId: id, locale: row.locale } },
          update: {
            title: row.title,
            slug: row.slug,
            excerpt: row.excerpt,
            seoTitle: row.seoTitle,
            seoDescription: row.seoDescription,
            seoImageId: row.seoImageId,
          },
          create: { pageId: id, ...row },
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "page.update",
      entityType: "Page",
      entityId: id,
      summary: `Page mise à jour : ${translations[0].title}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/pages/${id}?saved=1`);
}

export async function deletePageAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const page = await prisma.page.findUnique({ where: { id }, include: { translations: { where: { locale: "FR" } } } });
  if (!page || page.deletedAt) redirect("/admin/pages?error=introuvable");
  const children = await prisma.page.count({ where: { parentId: id, deletedAt: null } });
  if (children > 0) {
    redirect(`/admin/pages/${id}?error=${encodeURIComponent("Déplacez ou supprimez d'abord les sous-pages.")}`);
  }
  await prisma.page.update({ where: { id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "page.delete",
    entityType: "Page",
    entityId: id,
    summary: `Page archivée : ${page.translations[0]?.title ?? id}`,
  });
  redirect("/admin/pages?deleted=1");
}

export async function createPageBlockAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) return guard.state;

  const pageId = actionText(formData, "pageId");
  const type = actionText(formData, "type") as never;
  let settings: Record<string, unknown>;
  try {
    settings = parseSettings(actionText(formData, "settings"));
  } catch {
    return adminError("Les réglages JSON sont invalides.");
  }

  try {
    const block = await prisma.pageBlock.create({
      data: {
        pageId,
        type,
        enabled: actionBool(formData, "enabled"),
        sortOrder: actionInt(formData, "sortOrder", 1),
        settings: settings as never,
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "page_block.create",
      entityType: "PageBlock",
      entityId: block.id,
      summary: `Bloc ${type} ajouté à la page.`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/pages/${pageId}?blockCreated=1`);
}

export async function updatePageBlockAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const pageId = actionText(formData, "pageId");
  const type = actionText(formData, "type") as never;
  let settings: Record<string, unknown>;
  try {
    settings = parseSettings(actionText(formData, "settings"));
  } catch {
    return adminError("Les réglages JSON sont invalides.");
  }

  try {
    const current = await prisma.pageBlock.findUnique({ where: { id } });
    if (!current) return adminError("Bloc introuvable.");
    await prisma.pageBlock.update({
      where: { id },
      data: {
        type,
        enabled: actionBool(formData, "enabled"),
        sortOrder: actionInt(formData, "sortOrder", current.sortOrder),
        settings: settings as never,
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "page_block.update",
      entityType: "PageBlock",
      entityId: id,
      summary: "Bloc de page mis à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/pages/${pageId}?blockSaved=1`);
}

export async function deletePageBlockAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.PAGES_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const pageId = actionText(formData, "pageId");
  const block = await prisma.pageBlock.findUnique({ where: { id } });
  if (!block) redirect(`/admin/pages/${pageId}?error=introuvable`);
  await prisma.pageBlock.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "page_block.delete",
    entityType: "PageBlock",
    entityId: id,
    summary: `Bloc de page supprimé : ${block.type}`,
  });
  redirect(`/admin/pages/${pageId}?blockDeleted=1`);
}
