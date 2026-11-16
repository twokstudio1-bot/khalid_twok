import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field } from "@/components/admin/Fields";
import { updateContactPhoneAction } from "@/app/admin/actions/settings";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un numéro" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPhonePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();
  const phone = await prisma.contactPhone.findUnique({ where: { id } });
  if (!phone) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader eyebrow="Réglages" title={phone.label} description={`Dernière modification le ${formatDateTime(phone.updatedAt)}.`} />
      {search.phoneSaved === "1" && <AdminNotice tone="success" title="Numéro enregistré." />}
      <AdminForm action={updateContactPhoneAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" cancelHref="/admin/settings">
        <input type="hidden" name="id" value={phone.id} />
        <AdminPanel title="Numéro de téléphone">
          <div className="space-y-5">
            <Field label="Libellé" name="label" defaultValue={phone.label} required />
            <Field label="Numéro international" name="number" defaultValue={phone.number} required />
            <Field label="Ordre" name="displayOrder" type="number" defaultValue={phone.displayOrder} />
            <div className="flex flex-wrap gap-5">
              <CheckboxField label="Numéro principal" name="isPrimary" defaultChecked={phone.isPrimary} />
              <CheckboxField label="WhatsApp actif" name="whatsappEnabled" defaultChecked={phone.whatsappEnabled} />
              <CheckboxField label="Actif" name="active" defaultChecked={phone.active} />
            </div>
          </div>
        </AdminPanel>
      </AdminForm>
    </div>
  );
}
