import "server-only";
import { randomBytes } from "crypto";
import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { minutesToTime, rangesOverlap, timeToMinutes } from "@/lib/utils";

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "RESCHEDULED"];
const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateBookingReference(date = new Date()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = randomBytes(5);
  let suffix = "";
  for (let i = 0; i < 5; i += 1) {
    suffix += REFERENCE_ALPHABET[bytes[i] % REFERENCE_ALPHABET.length];
  }
  return `TWK-${day}-${suffix}`;
}

export async function createUniqueBookingReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = generateBookingReference();
    const exists = await prisma.booking.findUnique({ where: { reference }, select: { id: true } });
    if (!exists) return reference;
  }
  return `TWK-${Date.now().toString(36).toUpperCase()}`;
}

export function parseWorkingDays(value: Prisma.JsonValue): number[] {
  if (Array.isArray(value)) {
    const days = value.filter((day): day is number => typeof day === "number" && day >= 0 && day <= 6);
    return days.length ? days : [1, 2, 3, 4, 5, 6];
  }
  return [1, 2, 3, 4, 5, 6];
}

export function zonedNow(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

type AvailabilityRow = {
  timezone: string;
  workingDays: Prisma.JsonValue;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  bufferMinutes: number;
  maxPerSlot: number;
  leadTimeHours: number;
};

type ExistingBooking = {
  preferredTime: string;
  service: { durationMinutes: number } | null;
};

export function computeSlots(
  availability: AvailabilityRow,
  date: Date,
  existing: ExistingBooking[],
  requestedDurationMinutes?: number,
) {
  const workingDays = parseWorkingDays(availability.workingDays);
  const weekday = date.getUTCDay();
  if (!workingDays.includes(weekday)) return [];

  const start = timeToMinutes(availability.startTime);
  const end = timeToMinutes(availability.endTime);
  const duration = Math.max(15, requestedDurationMinutes ?? availability.slotMinutes);
  const step = Math.max(availability.slotMinutes, 15);
  const buffer = Math.max(0, availability.bufferMinutes);
  const now = zonedNow(availability.timezone);
  const dateString = date.toISOString().slice(0, 10);
  const leadMinutes = Math.max(0, availability.leadTimeHours) * 60;

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return [];

  const busy = existing.map((booking) => {
    const bookingStart = timeToMinutes(booking.preferredTime);
    const bookingEnd = bookingStart + (booking.service?.durationMinutes ?? availability.slotMinutes) + buffer;
    return { start: bookingStart, end: bookingEnd, time: booking.preferredTime };
  });

  const slots: { time: string; available: boolean }[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += step) {
    const slotEnd = cursor + duration;
    const overlaps = busy.filter((item) => rangesOverlap(cursor, slotEnd, item.start, item.end)).length;
    let available = overlaps < availability.maxPerSlot;
    if (available) {
      if (dateString < now.date) available = false;
      else if (dateString === now.date && cursor < now.minutes + leadMinutes) available = false;
      else if (dateString === now.date && cursor > now.minutes + leadMinutes && cursor - leadMinutes < now.minutes)
        available = false;
    }
    slots.push({ time: minutesToTime(cursor), available });
  }
  return slots;
}

export async function getDayContext(dateString: string) {
  const [availability, blocked, bookings] = await Promise.all([
    prisma.bookingAvailability.findUnique({ where: { id: 1 } }),
    prisma.bookingBlockedDate.findUnique({ where: { date: new Date(`${dateString}T00:00:00.000Z`) } }),
    prisma.booking.findMany({
      where: {
        preferredDate: new Date(`${dateString}T00:00:00.000Z`),
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
      include: { service: { select: { durationMinutes: true } } },
    }),
  ]);
  return { availability, blocked, bookings };
}

export async function getAvailableSlots(dateString: string, durationMinutes?: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { slots: [], closed: true, reason: "Date invalide." };
  }
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { slots: [], closed: true, reason: "Date invalide." };
  }
  const { availability, blocked, bookings } = await getDayContext(dateString);
  if (!availability) return { slots: [], closed: true, reason: "Disponibilités non configurées." };
  if (blocked) return { slots: [], closed: true, reason: blocked.reason || "Date indisponible." };
  const workingDays = parseWorkingDays(availability.workingDays);
  if (!workingDays.includes(date.getUTCDay())) {
    return { slots: [], closed: true, reason: "Fermé ce jour-là." };
  }
  const slots = computeSlots(
    availability,
    date,
    bookings,
    durationMinutes,
  );
  return {
    slots: slots.filter((slot) => slot.available).map((slot) => slot.time),
    closed: slots.length === 0,
    reason: slots.length === 0 ? "Aucun créneau disponible." : null,
    timezone: availability.timezone,
  };
}

export async function validateRequestedSlot(dateString: string, time: string, durationMinutes?: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || !/^\d{2}:\d{2}$/.test(time)) {
    return { ok: false as const, error: "Date ou heure invalide." };
  }
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return { ok: false as const, error: "Date invalide." };
  const { availability, blocked, bookings } = await getDayContext(dateString);
  if (!availability) return { ok: false as const, error: "Les disponibilités ne sont pas configurées." };
  if (blocked) return { ok: false as const, error: "Cette date n'est pas disponible." };
  if (!parseWorkingDays(availability.workingDays).includes(date.getUTCDay())) {
    return { ok: false as const, error: "Le studio est fermé ce jour-là." };
  }
  const slots = computeSlots(availability, date, bookings, durationMinutes);
  const match = slots.find((slot) => slot.time === time);
  if (!match) return { ok: false as const, error: "Ce créneau n'est pas proposé pour cette date." };
  if (!match.available) return { ok: false as const, error: "Ce créneau n'est plus disponible." };

  const now = zonedNow(availability.timezone);
  if (dateString < now.date) return { ok: false as const, error: "La date choisie est déjà passée." };
  return { ok: true as const, availability };
}

/**
 * Must be called inside a transaction. Serializes confirmations for the same
 * calendar date so two admins cannot confirm overlapping slots concurrently.
 */
export async function assertSlotFreeInsideTransaction(
  tx: Prisma.TransactionClient,
  dateString: string,
  time: string,
  durationMinutes: number,
  excludeBookingId?: string,
) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking:${dateString}`}))`;
  const availability = await tx.bookingAvailability.findUnique({ where: { id: 1 } });
  const buffer = availability?.bufferMinutes ?? 30;
  const candidateStart = timeToMinutes(time);
  const candidateEnd = candidateStart + durationMinutes + buffer;

  const existing = await tx.booking.findMany({
    where: {
      preferredDate: new Date(`${dateString}T00:00:00.000Z`),
      status: { in: ACTIVE_BOOKING_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
    include: { service: { select: { durationMinutes: true } } },
  });

  const conflict = existing.find((booking) => {
    const start = timeToMinutes(booking.preferredTime);
    const end = start + (booking.service?.durationMinutes ?? 60) + buffer;
    return rangesOverlap(candidateStart, candidateEnd, start, end);
  });

  if (conflict) {
    return {
      ok: false as const,
      error: `Conflit avec la réservation ${conflict.reference} (${conflict.preferredTime}).`,
    };
  }
  return { ok: true as const };
}

export function formatSlotLabel(time: string) {
  return time;
}
