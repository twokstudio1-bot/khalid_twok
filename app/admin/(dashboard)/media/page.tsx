import type { Metadata } from "next";
import Link from "next/link";
import { ImageIcon, Plus, Video } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminForm } from "@/components/admin/AdminForm";
import { Field } from "@/components/admin/Fields";
import { uploadMediaAction } from "@/app/admin/actions/media";

export const metadata: Metadata = { title: "Médiathèque" };
export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.MEDIA_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const kind: "IMAGE" | "VIDEO" | undefined =
    search.kind === "IMAGE" || search.kind === "VIDEO" ? search.kind : undefined;
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where = {
    deletedAt: null,
    ...(kind ? { kind } : {}),
    ...(q
      ? {
          OR: [
            { originalName: { contains: q, mode: "insensitive" as const } },
            { altFr: { contains: q, mode: "insensitive" as const } },
            { altEn: { contains: q, mode: "insensitive" as const } },
            { folder: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.media.count({ where }),
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (kind) params.set("kind", kind);
    if (targetPage > 1) params.set("page", String(targetPage));
    const suffix = params.toString();
    return `/admin/media${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Médias"
        title="Médiathèque."
        description={`Importez, documentez et réutilisez les images et vidéos. Stockage actif : ${env.mediaDriver === "s3" ? "S3" : "local"} · ${total} média(s).`}
        actions={<a href="#upload" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Importer</a>}
      />

      {search.updated === "1" && <AdminNotice tone="success" title="Métadonnées enregistrées." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Média supprimé." />}

      <section id="upload" className="admin-card mb-6 p-5 sm:p-6">
        <div className="mb-4">
          <p className="eyebrow-gold">Import</p>
          <h2 className="mt-1 font-serif text-2xl text-ink">Ajouter un média</h2>
          <p className="mt-1 text-[12px] text-muted">
            Formats : JPEG, PNG, WebP, AVIF, MP4, WebM. Taille maximale : {env.maxUploadMb} Mo. Le type réel est vérifié côté serveur.
          </p>
        </div>
        <AdminForm action={uploadMediaAction} submitLabel="Importer le fichier" pendingLabel="Import…" encType="multipart/form-data" compact>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block sm:col-span-2 lg:col-span-1">
              <span className="admin-label">Fichier <span className="text-champagne">*</span></span>
              <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" className="admin-input file:mr-3 file:border-0 file:bg-stone file:px-2 file:py-1 file:text-[11px]" />
            </label>
            <Field label="Texte alternatif FR" name="altFr" help="Décrivez l'image pour l'accessibilité et le SEO." />
            <Field label="Texte alternatif EN" name="altEn" />
            <Field label="Dossier" name="folder" placeholder="2026/11" />
          </div>
        </AdminForm>
      </section>

      <form method="get" action="/admin/media" className="mb-5 flex flex-wrap items-end gap-3 border border-line bg-white px-4 py-3">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Nom, alt, dossier…" className="admin-input" />
        </label>
        <label>
          <span className="admin-label">Type</span>
          <select name="kind" defaultValue={kind ?? ""} className="admin-input">
            <option value="">Tous</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Vidéos</option>
          </select>
        </label>
        <button type="submit" className="admin-btn">Filtrer</button>
        {(q || kind) && <Link href="/admin/media" className="pb-2 text-[11px] text-muted hover:text-ink">Réinitialiser</Link>}
      </form>

      {items.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {items.map((media) => (
            <Link key={media.id} href={`/admin/media/${media.id}`} className="group border border-line bg-white p-2 transition-colors hover:border-champagne">
              <div className="relative aspect-square overflow-hidden bg-stone">
                {media.thumbnailUrl || media.kind === "IMAGE" ? (
                  <img src={media.thumbnailUrl ?? media.url} alt={media.altFr ?? ""} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <span className="flex h-full items-center justify-center"><Video aria-hidden className="h-6 w-6 text-muted"  /></span>
                )}
                <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 bg-ink/75 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.12em] text-cream">
                  {media.kind === "IMAGE" ? <ImageIcon aria-hidden className="h-2.5 w-2.5"  /> : <Video aria-hidden className="h-2.5 w-2.5"  />}
                  {media.kind}
                </span>
              </div>
              <p className="mt-2 truncate text-[11px] text-ink">{media.originalName}</p>
              <p className="text-[9.5px] text-muted-light">{formatDate(media.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="admin-card p-10 text-center">
          <p className="font-serif text-2xl text-ink">Aucun média.</p>
          <p className="mt-2 text-[12px] text-muted">Importez un premier fichier ou modifiez les filtres.</p>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
