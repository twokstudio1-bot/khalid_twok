import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, SelectField, TextareaField } from "@/components/admin/Fields";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { updateContactMessageAction } from "@/app/admin/actions/messages";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Détail du message" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.MESSAGES_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const message = await prisma.contactMessage.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!message) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        eyebrow="Activité"
        title={message.name}
        description={`Reçu le ${formatDateTime(message.createdAt)} · ${message.locale}.`}
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Message mis à jour." />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <AdminPanel title="Message" description="Demande reçue depuis le formulaire public.">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2">
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Nom</dt><dd className="mt-1 text-ink">{message.name}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">E-mail</dt><dd className="mt-1 text-ink">{message.email}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Téléphone</dt><dd className="mt-1 text-ink">{message.phone ?? "—"}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Service</dt><dd className="mt-1 text-ink">{message.serviceType ?? "—"}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Date souhaitée</dt><dd className="mt-1 text-ink">{message.preferredDate ? formatDateTime(message.preferredDate) : "—"}</dd></div>
            <div><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Page source</dt><dd className="mt-1 text-ink">{message.sourcePage ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Message</dt><dd className="mt-1 whitespace-pre-wrap text-ink">{message.message}</dd></div>
            {message.customer && <div className="sm:col-span-2"><dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Client CRM</dt><dd className="mt-1 text-ink">{message.customer.name} ({message.customer.email})</dd></div>}
          </dl>
        </AdminPanel>

        <AdminPanel title="Traitement">
          <AdminForm action={updateContactMessageAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" compact>
            <input type="hidden" name="id" value={message.id} />
            <SelectField label="Statut" name="status" defaultValue={message.status} required>
              <option value="NEW">Nouveau</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="RESOLVED">Résolu</option>
              <option value="ARCHIVED">Archivé</option>
            </SelectField>
            <TextareaField label="Notes internes" name="internalNotes" defaultValue={message.internalNotes} rows={6} />
          </AdminForm>
          <div className="mt-4">
            <StatusBadge value={message.status} />
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
