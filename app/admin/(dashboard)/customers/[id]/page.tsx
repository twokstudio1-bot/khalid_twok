import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, TextareaField } from "@/components/admin/Fields";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateCustomerAction } from "@/app/admin/actions/customers";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Fiche client CRM" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: { createdAt: "desc" }, take: 20, include: { service: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!customer || customer.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Activité"
        title={customer.name}
        description={`Fiche créée le ${formatDateTime(customer.createdAt)}.`}
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Client CRM mis à jour." />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <AdminPanel title="Réservations récentes">
            {customer.bookings.length ? (
              <ul className="divide-y divide-line/70">
                {customer.bookings.map((booking) => (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[12.5px]">
                    <div>
                      <Link href={`/admin/bookings/${booking.id}`} className="font-medium text-ink hover:text-champagne">{booking.reference}</Link>
                      <p className="text-[10.5px] text-muted">{booking.service?.nameFr ?? "—"} · {formatDateTime(booking.preferredDate)}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">Aucune réservation.</p>
            )}
          </AdminPanel>

          <AdminPanel title="Messages récents">
            {customer.messages.length ? (
              <ul className="divide-y divide-line/70">
                {customer.messages.map((message) => (
                  <li key={message.id} className="py-3 text-[12.5px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/admin/messages/${message.id}`} className="font-medium text-ink hover:text-champagne">
                        {message.name}
                      </Link>
                      <StatusBadge value={message.status} />
                    </div>
                    <p className="mt-1 text-[10.5px] text-muted">
                      {message.serviceType ?? "—"} · {formatDateTime(message.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11.5px] text-muted">{message.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">Aucun message.</p>
            )}
          </AdminPanel>
        </div>

        <AdminPanel title="Fiche client">
          <AdminForm action={updateCustomerAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" compact>
            <input type="hidden" name="id" value={customer.id} />
            <Field label="Nom" name="name" defaultValue={customer.name} required />
            <Field label="E-mail" name="email" defaultValue={customer.email} required />
            <Field label="Téléphone" name="phone" defaultValue={customer.phone} />
            <Field label="WhatsApp" name="whatsapp" defaultValue={customer.whatsapp} />
            <TextareaField label="Notes internes" name="notes" defaultValue={customer.notes} rows={6} />
          </AdminForm>
        </AdminPanel>
      </div>
    </div>
  );
}
