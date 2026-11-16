"use server";

import { redirect } from "next/navigation";
import type { Locale } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionGuard,
  actionInt,
  actionNullableText,
  actionText,
  adminError,
  databaseErrorMessage,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function updateSeoSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SEO_MANAGE);
  if (!guard.ok) return guard.state;

  try {
    await prisma.seoSetting.upsert({
      where: { id: 1 },
      update: {
        siteTitleFr: actionNullableText(formData, "siteTitleFr"),
        siteTitleEn: actionNullableText(formData, "siteTitleEn"),
        titleTemplate: actionNullableText(formData, "titleTemplate"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        keywordsFr: actionNullableText(formData, "keywordsFr"),
        keywordsEn: actionNullableText(formData, "keywordsEn"),
        defaultOgMediaId: actionNullableText(formData, "defaultOgMediaId"),
        twitterHandle: actionNullableText(formData, "twitterHandle"),
        googleAnalyticsId: actionNullableText(formData, "googleAnalyticsId"),
        searchConsoleCode: actionNullableText(formData, "searchConsoleCode"),
        robotsExtra: actionNullableText(formData, "robotsExtra"),
      },
      create: {
        id: 1,
        siteTitleFr: actionNullableText(formData, "siteTitleFr"),
        siteTitleEn: actionNullableText(formData, "siteTitleEn"),
        titleTemplate: actionNullableText(formData, "titleTemplate"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        keywordsFr: actionNullableText(formData, "keywordsFr"),
        keywordsEn: actionNullableText(formData, "keywordsEn"),
        defaultOgMediaId: actionNullableText(formData, "defaultOgMediaId"),
        twitterHandle: actionNullableText(formData, "twitterHandle"),
        googleAnalyticsId: actionNullableText(formData, "googleAnalyticsId"),
        searchConsoleCode: actionNullableText(formData, "searchConsoleCode"),
        robotsExtra: actionNullableText(formData, "robotsExtra"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "seo.settings.update",
      entityType: "SeoSetting",
      entityId: "1",
      summary: "Réglages SEO mis à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/seo?saved=1");
}

export async function createRedirectAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SEO_MANAGE);
  if (!guard.ok) return guard.state;

  const localeRaw = actionText(formData, "locale").toUpperCase();
  const locale: Locale = localeRaw === "EN" ? "EN" : "FR";
  const fromPath = actionText(formData, "fromPath");
  const toPath = actionText(formData, "toPath");
  const statusCode = actionInt(formData, "statusCode", 301);
  if (!fromPath || !toPath) return adminError("Chemin source et destination obligatoires.");

  try {
    const redirectRow = await prisma.redirect.create({
      data: { locale, fromPath, toPath, statusCode },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "redirect.create",
      entityType: "Redirect",
      entityId: redirectRow.id,
      summary: `Redirection créée : ${fromPath} → ${toPath}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/seo?redirectCreated=1");
}

export async function deleteRedirectAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.SEO_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const redirectRow = await prisma.redirect.findUnique({ where: { id } });
  if (!redirectRow) redirect("/admin/seo?error=introuvable");
  await prisma.redirect.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "redirect.delete",
    entityType: "Redirect",
    entityId: id,
    summary: `Redirection supprimée : ${redirectRow.fromPath}`,
  });
  redirect("/admin/seo?redirectDeleted=1");
}
