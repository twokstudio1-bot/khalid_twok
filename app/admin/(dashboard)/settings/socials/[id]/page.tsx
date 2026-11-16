import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field } from "@/components/admin/Fields";
import { updateSocialLinkAction } from "@/app/admin/actions/settings";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un réseau social" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditSocialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>; }) {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();
  const link = await prisma.socialLink.findUnique({ where: { id } });
  if (!link) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader eyebrow="Réglages" title={link.platform} description={`Dernière modification le ${formatDateTime(link.updatedAt)}.`} />
      {search.socialSaved === "1" && <AdminNotice tone="success" title="Réseau social enregistré." />}
      <AdminForm action={updateSocialLinkAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" cancelHref="/admin/settings">
        <input type="hidden" name="id" value={link.id} />
        <AdminPanel title="Réseau social">
          <div className="space-y-5">
            <Field label="Plateforme" name="platform" defaultValue={link.platform} required />
            <Field label="URL" name="url" defaultValue={link.url} required />
            <Field label="Libellé" name="label" defaultValue={link.label} />
            <Field label="Nom d'utilisateur" name="username" defaultValue={link.username} />
            <Field label="Icône" name="icon" defaultValue={link.icon} />
            <Field label="Ordre" name="sortOrder" type="number" defaultValue={link.sortOrder} />
            <div className="flex flex-wrap gap-5">
              <CheckboxField label="Actif" name="active" defaultChecked={link.active} />
              <CheckboxField label="Afficher dans l'en-tête" name="showHeader" defaultChecked={link.showHeader} />
              <CheckboxField label="Afficher dans le pied de page" name="showFooter" defaultChecked={link.showFooter} />
            </div>
          </div>
        </AdminPanel>
      </AdminForm>
    </div>
  );
}
