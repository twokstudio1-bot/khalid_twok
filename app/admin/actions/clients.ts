"use server";

import { redirect } from "next/navigation";
import type { Locale } from "@prisma/client";
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

function clientTranslations(formData: FormData) {
  const rows: { locale: Locale; displayName: string | null; description: string | null }[] = [];
  for (const locale of ["FR", "EN"] as Locale[]) {
    const suffix = locale === "FR" ? "Fr" : "En";
    rows.push({
      locale,
      displayName: actionNullableText(formData, `displayName${suffix}`),
      description: actionNullableText(formData, `description${suffix}`),
    });
  }
  return rows;
}

export async function createClientAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.CLIENTS_MANAGE);
  if (!guard.ok) return guard.state;

  const name = actionText(formData, "name");
  if (!name) return adminError("Le nom est obligatoire.");

  const projectIds = actionIds(formData, "projectIds");
  let id: string;
  try {
    const client = await prisma.client.create({
      data: {
        name,
        websiteUrl: actionNullableText(formData, "websiteUrl"),
        description: actionNullableText(formData, "description"),
        sortOrder: actionInt(formData, "sortOrder", 0),
        featured: actionBool(formData, "featured"),
        active: actionBool(formData, "active"),
        monochrome: actionBool(formData, "monochrome"),
        logoMediaId: actionNullableText(formData, "logoMediaId"),
        translations: { create: clientTranslations(formData) },
        projectLinks: { create: projectIds.map((projectId) => ({ projectId })) },
      },
    });
    id = client.id;
    await logAudit({
      actorId: guard.session.user.id,
      action: "client.create",
      entityType: "Client",
      entityId: client.id,
      summary: `Client créé : ${name}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/clients/${id}?created=1`);
}

export async function updateClientAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.CLIENTS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const name = actionText(formData, "name");
  if (!name) return adminError("Le nom est obligatoire.");

  const projectIds = actionIds(formData, "projectIds");
  try {
    const current = await prisma.client.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Client introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: {
          name,
          websiteUrl: actionNullableText(formData, "websiteUrl"),
          description: actionNullableText(formData, "description"),
          sortOrder: actionInt(formData, "sortOrder", 0),
          featured: actionBool(formData, "featured"),
          active: actionBool(formData, "active"),
          monochrome: actionBool(formData, "monochrome"),
          logoMediaId: actionNullableText(formData, "logoMediaId"),
          deletedAt: null,
        },
      });
      for (const row of clientTranslations(formData)) {
        await tx.clientTranslation.upsert({
          where: { clientId_locale: { clientId: id, locale: row.locale } },
          update: { displayName: row.displayName, description: row.description },
          create: { clientId: id, ...row },
        });
      }
      await tx.clientProject.deleteMany({ where: { clientId: id } });
      if (projectIds.length) {
        await tx.clientProject.createMany({
          data: projectIds.map((projectId) => ({ clientId: id, projectId })),
          skipDuplicates: true,
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "client.update",
      entityType: "Client",
      entityId: id,
      summary: `Client mis à jour : ${name}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/clients/${id}?saved=1`);
}

export async function deleteClientAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.CLIENTS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client || client.deletedAt) redirect("/admin/clients?error=introuvable");
  await prisma.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "client.delete",
    entityType: "Client",
    entityId: id,
    summary: `Client archivé : ${client.name}`,
  });
  redirect("/admin/clients?deleted=1");
}
