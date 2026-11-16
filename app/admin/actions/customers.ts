"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  actionGuard,
  actionNullableText,
  actionText,
  adminError,
  databaseErrorMessage,
  type AdminActionState,
} from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export async function updateCustomerAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.CUSTOMERS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const name = actionText(formData, "name");
  const email = actionText(formData, "email");
  if (!name || !email) return adminError("Nom et e-mail obligatoires.");

  try {
    const current = await prisma.customer.findUnique({ where: { id } });
    if (!current || current.deletedAt) return adminError("Client CRM introuvable.");
    await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone: actionNullableText(formData, "phone"),
        whatsapp: actionNullableText(formData, "whatsapp"),
        notes: actionNullableText(formData, "notes"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "customer.update",
      entityType: "Customer",
      entityId: id,
      summary: `Client CRM mis à jour : ${name}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/customers/${id}?saved=1`);
}
