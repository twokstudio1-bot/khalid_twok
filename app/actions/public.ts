"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { validateRequestedSlot, assertSlotFreeInsideTransaction } from "@/lib/booking";
import { notify, notifyAdminOfBooking, notifyContactMessage, notifyCustomerBookingReceived } from "@/lib/notifications";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import type { FormState } from "@/lib/form-state";

const localeSchema = z.enum(["fr", "en"]);

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  serviceType: z.string().trim().max(100).optional().default(""),
  preferredDate: z.string().trim().optional().default(""),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
  locale: localeSchema,
  sourcePage: z.string().trim().max(200).optional().default(""),
});

const bookingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(6).max(40),
  whatsapp: z.string().trim().max(40).optional().default(""),
  serviceId: z.string().uuid().optional().or(z.literal("")),
  projectType: z.string().trim().max(100).optional().default(""),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().min(15).max(5000),
  budget: z.string().trim().max(100).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  consent: z.literal(true),
  locale: localeSchema,
});

const messages = {
  fr: {
    contactSuccess:
      "Merci, votre message a bien été reçu. Notre équipe vous répondra dans les meilleurs délais.",
    bookingSuccess:
      "Votre demande a bien été enregistrée. Elle n'est pas encore confirmée : notre équipe vous contactera après vérification des disponibilités.",
    invalid: "Merci de vérifier les champs du formulaire.",
    rate: "Trop de demandes ont été envoyées récemment. Merci de réessayer dans quelques minutes.",
    generic: "Une erreur est survenue. Merci de réessayer.",
    consent: "Votre consentement est nécessaire pour envoyer cette demande.",
    availability: "Le créneau choisi n'est plus disponible. Merci d'en choisir un autre.",
    service: "La prestation choisie n'est plus disponible.",
    notConfigured: "La prise de réservation n'est pas disponible pour le moment.",
  },
  en: {
    contactSuccess:
      "Thank you, your message has been received. Our team will get back to you shortly.",
    bookingSuccess:
      "Your request has been recorded. It is not confirmed yet: our team will contact you after checking availability.",
    invalid: "Please check the form fields.",
    rate: "Too many requests have been sent recently. Please try again in a few minutes.",
    generic: "Something went wrong. Please try again.",
    consent: "Your consent is required to send this request.",
    availability: "The selected slot is no longer available. Please choose another one.",
    service: "The selected service is no longer available.",
    notConfigured: "Online booking is not configured at the moment.",
  },
} as const;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function invalidState(locale: "fr" | "en", fieldErrors?: Record<string, string[]>): FormState {
  return {
    status: "error",
    message: fieldErrors ? messages[locale].invalid : messages[locale].generic,
    fieldErrors,
  };
}

export async function submitContactMessage(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const localeResult = localeSchema.safeParse(text(formData, "locale"));
  const locale = localeResult.success ? localeResult.data : "fr";

  // Honeypot: silently accept to avoid signalling the bot.
  if (text(formData, "website")) {
    return { status: "success", message: messages[locale].contactSuccess };
  }

  const raw = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    serviceType: text(formData, "serviceType"),
    preferredDate: text(formData, "preferredDate"),
    message: text(formData, "message"),
    consent: text(formData, "consent") === "on" || text(formData, "consent") === "true",
    locale: text(formData, "locale"),
    sourcePage: text(formData, "sourcePage"),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    if (!raw.consent) fieldErrors.consent = [messages[locale].consent];
    return invalidState(locale, fieldErrors);
  }

  const data = parsed.data;
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    consumeRateLimit({ namespace: "contact:ip", identifier: ip, limit: 8, windowMs: 15 * 60_000 }),
    consumeRateLimit({ namespace: "contact:email", identifier: data.email, limit: 3, windowMs: 30 * 60_000 }),
  ]).catch(() => [null, null] as const);
  if (!byIp || !byEmail) return invalidState(locale);
  if (!byIp.allowed || !byEmail.allowed) {
    return { status: "error", message: messages[locale].rate };
  }

  try {
    const customer = await prisma.customer.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        ...(data.phone ? { phone: data.phone } : {}),
        deletedAt: null,
      },
      create: { name: data.name, email: data.email, phone: data.phone || null },
    });

    const preferredDate =
      data.preferredDate && /^\d{4}-\d{2}-\d{2}$/.test(data.preferredDate)
        ? new Date(`${data.preferredDate}T00:00:00.000Z`)
        : null;

    const message = await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        serviceType: data.serviceType || null,
        preferredDate,
        message: data.message,
        customerId: customer.id,
        locale: data.locale === "en" ? "EN" : "FR",
        sourcePage: data.sourcePage || null,
        consentAt: new Date(),
      },
    });

    await notifyContactMessage({
      messageId: message.id,
      name: data.name,
      email: data.email,
      message: data.message,
    });

    if (env.smtp.adminEmail) {
      await notify({
        contactMessageId: message.id,
        channel: "EMAIL",
        template: "admin.contact.received",
        recipient: env.smtp.adminEmail,
        subject: `[TWOK STUDIO] Nouveau message — ${data.name}`,
        body: `De : ${data.name} <${data.email}>\nTéléphone : ${data.phone || "non renseigné"}\nPrestation : ${data.serviceType || "non précisée"}\n\n${data.message}`,
      });
    }

    return { status: "success", message: messages[locale].contactSuccess };
  } catch (error) {
    console.error("[contact] submission failed", error);
    return invalidState(locale);
  }
}

