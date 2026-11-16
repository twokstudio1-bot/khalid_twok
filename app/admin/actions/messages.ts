"use server";

import { redirect } from "next/navigation";
import type { MessageStatus } from "@prisma/client";
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

const STATUSES: MessageStatus[] = ["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"];

function statusValue(formData: FormData): MessageStatus {
  const raw = actionText(formData, "status").toUpperCase() as MessageStatus;
  return STATUSES.includes(raw) ? raw : "NEW";
}

export async function updateContactMessageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.MESSAGES_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const status = statusValue(formData);
  const internalNotes = actionNullableText(formData, "internalNotes");

  try {
    const current = await prisma.contactMessage.findUnique({ where: { id } });
    if (!current) return adminError("Message introuvable.");
    await prisma.contactMessage.update({
      where: { id },
      data: { status, internalNotes },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "contact_message.update",
      entityType: "ContactMessage",
      entityId: id,
      summary: `Message ${current.name} → ${status}.`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/messages/${id}?saved=1`);
}
