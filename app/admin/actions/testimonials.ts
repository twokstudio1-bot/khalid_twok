"use server";

import { redirect } from "next/navigation";
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

export async function createTestimonialAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.TESTIMONIALS_MANAGE);
  if (!guard.ok) return guard.state;

  const author = actionText(formData, "author");
  const quoteFr = actionText(formData, "quoteFr");
  const quoteEn = actionText(formData, "quoteEn");
  if (!author || !quoteFr || !quoteEn) return adminError("Auteur et citations FR/EN obligatoires.");

  let id: string;
  try {
    const testimonial = await prisma.testimonial.create({
      data: {
        author,
        role: actionNullableText(formData, "role"),
        quoteFr,
        quoteEn,
        photoId: actionNullableText(formData, "photoId"),
        featured: actionBool(formData, "featured"),
        active: actionBool(formData, "active"),
        sortOrder: actionInt(formData, "sortOrder", 0),
      },
    });
    id = testimonial.id;
    await logAudit({
      actorId: guard.session.user.id,
      action: "testimonial.create",
      entityType: "Testimonial",
      entityId: id,
      summary: `Témoignage créé : ${author}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/testimonials/${id}?created=1`);
}

export async function updateTestimonialAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.TESTIMONIALS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const author = actionText(formData, "author");
  const quoteFr = actionText(formData, "quoteFr");
  const quoteEn = actionText(formData, "quoteEn");
  if (!author || !quoteFr || !quoteEn) return adminError("Auteur et citations FR/EN obligatoires.");

  try {
    const current = await prisma.testimonial.findUnique({ where: { id } });
    if (!current) return adminError("Témoignage introuvable.");
    await prisma.testimonial.update({
      where: { id },
      data: {
        author,
        role: actionNullableText(formData, "role"),
        quoteFr,
        quoteEn,
        photoId: actionNullableText(formData, "photoId"),
        featured: actionBool(formData, "featured"),
        active: actionBool(formData, "active"),
        sortOrder: actionInt(formData, "sortOrder", 0),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "testimonial.update",
      entityType: "Testimonial",
      entityId: id,
      summary: `Témoignage mis à jour : ${author}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/testimonials/${id}?saved=1`);
}

export async function deleteTestimonialAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.TESTIMONIALS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) redirect("/admin/testimonials?error=introuvable");
  await prisma.testimonial.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "testimonial.delete",
    entityType: "Testimonial",
    entityId: id,
    summary: `Témoignage supprimé : ${testimonial.author}`,
  });
  redirect("/admin/testimonials?deleted=1");
}
