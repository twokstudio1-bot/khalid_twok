import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, SelectField, TextareaField } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { PageForm } from "@/components/admin/PageForm";
import { deletePageAction, createPageBlockAction, updatePageBlockAction, deletePageBlockAction } from "@/app/admin/actions/pages";
import { pageParentOptions } from "@/lib/admin-content";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier une page" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOCK_TYPES = [
  "HEADING", "RICH_TEXT", "IMAGE", "VIDEO", "IMAGE_GALLERY", "VIDEO_GALLERY", "MIXED_GALLERY",
  "TWO_COLUMNS", "FULL_WIDTH_IMAGE", "FULL_WIDTH_VIDEO", "PROJECT_CARDS", "CATEGORY_CARDS",
  "CLIENT_LOGOS", "BLOG_ARTICLES", "TESTIMONIALS", "CTA", "CONTACT_FORM", "BOOKING_FORM", "MAP",
  "SOCIAL_LINKS", "SPACER",
];

export default async function EditPagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [page, parents] = await Promise.all([
    prisma.page.findUnique({
      where: { id },
      include: {
        translations: { include: { seoImage: true } },
        coverMedia: true,
        blocks: { orderBy: { sortOrder: "asc" } },
      },
    }),
    pageParentOptions(id),
  ]);
  if (!page || page.deletedAt) notFound();

  const fr = page.translations.find((row) => row.locale === "FR");
  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Pages"
        title={fr?.title ?? "Page"}
        description={`Créée le ${formatDateTime(page.createdAt)} · Dernière modification le ${formatDateTime(page.updatedAt)}.`}
        actions={
          fr?.slug ? (
            <a href={`/fr/${fr.slug}`} target="_blank" rel="noreferrer" className="admin-btn-ghost">
              Voir sur le site <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Page créée. Ajoutez des blocs et publiez." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Page enregistrée." />}
      {search.blockCreated === "1" && <AdminNotice tone="success" title="Bloc ajouté." />}
      {search.blockSaved === "1" && <AdminNotice tone="success" title="Bloc enregistré." />}
      {search.blockDeleted === "1" && <AdminNotice tone="success" title="Bloc supprimé." />}
      {error && <AdminNotice tone="error" title="Action impossible.">{error}</AdminNotice>}

      <PageForm page={page} parents={parents} />

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">Blocs de la page</h2>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">{page.blocks.length} bloc(s)</span>
        </div>

        {page.blocks.map((block) => (
          <AdminPanel
            key={block.id}
            title={`${block.type} · ordre ${block.sortOrder}`}
            description={block.enabled ? "Bloc actif." : "Bloc désactivé."}
            actions={
              <form action={deletePageBlockAction}>
                <input type="hidden" name="id" value={block.id} />
                <input type="hidden" name="pageId" value={page.id} />
                <ConfirmSubmit label="Supprimer" confirmMessage={`Supprimer le bloc ${block.type} ?`} icon={false} />
              </form>
            }
          >
            <AdminForm action={updatePageBlockAction} submitLabel="Enregistrer le bloc" pendingLabel="Enregistrement…" compact>
              <input type="hidden" name="id" value={block.id} />
              <input type="hidden" name="pageId" value={page.id} />
              <FormGrid cols={3}>
                <SelectField label="Type" name="type" defaultValue={block.type}>
                  {BLOCK_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </SelectField>
                <Field label="Ordre" name="sortOrder" type="number" defaultValue={block.sortOrder} />
                <div className="flex items-end pb-2">
                  <CheckboxField label="Bloc actif" name="enabled" defaultChecked={block.enabled} />
                </div>
              </FormGrid>
              <TextareaField
                label="Réglages (JSON)"
                name="settings"
                defaultValue={JSON.stringify(block.settings ?? {}, null, 2)}
                rows={10}
                mono
              />
            </AdminForm>
          </AdminPanel>
        ))}

        <AdminPanel title="Ajouter un bloc" description="Les réglages sont en JSON. Consultez le code public pour les clés attendues.">
          <AdminForm action={createPageBlockAction} submitLabel="Ajouter le bloc" pendingLabel="Création…" compact>
            <input type="hidden" name="pageId" value={page.id} />
            <FormGrid cols={3}>
              <SelectField label="Type" name="type" defaultValue="HEADING">
                {BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </SelectField>
              <Field label="Ordre" name="sortOrder" type="number" defaultValue={page.blocks.length + 1} />
              <div className="flex items-end pb-2">
                <CheckboxField label="Bloc actif" name="enabled" defaultChecked />
              </div>
            </FormGrid>
            <TextareaField label="Réglages (JSON)" name="settings" defaultValue="{}" rows={8} mono />
          </AdminForm>
        </AdminPanel>
      </div>

      <section className="admin-card mt-8 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Archiver la page</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          La page quitte le site public. Les blocs et traductions sont conservés.
        </p>
        <form action={deletePageAction} className="mt-4">
          <input type="hidden" name="id" value={page.id} />
          <ConfirmSubmit
            label="Archiver cette page"
            confirmMessage={`Archiver « ${fr?.title ?? page.id} » ?`}
          />
        </form>
      </section>
    </div>
  );
}
