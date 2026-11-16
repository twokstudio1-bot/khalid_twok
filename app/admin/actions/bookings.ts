"use server";

import { redirect } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  actionBool,
  actionDate,
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

const STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "RESCHEDULED", "COMPLETED", "CANCELLED", "REJECTED"];

function statusValue(formData: FormData): BookingStatus {
  const raw = actionText(formData, "status").toUpperCase() as BookingStatus;
  return STATUSES.includes(raw) ? raw : "PENDING";
}

export async function updateBookingStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const status = statusValue(formData);
  const internalNotes = actionNullableText(formData, "internalNotes");
  const agreedPriceRaw = actionText(formData, "agreedPrice");
  const agreedPrice = agreedPriceRaw ? Number(agreedPriceRaw) : null;
  if (agreedPriceRaw && !Number.isFinite(agreedPrice)) return adminError("Le prix convenu est invalide.");
  const note = actionNullableText(formData, "statusNote");

  try {
    const current = await prisma.booking.findUnique({ where: { id } });
    if (!current) return adminError("Réservation introuvable.");

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242)`;
      if (status === "CONFIRMED" && status !== current.status) {
        const conflict = await tx.booking.count({
          where: {
            id: { not: id },
            preferredDate: current.preferredDate,
            preferredTime: current.preferredTime,
            status: "CONFIRMED",
          },
        });
        if (conflict > 0) throw new Error("CONFLICT");
      }
      await tx.booking.update({
        where: { id },
        data: {
          status,
          internalNotes,
          agreedPrice: agreedPrice === null ? null : agreedPrice,
          confirmedAt: status === "CONFIRMED" ? new Date() : current.confirmedAt,
          cancelledAt: status === "CANCELLED" || status === "REJECTED" ? new Date() : current.cancelledAt,
        },
      });
      if (status !== current.status) {
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: id,
            fromStatus: current.status,
            toStatus: status,
            note: note ?? (status === "REJECTED" ? "Demande refusée." : null),
            changedById: guard.session.user.id,
          },
        });
      }
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "booking.status_update",
      entityType: "Booking",
      entityId: id,
      summary: `Réservation ${current.reference} → ${status}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONFLICT") {
      return adminError("Un autre rendez-vous est déjà confirmé sur ce créneau.");
    }
    return adminError(databaseErrorMessage(error));
  }
  redirect(`/admin/bookings/${id}?saved=1`);
}

