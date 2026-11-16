import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, FormGrid, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { updateSeoSettingsAction, createRedirectAction, deleteRedirectAction } from "@/app/admin/actions/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "SEO & redirections" };
export const dynamic = "force-dynamic";

function LengthNote({ value, max }: { value: string | null | undefined; max: number }) {
  const length = value?.trim().length ?? 0;
  if (!length) return <span className="text-[10px] text-muted-light">Non défini</span>;
  const over = length > max;
  return (
    <span className={cn("text-[10px]", over ? "text-amber-800" : "text-muted")}>
      {length} / {max} caractères{over ? " · à raccourcir" : ""}
    </span>
  );
}

function SerpPreview({
  locale,
  title,
  description,
}: {
  locale: "FR" | "EN";
  title: string | null | undefined;
  description: string | null | undefined;
}) {
  const path = locale === "FR" ? "/fr" : "/en";
  const host = env.siteUrl.replace(/^https?:\/\//, "");
  const displayTitle = title?.trim();
  const displayDescription = description?.trim();
  return (
    <div className="border border-line bg-white p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center border border-line bg-cream font-serif text-[12px] text-ink">
          T
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] leading-tight text-ink">TWOK STUDIO</p>
          <p className="truncate text-[10px] leading-tight text-muted-light">
            {host}
            <span className="px-1 text-line">›</span>
            {path.replace("/", "")}
          </p>
        </div>
        <span className="ml-auto border border-line px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-muted">
          {locale}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 font-serif text-[19px] leading-snug text-ink underline decoration-line underline-offset-2">
        {displayTitle || (locale === "FR" ? "Titre global non défini" : "Global title not set")}
      </p>
      <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
        {displayDescription ||
          (locale === "FR"
            ? "Description globale non définie. Renseignez-la pour contrôler l'extrait affiché."
            : "Global description not set. Fill it in to control the displayed snippet.")}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-2">
        <LengthNote value={title} max={60} />
        <LengthNote value={description} max={160} />
      </div>
    </div>
  );
}

export default async function SeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.SEO_MANAGE);
  const search = await searchParams;
  const [seo, redirects] = await Promise.all([
    prisma.seoSetting.findUnique({ where: { id: 1 }, include: { defaultOgMedia: true } }),
    prisma.redirect.findMany({ orderBy: [{ locale: "asc" }, { fromPath: "asc" }] }),
  ]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Site"
        title="SEO & redirections."
        description="Métadonnées globales, aperçu des résultats de recherche, analytics et redirections par locale. Les aperçus reprennent les champs enregistrés : aucune valeur marketing n'est simulée."
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Réglages SEO enregistrés." />}
      {search.redirectCreated === "1" && <AdminNotice tone="success" title="Redirection créée." />}
      {search.redirectDeleted === "1" && <AdminNotice tone="success" title="Redirection supprimée." />}
      {typeof search.error === "string" && <AdminNotice tone="error" title={decodeURIComponent(search.error)} />}

      <AdminPanel
        title="Aperçu des résultats"
        description="Extrait indicatif pour les pages d'accueil FR et EN. Le titre et la description peuvent être remplacés page par page."
        className="mb-6"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <SerpPreview locale="FR" title={seo?.siteTitleFr} description={seo?.descriptionFr} />
          <SerpPreview locale="EN" title={seo?.siteTitleEn} description={seo?.descriptionEn} />
        </div>
        <p className="mt-4 text-[10.5px] leading-relaxed text-muted-light">
          Repères usuels : 60 caractères pour le titre, 160 pour la description. Ces seuils ne garantissent pas
          l&apos;affichage exact, qui dépend du moteur de recherche.
        </p>
      </AdminPanel>

      <AdminPanel
        title="Réglages SEO globaux"
        description="Titres, descriptions, mots-clés et services tiers."
        className="mb-6"
      >
        <AdminForm action={updateSeoSettingsAction} submitLabel="Enregistrer le SEO" pendingLabel="Enregistrement…" compact>
          <FormGrid cols={2}>
            <Field label="Titre du site FR" name="siteTitleFr" defaultValue={seo?.siteTitleFr} />
            <Field label="Titre du site EN" name="siteTitleEn" defaultValue={seo?.siteTitleEn} />
            <Field label="Modèle de titre" name="titleTemplate" defaultValue={seo?.titleTemplate} placeholder="%s · TWOK STUDIO" />
            <Field label="Identifiant Google Analytics" name="googleAnalyticsId" defaultValue={seo?.googleAnalyticsId} />
            <Field label="Code Search Console" name="searchConsoleCode" defaultValue={seo?.searchConsoleCode} />
            <Field label="Compte Twitter" name="twitterHandle" defaultValue={seo?.twitterHandle} />
          </FormGrid>
          <FormGrid>
            <TextareaField label="Description FR" name="descriptionFr" defaultValue={seo?.descriptionFr} rows={2} />
            <TextareaField label="Description EN" name="descriptionEn" defaultValue={seo?.descriptionEn} rows={2} />
            <Field label="Mots-clés FR" name="keywordsFr" defaultValue={seo?.keywordsFr} />
            <Field label="Mots-clés EN" name="keywordsEn" defaultValue={seo?.keywordsEn} />
          </FormGrid>
          <TextareaField label="Robots.txt supplémentaire" name="robotsExtra" defaultValue={seo?.robotsExtra} rows={4} mono />
          <MediaPicker name="defaultOgMediaId" label="Image Open Graph par défaut" kind="IMAGE" selected={seo?.defaultOgMedia ?? null} />
        </AdminForm>
      </AdminPanel>

      <AdminPanel
        title="Redirections"
        description="Redirections 301/302 par locale. Une source et une destination commencent par une barre oblique."
      >
        <AdminForm action={createRedirectAction} submitLabel="Ajouter une redirection" pendingLabel="Création…" compact>
          <FormGrid cols={3}>
            <SelectField label="Locale" name="locale" defaultValue="FR">
              <option value="FR">Français</option>
              <option value="EN">English</option>
            </SelectField>
            <Field label="Chemin source" name="fromPath" placeholder="/ancien-chemin" required />
            <Field label="Chemin destination" name="toPath" placeholder="/nouveau-chemin" required />
            <Field label="Code HTTP" name="statusCode" type="number" defaultValue={301} />
          </FormGrid>
        </AdminForm>

        {redirects.length ? (
          <div className="admin-table-wrap mt-5">
            <table className="admin-table min-w-[680px]">
              <caption className="sr-only">Redirections configurées</caption>
              <thead>
                <tr>
                  <th scope="col">Locale</th>
                  <th scope="col">Source</th>
                  <th scope="col">Destination</th>
                  <th scope="col">Code</th>
                  <th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {redirects.map((redirectRow) => (
                  <tr key={redirectRow.id}>
                    <td data-label="Locale" className="text-muted">{redirectRow.locale}</td>
                    <td data-label="Source" className="font-mono text-[11px] text-ink">{redirectRow.fromPath}</td>
                    <td data-label="Destination" className="font-mono text-[11px] text-muted">{redirectRow.toPath}</td>
                    <td data-label="Code" className="text-muted">{redirectRow.statusCode}</td>
                    <td data-label="Actions" data-actions className="text-right">
                      <form action={deleteRedirectAction}>
                        <input type="hidden" name="id" value={redirectRow.id} />
                        <ConfirmSubmit
                          label="Supprimer"
                          confirmMessage={`Supprimer la redirection ${redirectRow.fromPath} ?`}
                          icon={false}
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 text-[12px] text-muted">Aucune redirection configurée.</p>
        )}
      </AdminPanel>
    </div>
  );
}
