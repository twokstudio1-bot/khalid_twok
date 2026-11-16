"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { actionGuard, actionNullableText, actionText, adminError, databaseErrorMessage, type AdminActionState } from "@/lib/admin";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteMedia, saveUploadedFile } from "@/lib/media";
import { logAudit } from "@/lib/audit";

export async function uploadMediaAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.MEDIA_MANAGE);
  if (!guard.ok) return guard.state;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return adminError("Sélectionnez un fichier image ou vidéo.");
  }

  let mediaId: string;
  try {
    const result = await saveUploadedFile(file, guard.session.user.id, {
      folder: actionText(formData, "folder") || undefined,
      altFr: actionText(formData, "altFr") || undefined,
      altEn: actionText(formData, "altEn") || undefined,
    });
    if (!result.ok) return adminError(result.error);
    mediaId = result.media.id;
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/media/${mediaId}?uploaded=1`);
}

export async function updateMediaAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.MEDIA_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  try {
    const media = await prisma.media.update({
      where: { id },
      data: {
        altFr: actionNullableText(formData, "altFr"),
        altEn: actionNullableText(formData, "altEn"),
        captionFr: actionNullableText(formData, "captionFr"),
        captionEn: actionNullableText(formData, "captionEn"),
        folder: actionNullableText(formData, "folder"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "media.update",
      entityType: "Media",
      entityId: media.id,
      summary: `Métadonnées mises à jour : ${media.originalName}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/media/${id}?saved=1`);
}

export async function deleteMediaAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.MEDIA_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const result = await deleteMedia(id, guard.session.user.id);
  if (!result.ok) {
    redirect(`/admin/media/${id}?error=${encodeURIComponent(result.error ?? "Suppression impossible.")}`);
  }
  redirect("/admin/media?deleted=1");
}