export async function submitBookingRequest(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const localeResult = localeSchema.safeParse(text(formData, "locale"));
  const locale = localeResult.success ? localeResult.data : "fr";

  if (text(formData, "website")) {
    return {
      status: "success",
      message: messages[locale].bookingSuccess,
    };
  }

  const raw = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    whatsapp: text(formData, "whatsapp"),
    serviceId: text(formData, "serviceId"),
    projectType: text(formData, "projectType"),
    preferredDate: text(formData, "preferredDate"),
    preferredTime: text(formData, "preferredTime"),
    location: text(formData, "location"),
    description: text(formData, "description"),
    budget: text(formData, "budget"),
    notes: text(formData, "notes"),
    consent: text(formData, "consent") === "on" || text(formData, "consent") === "true",
    locale: text(formData, "locale"),
  };

  const parsed = bookingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    if (!raw.consent) fieldErrors.consent = [messages[locale].consent];
    return invalidState(locale, fieldErrors);
  }

  const data = parsed.data;
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    consumeRateLimit({ namespace: "booking:ip", identifier: ip, limit: 8, windowMs: 60 * 60_000 }),
    consumeRateLimit({ namespace: "booking:email", identifier: data.email, limit: 4, windowMs: 60 * 60_000 }),
  ]).catch(() => [null, null] as const);
  if (!byIp || !byEmail) return invalidState(locale);
  if (!byIp.allowed || !byEmail.allowed) {
    return { status: "error", message: messages[locale].rate };
  }

  let service: Awaited<ReturnType<typeof prisma.bookingService.findUnique>> = null;
  if (data.serviceId) {
    service = await prisma.bookingService.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.active) {
      return { status: "error", message: messages[locale].service };
    }
  }
  const durationMinutes = service?.durationMinutes ?? undefined;

  const slot = await validateRequestedSlot(data.preferredDate, data.preferredTime, durationMinutes);
  if (!slot.ok) {
    return {
      status: "error",
      message: messages[locale].availability,
      fieldErrors: { preferredTime: [slot.error] },
    };
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const free = await assertSlotFreeInsideTransaction(
        tx,
        data.preferredDate,
        data.preferredTime,
        durationMinutes ?? 60,
      );
      if (!free.ok) throw new Error(free.error);

      const customer = await tx.customer.upsert({
        where: { email: data.email },
        update: {
          name: data.fullName,
          phone: data.phone,
          ...(data.whatsapp ? { whatsapp: data.whatsapp } : {}),
          deletedAt: null,
        },
        create: {
          name: data.fullName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp || null,
        },
      });

      let reference = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const { generateBookingReference } = await import("@/lib/booking");
        const candidate = generateBookingReference();
        const exists = await tx.booking.findUnique({ where: { reference: candidate }, select: { id: true } });
        if (!exists) {
          reference = candidate;
          break;
        }
      }
      if (!reference) {
        const { createUniqueBookingReference } = await import("@/lib/booking");
        reference = await createUniqueBookingReference();
      }

      const created = await tx.booking.create({
        data: {
          reference,
          status: "PENDING",
          serviceId: service?.id ?? null,
          customerId: customer.id,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp || null,
          projectType: data.projectType || (service ? service.nameFr : null),
          preferredDate: new Date(`${data.preferredDate}T00:00:00.000Z`),
          preferredTime: data.preferredTime,
          location: data.location || null,
          description: data.description,
          budget: data.budget || null,
          notes: data.notes || null,
          locale: data.locale === "en" ? "EN" : "FR",
          consentAt: new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: created.id,
          fromStatus: null,
          toStatus: "PENDING",
          note: "Demande envoyée depuis le site public.",
        },
      });

      return created;
    }, { timeout: 15_000 });

    await notifyAdminOfBooking({
      bookingId: booking.id,
      reference: booking.reference,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      date: booking.preferredDate.toISOString().slice(0, 10),
      time: booking.preferredTime,
      serviceName: service ? (data.locale === "en" ? service.nameEn : service.nameFr) : "—",
      description: booking.description,
    });

    await notifyCustomerBookingReceived({
      bookingId: booking.id,
      reference: booking.reference,
      email: booking.email,
      fullName: booking.fullName,
      locale: data.locale,
    });

    return {
      status: "success",
      message: messages[locale].bookingSuccess,
      reference: booking.reference,
    };
  } catch (error) {
    console.error("[booking] submission failed", error);
    return {
      status: "error",
      message: messages[locale].availability,
      fieldErrors: { preferredTime: [messages[locale].availability] },
    };
  }
}
