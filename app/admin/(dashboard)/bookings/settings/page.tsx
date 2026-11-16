import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  addBlockedDateAction,
  createBookingServiceAction,
  deleteBlockedDateAction,
  deleteBookingServiceAction,
  updateAvailabilityAction,
} from "@/app/admin/actions/bookings";
import { formatDateInput } from "@/lib/admin";

export const metadata: Metadata = { title: "Disponibilités et services" };
export const dynamic = "force-dynamic";

const DAYS = [
  { value: 0, label: "Dimanche" },
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

export default async function BookingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.BOOKINGS_MANAGE);
  const search = await searchParams;
  const [availability, blockedDates, services] = await Promise.all([
    prisma.bookingAvailability.findUnique({ where: { id: 1 } }),
    prisma.bookingBlockedDate.findMany({ orderBy: { date: "asc" } }),
    prisma.bookingService.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const workingDays = Array.isArray(availability?.workingDays) ? (availability?.workingDays as number[]) : [1, 2, 3, 4, 5, 6];

  return (
    <div>
      <AdminPageHeader
        eyebrow="Activité"
        title="Disponibilités."
        description="Configurez les jours ouvrés, les créneaux, les dates bloquées et les services proposés."
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Disponibilités enregistrées." />}
      {search.blocked === "1" && <AdminNotice tone="success" title="Date bloquée ajoutée." />}
      {search.unblocked === "1" && <AdminNotice tone="success" title="Date bloquée supprimée." />}
      {search.serviceCreated === "1" && <AdminNotice tone="success" title="Service créé." />}
      {search.serviceSaved === "1" && <AdminNotice tone="success" title="Service enregistré." />}
      {search.serviceDeleted === "1" && <AdminNotice tone="success" title="Service supprimé." />}
      {typeof search.error === "string" && <AdminNotice tone="error" title={decodeURIComponent(search.error)} />}

      <AdminPanel title="Disponibilités générales" description="Fuseau horaire configurable. Le double booking est empêché côté serveur.">
        <AdminForm action={updateAvailabilityAction} submitLabel="Enregistrer les disponibilités" pendingLabel="Enregistrement…" compact>
          <FormGrid cols={3}>
            <Field label="Fuseau horaire" name="timezone" defaultValue={availability?.timezone ?? "Africa/Casablanca"} />
            <Field label="Heure de début" name="startTime" type="time" defaultValue={availability?.startTime ?? "09:00"} required />
            <Field label="Heure de fin" name="endTime" type="time" defaultValue={availability?.endTime ?? "18:00"} required />
            <Field label="Durée d'un créneau (min)" name="slotMinutes" type="number" defaultValue={availability?.slotMinutes ?? 60} />
            <Field label="Tampon entre créneaux (min)" name="bufferMinutes" type="number" defaultValue={availability?.bufferMinutes ?? 30} />
            <Field label="Maximum par créneau" name="maxPerSlot" type="number" defaultValue={availability?.maxPerSlot ?? 1} />
            <Field label="Délai minimum (heures)" name="leadTimeHours" type="number" defaultValue={availability?.leadTimeHours ?? 24} />
          </FormGrid>
          <p className="mt-4 border border-line bg-stone px-4 py-3 text-[11.5px] leading-relaxed text-muted">
            La confirmation automatique n&apos;est pas active dans cette version. Chaque demande reste en attente
            jusqu&apos;à validation manuelle depuis la fiche réservation.
          </p>
          <div className="mt-4">
            <span className="admin-label">Jours ouvrés</span>
            <div className="mt-2 flex flex-wrap gap-4">
              {DAYS.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-[12.5px] text-ink">
                  <input
                    type="checkbox"
                    name="workingDays"
                    value={day.value}
                    defaultChecked={workingDays.includes(day.value)}
                    className="h-3.5 w-3.5 accent-[#b08d57]"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        </AdminForm>
      </AdminPanel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Dates bloquées" description="Jours fériés, congés ou indisponibilités.">
          <AdminForm action={addBlockedDateAction} submitLabel="Bloquer une date" pendingLabel="Ajout…" compact>
            <FormGrid>
              <Field label="Date" name="date" type="date" required />
              <Field label="Motif" name="reason" placeholder="Congés, formation…" />
            </FormGrid>
          </AdminForm>
          {blockedDates.length ? (
            <ul className="mt-5 divide-y divide-line/70">
              {blockedDates.map((blocked) => (
                <li key={blocked.id} className="flex items-center justify-between gap-3 py-2.5 text-[12.5px]">
                  <div>
                    <p className="text-ink">{formatDateInput(blocked.date)}</p>
                    {blocked.reason && <p className="text-[10.5px] text-muted">{blocked.reason}</p>}
                  </div>
                  <form action={deleteBlockedDateAction}>
                    <input type="hidden" name="id" value={blocked.id} />
                    <ConfirmSubmit label="Débloquer" confirmMessage="Débloquer cette date ?" icon={false} />
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-[12px] text-muted">Aucune date bloquée.</p>
          )}
        </AdminPanel>

        <AdminPanel title="Services de réservation" description="Types de prestations proposés dans le formulaire public.">
          <AdminForm action={createBookingServiceAction} submitLabel="Ajouter un service" pendingLabel="Création…" compact>
            <FormGrid cols={2}>
              <Field label="Slug" name="slug" placeholder="photography" required />
              <Field label="Nom FR" name="nameFr" required />
              <Field label="Nom EN" name="nameEn" />
              <Field label="Durée (min)" name="durationMinutes" type="number" defaultValue={60} />
              <Field label="Prix à partir de" name="priceFrom" type="number" step="0.01" />
              <Field label="Ordre" name="sortOrder" type="number" defaultValue={0} />
            </FormGrid>
            <FormGrid>
              <Field label="Description FR" name="descriptionFr" />
              <Field label="Description EN" name="descriptionEn" />
            </FormGrid>
            <CheckboxField label="Service actif" name="active" defaultChecked />
          </AdminForm>

          {services.length ? (
            <div className="admin-table-wrap mt-5">
              <table className="admin-table min-w-[640px]">
                <caption className="sr-only">Services de réservation</caption>
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col">Durée</th>
                    <th scope="col">Prix</th>
                    <th scope="col">Actif</th>
                    <th scope="col" className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td data-label="Service">
                        <p className="text-ink">{service.nameFr}</p>
                        <p className="text-[10px] text-muted">{service.slug}</p>
                      </td>
                      <td data-label="Durée" className="text-muted">{service.durationMinutes} min</td>
                      <td data-label="Prix" className="text-muted">{service.priceFrom ? service.priceFrom.toString() : "—"}</td>
                      <td data-label="Actif" className="text-muted">{service.active ? "Oui" : "Non"}</td>
                      <td data-label="Actions" data-actions className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/admin/bookings/services/${service.id}`} className="link-quiet">Modifier</Link>
                          <form action={deleteBookingServiceAction}>
                            <input type="hidden" name="id" value={service.id} />
                            <ConfirmSubmit label="Supprimer" confirmMessage={`Supprimer le service « ${service.nameFr} » ?`} icon={false} />
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 text-[12px] text-muted">Aucun service.</p>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
