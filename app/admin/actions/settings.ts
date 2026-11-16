"use server";

import { redirect } from "next/navigation";
import type { WhatsAppPosition } from "@prisma/client";
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

const POSITIONS: WhatsAppPosition[] = ["LEFT", "RIGHT"];

function positionValue(formData: FormData): WhatsAppPosition {
  const raw = actionText(formData, "whatsappPosition").toUpperCase() as WhatsAppPosition;
  return POSITIONS.includes(raw) ? raw : "RIGHT";
}

function parseJsonArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const value = JSON.parse(trimmed);
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

export async function updateSiteSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const companyName = actionText(formData, "companyName");
  if (!companyName) return adminError("Le nom de l'entreprise est obligatoire.");
  const legalName = actionText(formData, "legalName");

  try {
    await prisma.siteSetting.upsert({
      where: { id: 1 },
      update: {
        companyName,
        legalName,
        taglineFr: actionNullableText(formData, "taglineFr"),
        taglineEn: actionNullableText(formData, "taglineEn"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        logoMediaId: actionNullableText(formData, "logoMediaId"),
        logoLightMediaId: actionNullableText(formData, "logoLightMediaId"),
        faviconMediaId: actionNullableText(formData, "faviconMediaId"),
        timezone: actionText(formData, "timezone") || "Africa/Casablanca",
        currency: actionText(formData, "currency") || "MAD",
        bookingAutoConfirm: actionBool(formData, "bookingAutoConfirm"),
        customerRetentionDays: actionInt(formData, "customerRetentionDays", 730),
        whatsappEnabled: actionBool(formData, "whatsappEnabled"),
        whatsappNumber: actionNullableText(formData, "whatsappNumber"),
        whatsappMessageFr: actionNullableText(formData, "whatsappMessageFr"),
        whatsappMessageEn: actionNullableText(formData, "whatsappMessageEn"),
        whatsappPhotoFr: actionNullableText(formData, "whatsappPhotoFr"),
        whatsappPhotoEn: actionNullableText(formData, "whatsappPhotoEn"),
        whatsappVideoFr: actionNullableText(formData, "whatsappVideoFr"),
        whatsappVideoEn: actionNullableText(formData, "whatsappVideoEn"),
        whatsappDroneFr: actionNullableText(formData, "whatsappDroneFr"),
        whatsappDroneEn: actionNullableText(formData, "whatsappDroneEn"),
        whatsappPosition: positionValue(formData),
        whatsappPages: parseJsonArray(actionText(formData, "whatsappPages")) as never,
        footerIntroFr: actionNullableText(formData, "footerIntroFr"),
        footerIntroEn: actionNullableText(formData, "footerIntroEn"),
        copyrightFr: actionNullableText(formData, "copyrightFr"),
        copyrightEn: actionNullableText(formData, "copyrightEn"),
        maintenanceMode: actionBool(formData, "maintenanceMode"),
      },
      create: {
        id: 1,
        companyName,
        legalName,
        taglineFr: actionNullableText(formData, "taglineFr"),
        taglineEn: actionNullableText(formData, "taglineEn"),
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        logoMediaId: actionNullableText(formData, "logoMediaId"),
        logoLightMediaId: actionNullableText(formData, "logoLightMediaId"),
        faviconMediaId: actionNullableText(formData, "faviconMediaId"),
        timezone: actionText(formData, "timezone") || "Africa/Casablanca",
        currency: actionText(formData, "currency") || "MAD",
        bookingAutoConfirm: actionBool(formData, "bookingAutoConfirm"),
        customerRetentionDays: actionInt(formData, "customerRetentionDays", 730),
        whatsappEnabled: actionBool(formData, "whatsappEnabled"),
        whatsappNumber: actionNullableText(formData, "whatsappNumber"),
        whatsappMessageFr: actionNullableText(formData, "whatsappMessageFr"),
        whatsappMessageEn: actionNullableText(formData, "whatsappMessageEn"),
        whatsappPhotoFr: actionNullableText(formData, "whatsappPhotoFr"),
        whatsappPhotoEn: actionNullableText(formData, "whatsappPhotoEn"),
        whatsappVideoFr: actionNullableText(formData, "whatsappVideoFr"),
        whatsappVideoEn: actionNullableText(formData, "whatsappVideoEn"),
        whatsappDroneFr: actionNullableText(formData, "whatsappDroneFr"),
        whatsappDroneEn: actionNullableText(formData, "whatsappDroneEn"),
        whatsappPosition: positionValue(formData),
        whatsappPages: parseJsonArray(actionText(formData, "whatsappPages")) as never,
        footerIntroFr: actionNullableText(formData, "footerIntroFr"),
        footerIntroEn: actionNullableText(formData, "footerIntroEn"),
        copyrightFr: actionNullableText(formData, "copyrightFr"),
        copyrightEn: actionNullableText(formData, "copyrightEn"),
        maintenanceMode: actionBool(formData, "maintenanceMode"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "site.settings.update",
      entityType: "SiteSetting",
      entityId: "1",
      summary: "Réglages du site mis à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?saved=1");
}

export async function updateContactSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  try {
    await prisma.contactSetting.upsert({
      where: { id: 1 },
      update: {
        email: actionNullableText(formData, "email"),
        addressFr: actionNullableText(formData, "addressFr"),
        addressEn: actionNullableText(formData, "addressEn"),
        hoursFr: actionNullableText(formData, "hoursFr"),
        hoursEn: actionNullableText(formData, "hoursEn"),
        introFr: actionNullableText(formData, "introFr"),
        introEn: actionNullableText(formData, "introEn"),
      },
      create: {
        id: 1,
        email: actionNullableText(formData, "email"),
        addressFr: actionNullableText(formData, "addressFr"),
        addressEn: actionNullableText(formData, "addressEn"),
        hoursFr: actionNullableText(formData, "hoursFr"),
        hoursEn: actionNullableText(formData, "hoursEn"),
        introFr: actionNullableText(formData, "introFr"),
        introEn: actionNullableText(formData, "introEn"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "contact.settings.update",
      entityType: "ContactSetting",
      entityId: "1",
      summary: "Coordonnées mises à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?contactSaved=1");
}

export async function createContactPhoneAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const label = actionText(formData, "label");
  const number = actionText(formData, "number");
  if (!label || !number) return adminError("Libellé et numéro obligatoires.");

  try {
    const phone = await prisma.contactPhone.create({
      data: {
        label,
        number,
        displayOrder: actionInt(formData, "displayOrder", 0),
        isPrimary: actionBool(formData, "isPrimary"),
        whatsappEnabled: actionBool(formData, "whatsappEnabled"),
        active: actionBool(formData, "active"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "contact_phone.create",
      entityType: "ContactPhone",
      entityId: phone.id,
      summary: `Numéro ajouté : ${label}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?phoneCreated=1");
}

export async function updateContactPhoneAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const label = actionText(formData, "label");
  const number = actionText(formData, "number");
  if (!label || !number) return adminError("Libellé et numéro obligatoires.");

  try {
    const current = await prisma.contactPhone.findUnique({ where: { id } });
    if (!current) return adminError("Numéro introuvable.");
    await prisma.contactPhone.update({
      where: { id },
      data: {
        label,
        number,
        displayOrder: actionInt(formData, "displayOrder", 0),
        isPrimary: actionBool(formData, "isPrimary"),
        whatsappEnabled: actionBool(formData, "whatsappEnabled"),
        active: actionBool(formData, "active"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "contact_phone.update",
      entityType: "ContactPhone",
      entityId: id,
      summary: `Numéro mis à jour : ${label}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?phoneSaved=1");
}

export async function deleteContactPhoneAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const phone = await prisma.contactPhone.findUnique({ where: { id } });
  if (!phone) redirect("/admin/settings?error=introuvable");
  await prisma.contactPhone.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "contact_phone.delete",
    entityType: "ContactPhone",
    entityId: id,
    summary: `Numéro supprimé : ${phone.label}`,
  });
  redirect("/admin/settings?phoneDeleted=1");
}

export async function createSocialLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const platform = actionText(formData, "platform");
  const url = actionText(formData, "url");
  if (!platform || !url) return adminError("Plateforme et URL obligatoires.");

  try {
    const link = await prisma.socialLink.create({
      data: {
        platform,
        label: actionNullableText(formData, "label"),
        url,
        username: actionNullableText(formData, "username"),
        icon: actionNullableText(formData, "icon"),
        sortOrder: actionInt(formData, "sortOrder", 0),
        active: actionBool(formData, "active"),
        showHeader: actionBool(formData, "showHeader"),
        showFooter: actionBool(formData, "showFooter"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "social_link.create",
      entityType: "SocialLink",
      entityId: link.id,
      summary: `Réseau social ajouté : ${platform}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?socialCreated=1");
}

export async function updateSocialLinkAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const platform = actionText(formData, "platform");
  const url = actionText(formData, "url");
  if (!platform || !url) return adminError("Plateforme et URL obligatoires.");

  try {
    const current = await prisma.socialLink.findUnique({ where: { id } });
    if (!current) return adminError("Lien social introuvable.");
    await prisma.socialLink.update({
      where: { id },
      data: {
        platform,
        label: actionNullableText(formData, "label"),
        url,
        username: actionNullableText(formData, "username"),
        icon: actionNullableText(formData, "icon"),
        sortOrder: actionInt(formData, "sortOrder", 0),
        active: actionBool(formData, "active"),
        showHeader: actionBool(formData, "showHeader"),
        showFooter: actionBool(formData, "showFooter"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "social_link.update",
      entityType: "SocialLink",
      entityId: id,
      summary: `Réseau social mis à jour : ${platform}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?socialSaved=1");
}

export async function deleteSocialLinkAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const link = await prisma.socialLink.findUnique({ where: { id } });
  if (!link) redirect("/admin/settings?error=introuvable");
  await prisma.socialLink.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "social_link.delete",
    entityType: "SocialLink",
    entityId: id,
    summary: `Réseau social supprimé : ${link.platform}`,
  });
  redirect("/admin/settings?socialDeleted=1");
}

export async function updateMapSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.SETTINGS_MANAGE);
  if (!guard.ok) return guard.state;

  try {
    await prisma.mapSetting.upsert({
      where: { id: 1 },
      update: {
        enabled: actionBool(formData, "enabled"),
        publicUrl: actionNullableText(formData, "publicUrl"),
        embedUrl: actionNullableText(formData, "embedUrl"),
        directionsUrl: actionNullableText(formData, "directionsUrl"),
        addressFr: actionNullableText(formData, "addressFr"),
        addressEn: actionNullableText(formData, "addressEn"),
        latitude: actionText(formData, "latitude") ? Number(actionText(formData, "latitude")) : null,
        longitude: actionText(formData, "longitude") ? Number(actionText(formData, "longitude")) : null,
        zoom: actionInt(formData, "zoom", 14),
      },
      create: {
        id: 1,
        enabled: actionBool(formData, "enabled"),
        publicUrl: actionNullableText(formData, "publicUrl"),
        embedUrl: actionNullableText(formData, "embedUrl"),
        directionsUrl: actionNullableText(formData, "directionsUrl"),
        addressFr: actionNullableText(formData, "addressFr"),
        addressEn: actionNullableText(formData, "addressEn"),
        latitude: actionText(formData, "latitude") ? Number(actionText(formData, "latitude")) : null,
        longitude: actionText(formData, "longitude") ? Number(actionText(formData, "longitude")) : null,
        zoom: actionInt(formData, "zoom", 14),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "map.settings.update",
      entityType: "MapSetting",
      entityId: "1",
      summary: "Réglages de la carte mis à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/settings?mapSaved=1");
}
