import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Film, ImageIcon } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field, FormGrid, TextareaField } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deleteMediaAction, updateMediaAction } from "@/app/admin/actions/media";

export const metadata: Metadata = { title: "Média" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${bytes} o`;
}

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.MEDIA_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const media = await prisma.media.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      references: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!media) notFound();

  const usageByType = media.references.reduce<Record<string, number>>((acc, reference) => {
    acc[reference.entityType] = (acc[reference.entityType] ?? 0) + 1;
    return acc;
  }, {});
  const usageCount = media.references.length;
  const errorMessage = typeof search.error === "string" ? search.error : null;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Médiathèque"
        title={media.originalName}
        description={`Importé le ${formatDateTime(media.createdAt)}${media.uploadedBy ? ` par ${media.uploadedBy.name}` : ""}.`}
        actions={
          <Link href="/admin/media" className="admin-btn-ghost">
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Médiathèque
          </Link>
        }
      />

      {search.uploaded === "1" && <AdminNotice tone="success" title="Média importé. Complétez ses métadonnées ci-dessous." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Métadonnées enregistrées." />}
      {errorMessage && <AdminNotice tone="error" title="Suppression impossible.">{errorMessage}</AdminNotice>}
      {usageCount > 0 && (
        <AdminNotice tone="warning" title={`Ce média est utilisé ${usageCount} fois.`}>
          Retirez-le de ses contenus avant de le supprimer. Les références sont listées en bas de page.
        </AdminNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <section className="admin-card overflow-hidden">
            <div className="relative flex min-h-[280px] items-center justify-center bg-ink/95 p-4">
              {media.kind === "IMAGE" ? (
                <img
                  src={media.url}
                  alt={media.altFr ?? ""}
                  className="max-h-[560px] w-auto max-w-full object-contain"
                />
              ) : (
                <video
                  src={media.url}
                  poster={media.posterUrl ?? media.thumbnailUrl ?? undefined}
                  controls
                  preload="metadata"
                  className="max-h-[560px] w-full bg-ink"
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge value={media.kind} />
                <span className="text-[11px] text-muted">{media.mimeType}</span>
              </div>
              <a
                href={media.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-ink hover:text-champagne"
              >
                <ExternalLink aria-hidden className="h-3.5 w-3.5" /> Ouvrir le fichier
              </a>
            </div>
          </section>

          <section className="admin-card">
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <h2 className="font-serif text-2xl text-ink">Informations du fichier</h2>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 text-[12.5px] sm:grid-cols-2 sm:px-6">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Nom d&apos;origine</dt>
                <dd className="mt-1 break-all text-ink">{media.originalName}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Dossier</dt>
                <dd className="mt-1 text-ink">{media.folder ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Dimensions</dt>
                <dd className="mt-1 text-ink">{media.width && media.height ? `${media.width} × ${media.height} px` : "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Poids</dt>
                <dd className="mt-1 text-ink">{formatBytes(media.sizeBytes)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Identifiant de stockage</dt>
                <dd className="mt-1 break-all font-mono text-[11px] text-muted">{media.storageKey}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Dernière modification</dt>
                <dd className="mt-1 text-ink">{formatDateTime(media.updatedAt)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">URL publique</dt>
                <dd className="mt-1 break-all font-mono text-[11px] text-muted">{media.url}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-card">
            <div className="border-b border-line px-5 py-4 sm:px-6">
              <h2 className="font-serif text-2xl text-ink">Utilisation</h2>
              <p className="mt-1 text-[12px] text-muted">
                {usageCount === 0
                  ? "Aucun contenu ne référence ce média pour le moment."
                  : Object.entries(usageByType).map(([type, count]) => `${count} × ${type}`).join(" · ")}
              </p>
            </div>
            {usageCount === 0 ? (
              <p className="px-5 py-6 text-[12.5px] text-muted sm:px-6">Suppression possible sans impact sur les contenus.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {media.references.map((reference) => (
                  <li key={reference.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-[12px] sm:px-6">
                    <span className="font-medium text-ink">{reference.entityType}</span>
                    <span className="break-all font-mono text-[10.5px] text-muted">{reference.entityId}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="admin-card p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              {media.kind === "IMAGE" ? <ImageIcon aria-hidden className="h-4 w-4 text-champagne" /> : <Film aria-hidden className="h-4 w-4 text-champagne" />}
              <h2 className="font-serif text-2xl text-ink">Métadonnées</h2>
            </div>
            <AdminForm action={updateMediaAction} submitLabel="Enregistrer" pendingLabel="Enregistrement…" compact>
              <input type="hidden" name="id" value={media.id} />
              <FormGrid>
                <Field label="Texte alternatif FR" name="altFr" defaultValue={media.altFr} help="Décrit l'image pour l'accessibilité et le référencement." />
                <Field label="Texte alternatif EN" name="altEn" defaultValue={media.altEn} />
              </FormGrid>
              <TextareaField label="Légende FR" name="captionFr" defaultValue={media.captionFr} rows={2} />
              <TextareaField label="Légende EN" name="captionEn" defaultValue={media.captionEn} rows={2} />
              <Field label="Dossier" name="folder" defaultValue={media.folder} placeholder="2026/11" help="Sert uniquement à organiser la médiathèque." />
            </AdminForm>
          </section>

          <section className="admin-card border-red-200 p-5 sm:p-6">
            <h2 className="font-serif text-2xl text-ink">Supprimer le média</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Le fichier et sa miniature seront retirés du stockage. Cette action est définitive et journalisée.
            </p>
            {usageCount > 0 ? (
              <p className="mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
                Suppression bloquée : {usageCount} référence(s) active(s). Détachez d&apos;abord ce média.
              </p>
            ) : (
              <form action={deleteMediaAction} className="mt-4">
                <input type="hidden" name="id" value={media.id} />
                <ConfirmSubmit
                  label="Supprimer définitivement"
                  confirmMessage={`Supprimer « ${media.originalName} » ? Cette action est définitive.`}
                />
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
