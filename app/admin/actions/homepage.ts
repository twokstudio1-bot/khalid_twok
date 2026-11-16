"use server";

import { redirect } from "next/navigation";
import type { HomepageSectionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
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

const SECTION_TYPES: HomepageSectionType[] = [
  "HERO", "INTRO", "FEATURED_PHOTOS", "FEATURED_VIDEO", "SERVICES", "FEATURED_PROJECTS",
  "BEHIND_THE_SCENES", "CLIENTS", "BLOG_HIGHLIGHTS", "CTA",
];

function parseSettings(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const value = JSON.parse(trimmed);
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
    throw new Error("invalid");
  } catch {
    throw new Error("invalid");
  }
}

export async function updateHomepageSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.HOMEPAGE_MANAGE);
  if (!guard.ok) return guard.state;

  try {
    await prisma.homepageSetting.upsert({
      where: { id: 1 },
      update: {
        titleFr: actionNullableText(formData, "titleFr"),
        titleEn: actionNullableText(formData, "titleEn"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        ogImageId: actionNullableText(formData, "ogImageId"),
      },
      create: {
        id: 1,
        titleFr: actionNullableText(formData, "titleFr"),
        titleEn: actionNullableText(formData, "titleEn"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        ogImageId: actionNullableText(formData, "ogImageId"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "homepage.settings.update",
      entityType: "HomepageSetting",
      entityId: "1",
      summary: "Réglages de la page d'accueil mis à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/homepage?saved=1");
}

export async function createHomepageSectionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.HOMEPAGE_MANAGE);
  if (!guard.ok) return guard.state;

  const typeRaw = actionText(formData, "type").toUpperCase() as HomepageSectionType;
  const type = SECTION_TYPES.includes(typeRaw) ? typeRaw : "HERO";
  let settings: Record<string, unknown>;
  try {
    settings = parseSettings(actionText(formData, "settings"));
  } catch {
    return adminError("Les réglages JSON sont invalides.");
  }

  try {
    const section = await prisma.homepageSection.create({
      data: {
        type,
        enabled: actionBool(formData, "enabled"),
        sortOrder: actionInt(formData, "sortOrder", 1),
        settings: settings as never,
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "homepage.section.create",
      entityType: "HomepageSection",
      entityId: section.id,
      summary: `Section d'accueil créée : ${type}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/homepage?created=1");
}

export async function updateHomepageSectionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.HOMEPAGE_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const typeRaw = actionText(formData, "type").toUpperCase() as HomepageSectionType;
  const type = SECTION_TYPES.includes(typeRaw) ? typeRaw : undefined;
  let settings: Record<string, unknown>;
  try {
    settings = parseSettings(actionText(formData, "settings"));
  } catch {
    return adminError("Les réglages JSON sont invalides.");
  }

  try {
    const current = await prisma.homepageSection.findUnique({ where: { id } });
    if (!current) return adminError("Section introuvable.");
    await prisma.homepageSection.update({
      where: { id },
      data: {
        ...(type ? { type } : {}),
        enabled: actionBool(formData, "enabled"),
        sortOrder: actionInt(formData, "sortOrder", current.sortOrder),
        settings: settings as never,
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "homepage.section.update",
      entityType: "HomepageSection",
      entityId: id,
      summary: "Section d'accueil mise à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/homepage?saved=1");
}

export async function deleteHomepageSectionAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.HOMEPAGE_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (!section) redirect("/admin/homepage?error=introuvable");
  await prisma.homepageSection.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "homepage.section.delete",
    entityType: "HomepageSection",
    entityId: id,
    summary: `Section d'accueil supprimée : ${section.type}`,
  });
  redirect("/admin/homepage?deleted=1");
}
