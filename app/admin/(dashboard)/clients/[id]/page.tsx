import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ClientForm } from "@/components/admin/ClientForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteClientAction } from "@/app/admin/actions/clients";
import { formatDateTime } from "@/lib/admin";
import { safeExternalUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Modifier un client" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CLIENTS_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [client, projects] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: { translations: true, logoMedia: true, projectLinks: true },
    }),
    prisma.project.findMany({
      where: { deletedAt: null },
      include: { translations: { where: { locale: "FR" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!client || client.deletedAt) notFound();

  const error = typeof search.error === "string" ? search.error : null;
  const websiteUrl = safeExternalUrl(client.websiteUrl);

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Clients"
        title={client.name}
        description={`Créé le ${formatDateTime(client.createdAt)} · Dernière modification le ${formatDateTime(client.updatedAt)}.`}
        actions={
          websiteUrl ? (
            <a href={websiteUrl} target="_blank" rel="noreferrer" className="admin-btn-ghost">
              Site web <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : client.websiteUrl ? (
            <span className="admin-btn-ghost cursor-not-allowed opacity-60" title="URL invalide ou non http(s)">
              Site web non valide
            </span>
          ) : null
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Client créé. Ajoutez le logo et les traductions." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Client enregistré." />}
      {error && <AdminNotice tone="error" title="Action impossible.">{error}</AdminNotice>}

      <ClientForm
        client={client}
        projects={projects.filter((project) => project.translations[0]?.title).map((project) => ({ id: project.id, title: project.translations[0].title }))}
        selectedProjectIds={client.projectLinks.map((row) => row.projectId)}
      />

      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Archiver le client</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          Le client quitte le site public. Ses projets associés restent disponibles.
        </p>
        <form action={deleteClientAction} className="mt-4">
          <input type="hidden" name="id" value={client.id} />
          <ConfirmSubmit
            label="Archiver ce client"
            confirmMessage={`Archiver « ${client.name} » ?`}
          />
        </form>
      </section>
    </div>
  );
}
