import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BellOff } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, SelectField, TextareaField } from "@/components/admin/Fields";
import { StatusBadge, statusLabel } from "@/components/admin/StatusBadge";
import { updateBookingStatusAction } from "@/app/admin/actions/bookings";
import { formatDate, formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Détail de réservation" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  DASHBOARD: "Tableau de bord",
};

function channelLabel(value: string) {
  return CHANNEL_LABELS[value] ?? value;
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.BOOKINGS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      service: true,
      customer: true,
      history: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!booking) notFound();

  const error = typeof search.error === "string" ? search.error : null;
  const failedNotifications = booking.notifications.filter(
    (notification) => notification.status === "FAILED" || notification.status === "SKIPPED",
  );
  const isPending = booking.status === "PENDING";

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Activité · Réservation"
        title={booking.reference}
        description={`Demande reçue le ${formatDateTime(booking.createdAt)}. Statut actuel : ${statusLabel(booking.status).toLowerCase()}.`}
        actions={
          <Link href="/admin/bookings" className="admin-btn-ghost">
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Réservations
          </Link>
        }
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Réservation mise à jour." />}
      {error && <AdminNotice tone="error" title={decodeURIComponent(error)} />}

      <div className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white px-5 py-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Statut</p>
          <div className="mt-2">
            <StatusBadge value={booking.status} />
          </div>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Créneau demandé</p>
          <p className="mt-2 text-[13px] text-ink">
            {formatDate(booking.preferredDate)} · {booking.preferredTime}
          </p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Service</p>
          <p className="mt-2 text-[13px] text-ink">{booking.service?.nameFr ?? booking.projectType ?? "Non précisé"}</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Langue</p>
          <p className="mt-2 text-[13px] text-ink">{booking.locale === "FR" ? "Français" : "English"}</p>
        </div>
      </div>

      {isPending && (
        <AdminNotice tone="warning" title="Demande en attente de décision.">
          Aucun créneau n&apos;est bloqué et aucune confirmation n&apos;a été envoyée au client. Traitez la demande
          depuis le panneau « Traitement ».
        </AdminNotice>
      )}

      {failedNotifications.length > 0 && (
        <AdminNotice
          tone="error"
          title={`${failedNotifications.length} notification${failedNotifications.length > 1 ? "s" : ""} en échec ou ignorée${failedNotifications.length > 1 ? "s" : ""}.`}
        >
          Consultez le journal ci-dessous. Aucun renvoi automatique n&apos;est effectué.
        </AdminNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <AdminPanel title="Demande client" description="Informations transmises depuis le formulaire public.">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Nom</dt>
                <dd className="mt-1 text-ink">{booking.fullName}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">E-mail</dt>
                <dd className="mt-1 break-all text-ink">{booking.email}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Téléphone</dt>
                <dd className="mt-1 text-ink">{booking.phone}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">WhatsApp</dt>
                <dd className="mt-1 text-ink">{booking.whatsapp ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Lieu</dt>
                <dd className="mt-1 text-ink">{booking.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Budget</dt>
                <dd className="mt-1 text-ink">{booking.budget ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Description</dt>
                <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">{booking.description}</dd>
              </div>
              {booking.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Notes client</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-ink">{booking.notes}</dd>
                </div>
              )}
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Consentement</dt>
                <dd className="mt-1 text-ink">{formatDateTime(booking.consentAt)}</dd>
              </div>
              <div>
                <dt className="text-[9.5px] uppercase tracking-[0.14em] text-muted">Fiche client</dt>
                <dd className="mt-1 text-ink">
                  {booking.customer ? (
                    <Link href={`/admin/customers/${booking.customerId}`} className="hover:text-champagne">
                      {booking.customer.name ?? booking.customer.email}
                    </Link>
                  ) : (
                    "Non rattachée"
                  )}
                </dd>
              </div>
            </dl>
          </AdminPanel>

          <AdminPanel
            title="Historique des statuts"
            description="Chronologie des décisions prises par l'équipe. Aucune entrée n'est générée automatiquement."
          >
            {booking.history.length ? (
              <ol className="space-y-4">
                {booking.history.map((entry) => (
                  <li key={entry.id} className="border-l border-champagne/50 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.fromStatus && <StatusBadge value={entry.fromStatus} />}
                      {entry.fromStatus && <span className="text-[10px] text-muted-light">→</span>}
                      <StatusBadge value={entry.toStatus} />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-muted">
                      {formatDateTime(entry.createdAt)}
                      {entry.changedBy ? ` · ${entry.changedBy.name}` : ""}
                    </p>
                    {entry.note && <p className="mt-1 text-[11.5px] leading-relaxed text-ink">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[12px] text-muted">Aucun changement de statut enregistré pour le moment.</p>
            )}
          </AdminPanel>

          <AdminPanel
            title="Notifications"
            description="Journal des envois liés à cette réservation. Les échecs et envois ignorés sont affichés tels quels."
          >
            {booking.notifications.length ? (
              <ul className="divide-y divide-line border border-line">
                {booking.notifications.map((notification) => (
                  <li key={notification.id} className="bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={notification.status} />
                        <span className="text-[11.5px] text-ink">{channelLabel(notification.channel)}</span>
                        <span className="text-[10.5px] text-muted">{notification.template}</span>
                      </div>
                      <span className="text-[10px] text-muted-light">{formatDateTime(notification.createdAt)}</span>
                    </div>
                    {notification.recipient && (
                      <p className="mt-1 break-all text-[10.5px] text-muted">Destinataire : {notification.recipient}</p>
                    )}
                    {notification.error && (
                      <p className="mt-1.5 border-l-2 border-red-600/50 bg-red-50/50 px-2 py-1 text-[10.5px] leading-relaxed text-red-900">
                        {notification.error}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-3 text-[12px] text-muted">
                <BellOff aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted-light"  />
                <p>Aucune notification enregistrée. Ce journal reste vide tant qu&apos;aucun envoi n&apos;a été tenté.</p>
              </div>
            )}
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel
            title="Traitement"
            description="La confirmation n'est jamais automatique. Vérifiez le créneau avant de valider."
          >
            <AdminForm
              action={updateBookingStatusAction}
              submitLabel="Enregistrer le traitement"
              pendingLabel="Enregistrement…"
              compact
            >
              <input type="hidden" name="id" value={booking.id} />
              <SelectField label="Statut" name="status" defaultValue={booking.status} required>
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmée</option>
                <option value="RESCHEDULED">Reprogrammée</option>
                <option value="COMPLETED">Terminée</option>
                <option value="CANCELLED">Annulée</option>
                <option value="REJECTED">Refusée</option>
              </SelectField>
              <Field
                label="Prix convenu (MAD)"
                name="agreedPrice"
                type="number"
                step="0.01"
                defaultValue={booking.agreedPrice ? booking.agreedPrice.toString() : ""}
              />
              <TextareaField
                label="Note de changement"
                name="statusNote"
                rows={2}
                help="Motif de la reprogrammation ou du refus. Conservé dans l'historique."
              />
              <TextareaField
                label="Notes internes"
                name="internalNotes"
                defaultValue={booking.internalNotes}
                rows={5}
                help="Visible uniquement dans l'administration."
              />
            </AdminForm>
          </AdminPanel>

          <AdminPanel title="Repères">
            <dl className="space-y-3 text-[11.5px]">
              <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
                <dt className="text-muted">Statut</dt>
                <dd className="text-ink">{statusLabel(booking.status)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
                <dt className="text-muted">Confirmée le</dt>
                <dd className="text-ink">{booking.confirmedAt ? formatDateTime(booking.confirmedAt) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-line pb-2">
                <dt className="text-muted">Clôturée le</dt>
                <dd className="text-ink">{booking.cancelledAt ? formatDateTime(booking.cancelledAt) : "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted">Notifications</dt>
                <dd className="text-ink">
                  {booking.notifications.length
                    ? `${booking.notifications.length} entrée${booking.notifications.length > 1 ? "s" : ""}`
                    : "Aucune"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted-light">
              Le changement de statut met à jour la réservation et son historique. Aucun e-mail ni message WhatsApp
              n&apos;est envoyé automatiquement.
            </p>
            <Link
              href="/admin/bookings/calendar"
              className="mt-4 inline-flex min-h-10 items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink"
            >
              Voir le calendrier <ArrowUpRight aria-hidden className="h-3 w-3"  />
            </Link>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
