import "server-only";
import nodemailer from "nodemailer";
import type { NotificationChannel, NotificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

type NotificationInput = {
  bookingId?: string | null;
  contactMessageId?: string | null;
  channel: NotificationChannel;
  template: string;
  recipient: string | null;
  subject?: string;
  body?: string;
};

async function mark(
  id: string,
  status: NotificationStatus,
  extra: { providerRef?: string; error?: string; sentAt?: Date } = {},
) {
  await prisma.bookingNotification
    .update({
      where: { id },
      data: {
        status,
        providerRef: extra.providerRef,
        error: extra.error?.slice(0, 500),
        sentAt: extra.sentAt,
      },
    })
    .catch(() => undefined);
}

async function sendEmail(input: NotificationInput, notificationId: string) {
  if (!env.smtp.host || !env.smtp.from || !input.recipient) {
    await mark(notificationId, "SKIPPED", {
      error: !env.smtp.host
        ? "SMTP non configuré."
        : !env.smtp.from
          ? "Expéditeur SMTP (SMTP_FROM) non configuré."
          : "Aucun destinataire.",
    });
    return;
  }
  try {
    const transport = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
    const info = await transport.sendMail({
      from: env.smtp.from,
      to: input.recipient,
      subject: input.subject ?? "TWOK STUDIO",
      text: input.body ?? "",
    });
    await mark(notificationId, "SENT", { providerRef: info.messageId, sentAt: new Date() });
  } catch (error) {
    await mark(notificationId, "FAILED", {
      error: error instanceof Error ? error.message : "Échec de l'envoi e-mail.",
    });
  }
}

async function sendWhatsApp(input: NotificationInput, notificationId: string) {
  if (!env.whatsappApi.enabled || !env.whatsappApi.phoneNumberId || !env.whatsappApi.accessToken) {
    await mark(notificationId, "SKIPPED", { error: "WhatsApp Business API non configurée." });
    return;
  }
  if (!input.recipient) {
    await mark(notificationId, "SKIPPED", { error: "Aucun destinataire WhatsApp." });
    return;
  }
  try {
    const response = await fetch(
      `https://graph.facebook.com/${env.whatsappApi.version}/${env.whatsappApi.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.whatsappApi.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: input.recipient.replace(/[^\d]/g, ""),
          type: "text",
          text: { body: input.body ?? "" },
        }),
        cache: "no-store",
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!response.ok) {
      await mark(notificationId, "FAILED", {
        error: payload.error?.message ?? `API WhatsApp: HTTP ${response.status}`,
      });
      return;
    }
    await mark(notificationId, "SENT", {
      providerRef: payload.messages?.[0]?.id,
      sentAt: new Date(),
    });
  } catch (error) {
    await mark(notificationId, "FAILED", {
      error: error instanceof Error ? error.message : "Échec WhatsApp.",
    });
  }
}

/**
 * Records every notification attempt. A message is only marked SENT when the
 * provider acknowledged it; otherwise it is SKIPPED or FAILED. No fake success.
 */
export async function notify(input: NotificationInput) {
  const record = await prisma.bookingNotification.create({
    data: {
      bookingId: input.bookingId ?? null,
      contactMessageId: input.contactMessageId ?? null,
      channel: input.channel,
      template: input.template,
      recipient: input.recipient,
      status: "PENDING",
    },
  });

  if (input.channel === "DASHBOARD") {
    await mark(record.id, "SENT", { sentAt: new Date() });
    return { id: record.id, status: "SENT" as NotificationStatus };
  }
  if (input.channel === "EMAIL") {
    await sendEmail(input, record.id);
    const updated = await prisma.bookingNotification.findUnique({ where: { id: record.id } });
    return { id: record.id, status: updated?.status ?? "PENDING" };
  }
  await sendWhatsApp(input, record.id);
  const updated = await prisma.bookingNotification.findUnique({ where: { id: record.id } });
  return { id: record.id, status: updated?.status ?? "PENDING" };
}

export async function notifyAdminOfBooking(input: {
  bookingId: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  serviceName: string;
  description: string;
}) {
  const body = [
    `Nouvelle demande de réservation ${input.reference}`,
    `Client : ${input.fullName}`,
    `E-mail : ${input.email}`,
    `Téléphone : ${input.phone}`,
    `Prestation : ${input.serviceName}`,
    `Date souhaitée : ${input.date} à ${input.time}`,
    "",
    input.description,
    "",
    "Statut : PENDING — à confirmer dans l'administration.",
  ].join("\n");

  await notify({
    bookingId: input.bookingId,
    channel: "DASHBOARD",
    template: "admin.booking.created",
    recipient: null,
    subject: `Nouvelle réservation ${input.reference}`,
    body,
  });

  if (env.smtp.adminEmail) {
    await notify({
      bookingId: input.bookingId,
      channel: "EMAIL",
      template: "admin.booking.created",
      recipient: env.smtp.adminEmail,
      subject: `[TWOK STUDIO] Nouvelle réservation ${input.reference}`,
      body,
    });
  } else {
    await notify({
      bookingId: input.bookingId,
      channel: "EMAIL",
      template: "admin.booking.created",
      recipient: null,
      subject: "Notification administrateur",
      body,
    });
  }

  if (env.whatsappApi.enabled && input.phone) {
    await notify({
      bookingId: input.bookingId,
      channel: "WHATSAPP",
      template: "admin.booking.created",
      recipient: input.phone,
      body: body,
    });
  }
}

export async function notifyCustomerBookingReceived(input: {
  bookingId: string;
  reference: string;
  email: string;
  fullName: string;
  locale: string;
}) {
  const body =
    input.locale === "en"
      ? `Hello ${input.fullName},\n\nWe have received your request ${input.reference}. It is pending review; our team will contact you after checking availability.\n\nTWOK STUDIO`
      : `Bonjour ${input.fullName},\n\nNous avons bien reçu votre demande ${input.reference}. Elle est en attente de validation ; notre équipe vous contactera après vérification des disponibilités.\n\nTWOK STUDIO`;
  await notify({
    bookingId: input.bookingId,
    channel: "EMAIL",
    template: "customer.booking.received",
    recipient: input.email,
    subject: input.locale === "en" ? `Request received — ${input.reference}` : `Demande reçue — ${input.reference}`,
    body,
  });
}

export async function notifyCustomerBookingStatus(input: {
  bookingId: string;
  reference: string;
  email: string;
  fullName: string;
  status: string;
  date: string;
  time: string;
  locale: string;
}) {
  const labels: Record<string, { fr: string; en: string }> = {
    CONFIRMED: { fr: "confirmée", en: "confirmed" },
    RESCHEDULED: { fr: "reprogrammée", en: "rescheduled" },
    CANCELLED: { fr: "annulée", en: "cancelled" },
    REJECTED: { fr: "refusée", en: "declined" },
    COMPLETED: { fr: "terminée", en: "completed" },
  };
  const label = labels[input.status] ?? { fr: input.status, en: input.status };
  const body =
    input.locale === "en"
      ? `Hello ${input.fullName},\n\nYour booking ${input.reference} is now ${label.en}. Date: ${input.date} at ${input.time}.\n\nTWOK STUDIO`
      : `Bonjour ${input.fullName},\n\nVotre réservation ${input.reference} est désormais ${label.fr}. Date : ${input.date} à ${input.time}.\n\nTWOK STUDIO`;

  await notify({
    bookingId: input.bookingId,
    channel: "EMAIL",
    template: `customer.booking.${input.status.toLowerCase()}`,
    recipient: input.email,
    subject:
      input.locale === "en"
        ? `Booking ${input.reference} — ${label.en}`
        : `Réservation ${input.reference} — ${label.fr}`,
    body,
  });
}

export async function notifyContactMessage(input: {
  messageId: string;
  name: string;
  email: string;
  message: string;
}) {
  await notify({
    contactMessageId: input.messageId,
    channel: "DASHBOARD",
    template: "admin.contact.received",
    recipient: null,
    subject: "Nouveau message de contact",
    body: `${input.name} <${input.email}>\n\n${input.message}`,
  });
}