export async function updateAvailabilityAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const workingDays = actionIds(formData, "workingDays")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));
  if (!workingDays.length) return adminError("Sélectionnez au moins un jour ouvré.");

  const startTime = actionText(formData, "startTime");
  const endTime = actionText(formData, "endTime");
  if (!startTime || !endTime) return adminError("Les heures de début et de fin sont obligatoires.");

  try {
    await prisma.bookingAvailability.upsert({
      where: { id: 1 },
      update: {
        timezone: actionText(formData, "timezone") || "Africa/Casablanca",
        workingDays: workingDays as never,
        startTime,
        endTime,
        slotMinutes: actionInt(formData, "slotMinutes", 60),
        bufferMinutes: actionInt(formData, "bufferMinutes", 30),
        maxPerSlot: actionInt(formData, "maxPerSlot", 1),
        leadTimeHours: actionInt(formData, "leadTimeHours", 24),
        autoConfirm: actionBool(formData, "autoConfirm"),
      },
      create: {
        id: 1,
        timezone: actionText(formData, "timezone") || "Africa/Casablanca",
        workingDays: workingDays as never,
        startTime,
        endTime,
        slotMinutes: actionInt(formData, "slotMinutes", 60),
        bufferMinutes: actionInt(formData, "bufferMinutes", 30),
        maxPerSlot: actionInt(formData, "maxPerSlot", 1),
        leadTimeHours: actionInt(formData, "leadTimeHours", 24),
        autoConfirm: actionBool(formData, "autoConfirm"),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "booking.availability.update",
      entityType: "BookingAvailability",
      entityId: "1",
      summary: "Disponibilités mises à jour.",
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/bookings/settings?saved=1");
}

export async function addBlockedDateAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const date = actionDate(formData, "date");
  if (!date) return adminError("La date est obligatoire.");
  const reason = actionNullableText(formData, "reason");

  try {
    await prisma.bookingBlockedDate.create({
      data: { date: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), reason },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "booking.blocked_date.add",
      entityType: "BookingBlockedDate",
      summary: `Date bloquée ajoutée : ${date.toISOString().slice(0, 10)}.`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/bookings/settings?blocked=1");
}

export async function deleteBlockedDateAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const blocked = await prisma.bookingBlockedDate.findUnique({ where: { id } });
  if (!blocked) redirect("/admin/bookings/settings?error=introuvable");
  await prisma.bookingBlockedDate.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "booking.blocked_date.delete",
    entityType: "BookingBlockedDate",
    entityId: id,
    summary: `Date bloquée supprimée : ${blocked.date.toISOString().slice(0, 10)}.`,
  });
  redirect("/admin/bookings/settings?unblocked=1");
}

export async function createBookingServiceAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const slug = actionText(formData, "slug");
  const nameFr = actionText(formData, "nameFr");
  const nameEn = actionText(formData, "nameEn") || nameFr;
  if (!slug || !nameFr) return adminError("Slug et nom FR obligatoires.");

  try {
    const service = await prisma.bookingService.create({
      data: {
        slug,
        nameFr,
        nameEn,
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        durationMinutes: actionInt(formData, "durationMinutes", 60),
        priceFrom: actionText(formData, "priceFrom") ? Number(actionText(formData, "priceFrom")) : null,
        active: actionBool(formData, "active"),
        sortOrder: actionInt(formData, "sortOrder", 0),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "booking_service.create",
      entityType: "BookingService",
      entityId: service.id,
      summary: `Service de réservation créé : ${nameFr}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/bookings/settings?serviceCreated=1");
}

export async function updateBookingServiceAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) return guard.state;

  const id = actionText(formData, "id");
  const slug = actionText(formData, "slug");
  const nameFr = actionText(formData, "nameFr");
  const nameEn = actionText(formData, "nameEn") || nameFr;
  if (!slug || !nameFr) return adminError("Slug et nom FR obligatoires.");

  try {
    const current = await prisma.bookingService.findUnique({ where: { id } });
    if (!current) return adminError("Service introuvable.");
    await prisma.bookingService.update({
      where: { id },
      data: {
        slug,
        nameFr,
        nameEn,
        descriptionFr: actionNullableText(formData, "descriptionFr"),
        descriptionEn: actionNullableText(formData, "descriptionEn"),
        durationMinutes: actionInt(formData, "durationMinutes", 60),
        priceFrom: actionText(formData, "priceFrom") ? Number(actionText(formData, "priceFrom")) : null,
        active: actionBool(formData, "active"),
        sortOrder: actionInt(formData, "sortOrder", 0),
      },
    });
    await logAudit({
      actorId: guard.session.user.id,
      action: "booking_service.update",
      entityType: "BookingService",
      entityId: id,
      summary: `Service de réservation mis à jour : ${nameFr}`,
    });
  } catch (error) {
    return adminError(databaseErrorMessage(error));
  }
  redirect("/admin/bookings/settings?serviceSaved=1");
}

export async function deleteBookingServiceAction(formData: FormData) {
  const guard = await actionGuard(PERMISSIONS.BOOKINGS_MANAGE);
  if (!guard.ok) redirect("/admin/forbidden");
  const id = actionText(formData, "id");
  const count = await prisma.booking.count({ where: { serviceId: id } });
  if (count > 0) {
    redirect(`/admin/bookings/settings?error=${encodeURIComponent("Des réservations utilisent ce service. Archivez-le plutôt que de le supprimer.")}`);
  }
  const service = await prisma.bookingService.findUnique({ where: { id } });
  if (!service) redirect("/admin/bookings/settings?error=introuvable");
  await prisma.bookingService.delete({ where: { id } });
  await logAudit({
    actorId: guard.session.user.id,
    action: "booking_service.delete",
    entityType: "BookingService",
    entityId: id,
    summary: `Service de réservation supprimé : ${service.nameFr}`,
  });
  redirect("/admin/bookings/settings?serviceDeleted=1");
}
