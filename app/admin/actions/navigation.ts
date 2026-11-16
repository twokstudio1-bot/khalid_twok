"use server";

import { redirect } from "next/navigation";
import type { MenuTarget } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
  actionGuard,
  actionIds,
  actionInt,
  actionNullableText,
  actionText,
  adminError,
  databaseErrorMessage,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const TARGETS: MenuTarget[] = [
  "HOME", "PHOTO", "VIDEO", "DRONE", "BLOG", "CONTACT", "BOOKING", "PROJECTS", "CLIENTS", "CUSTOM",
];

function targetValue(formData: FormData): MenuTarget {
  const raw = actionText(formData, "target").toUpperCase() as MenuTarget;
  return TARGETS.includes(raw) ? raw : "CUSTOM";
}

export async function createMenuItemAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.NAVIGATION_MANAGE);
  if (!guard.ok) return guard.state;

  const menuId = actionText(formData, "menuId");
  const labelFr = actionText(formData, "labelFr");
  const labelEn = actionText(formData, "labelEn") || labelFr;
  if (!menuId || !labelFr) return adminError("Menu et libellé FR obligatoires.");

  const target = targetValue(formData);
  const pageId = actionNullableText(formData, "pageId");
  const categoryId = actionNullableText(formData, "categoryId");
  const url = actionNullableText(formData, "url");
  const parentId = actionNullableText(formData, "parentId");

  try {
    const item = await prisma.menuItem.create({
      data: {
        menuId,
        parentId,
        target,
        pageId: target === "CUSTOM" ? pageId : null,
        categoryId: ["PHOTO", "VIDEO", "DRONE"].includes(target) ? categoryId : null,
        url: target === "CUSTOM" ? url : null,
        labelFr,
        labelEn,
        sortOrder: actionInt(formData, "sortOrder", 0),
        enabled: actionBool(formData, "enabled"),
        openInNewTab: actionBool(formData, "openInNewTab"),
        showChildren: actionBool(formData, "showChildren"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "menu_item.create",
      entityType: "MenuItem",
      entityId: item.id,
      summary: `Élément de menu créé : ${labelFr}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/navigation?menu=${encodeURIComponent(actionText(formData, "menuKey"))}&created=1`);
}

export async function updateMenuItemAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.NAVIGATION_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const labelFr = actionText(formData, "labelFr");
  const labelEn = actionText(formData, "labelEn") || labelFr;
  if (!labelFr) return adminError("Le libellé FR est obligatoire.");

  const target = targetValue(formData);
  const pageId = actionNullableText(formData, "pageId");
  const categoryId = actionNullableText(formData, "categoryId");
  const url = actionNullableText(formData, "url");
  const parentId = actionNullableText(formData, "parentId");
  if (parentId === id) return adminError("Un élément ne peut pas être son propre parent.");

  try {
    const current = await prisma.menuItem.findUnique({ where: { id } });
    if (!current) return adminError("Élément introuvable.");
    await prisma.menuItem.update({
      where: { id },
      data: {
        parentId,
        target,
        pageId: target === "CUSTOM" ? pageId : null,
        categoryId: ["PHOTO", "VIDEO", "DRONE"].includes(target) ? categoryId : null,
        url: target === "CUSTOM" ? url : null,
        labelFr,
        labelEn,
        sortOrder: actionInt(formData, "sortOrder", 0),
        enabled: actionBool(formData, "enabled"),
        openInNewTab: actionBool(formData, "openInNewTab"),
        showChildren: actionBool(formData, "showChildren"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "menu_item.update",
      entityType: "MenuItem",
      entityId: id,
      summary: `Élément de menu mis à jour : ${labelFr}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/navigation?menu=${encodeURIComponent(actionText(formData, "menuKey"))}&saved=1`);
}

export async function deleteMenuItemAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.NAVIGATION_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const menuKey = actionText(formData, "menuKey");
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) redirect(`/admin/navigation?menu=${encodeURIComponent(menuKey)}&error=introuvable`);
  await prisma.menuItem.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "menu_item.delete",
    entityType: "MenuItem",
    entityId: id,
    summary: `Élément de menu supprimé : ${item.labelFr}`,
  });
  redirect(`/admin/navigation?menu=${encodeURIComponent(menuKey)}&deleted=1`);
}
