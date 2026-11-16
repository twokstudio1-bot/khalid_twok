import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid } from "@/components/admin/Fields";
import { updateBookingServiceAction } from "@/app/admin/actions/bookings";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un service de réservation" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditBookingServicePage({
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

  const service = await prisma.bookingService.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader
        eyebrow="Activité"
        title={service.nameFr}
        description={`Dernière modification le ${formatDateTime(service.updatedAt)}.`}
      />
      {search.serviceSaved === "1" && <AdminNotice tone="success" title="Service enregistré." />}
      <AdminForm action={updateBookingServiceAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" cancelHref="/admin/bookings/settings">
        <input type="hidden" name="id" value={service.id} />
        <AdminPanel title="Service de réservation">
          <div className="space-y-5">
            <FormGrid cols={2}>
              <Field label="Slug" name="slug" defaultValue={service.slug} required />
              <Field label="Nom FR" name="nameFr" defaultValue={service.nameFr} required />
              <Field label="Nom EN" name="nameEn" defaultValue={service.nameEn} />
              <Field label="Durée (min)" name="durationMinutes" type="number" defaultValue={service.durationMinutes} />
              <Field label="Prix à partir de" name="priceFrom" type="number" step="0.01" defaultValue={service.priceFrom ? service.priceFrom.toString() : ""} />
              <Field label="Ordre" name="sortOrder" type="number" defaultValue={service.sortOrder} />
            </FormGrid>
            <FormGrid>
              <Field label="Description FR" name="descriptionFr" defaultValue={service.descriptionFr} />
              <Field label="Description EN" name="descriptionEn" defaultValue={service.descriptionEn} />
            </FormGrid>
            <CheckboxField label="Service actif" name="active" defaultChecked={service.active} />
          </div>
        </AdminPanel>
      </AdminForm>
    </div>
  );
}
