"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  actionGuard,
  actionIds,
  actionText,
  adminError,
  databaseErrorMessage,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function createUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.USERS_MANAGE);
  if (!guard.ok) return guard.state;

  const name = actionText(formData, "name");
  const email = actionText(formData, "email").toLowerCase();
  const password = actionText(formData, "password");
  const roleIds = actionIds(formData, "roleIds");
  if (!name || !email || !password) return adminError("Nom, e-mail et mot de passe obligatoires.");
  if (password.length < 12) return adminError("Le mot de passe doit contenir au moins 12 caractères.");

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        status: actionText(formData, "status") === "DISABLED" ? "DISABLED" : "ACTIVE",
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      summary: `Utilisateur créé : ${email}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/users?created=1");
}

export async function updateUserAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.USERS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const name = actionText(formData, "name");
  const email = actionText(formData, "email").toLowerCase();
  const roleIds = actionIds(formData, "roleIds");
  if (!name || !email) return adminError("Nom et e-mail obligatoires.");

  try {
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Utilisateur introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name,
          email,
          status: actionText(formData, "status") === "DISABLED" ? "DISABLED" : "ACTIVE",
        },
      });
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
          skipDuplicates: true,
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "user.update",
      entityType: "User",
      entityId: id,
      summary: `Utilisateur mis à jour : ${email}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/users/${id}?saved=1`);
}

export async function disableUserAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.USERS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  if (id === guard.session.user.id) redirect("/admin/users?error=self");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) redirect("/admin/users?error=introuvable");
  await prisma.user.update({ where: { id }, data: { status: "DISABLED", deletedAt: new Date() } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "user.disable",
    entityType: "User",
    entityId: id,
    summary: `Utilisateur désactivé : ${user.email}`,
  });
  redirect("/admin/users?disabled=1");
}

export async function resetUserPasswordAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.USERS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const password = actionText(formData, "password");
  if (password.length < 12) return adminError("Le mot de passe doit contenir au moins 12 caractères.");

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) return adminError("Utilisateur introuvable.");
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await prisma.session.deleteMany({ where: { userId: id } });
    await logAudit({
      actorId: guard.session.user.id,
      action: "user.password_reset",
      entityType: "User",
      entityId: id,
      summary: `Mot de passe réinitialisé pour ${user.email}.`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/users/${id}?passwordReset=1`);
}

export async function updateRolePermissionsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.USERS_MANAGE);
  if (!guard.ok) return guard.state;

  const roleId = actionText(formData, "roleId");
  const permissionKeys = actionIds(formData, "permissionKeys");

  try {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return adminError("Rôle introuvable.");
    const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId, permissionId: permission.id })),
          skipDuplicates: true,
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "role.permissions.update",
      entityType: "Role",
      entityId: roleId,
      summary: `Permissions du rôle ${role.key} mises à jour.`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/roles?saved=1");
}
