import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  createHomepageSectionAction,
  deleteHomepageSectionAction,
  updateHomepageSectionAction,
  updateHomepageSettingsAction,
} from "@/app/admin/actions/homepage";

export const metadata: Metadata = { title: "Accueil" };
export const dynamic = "force-dynamic";

const SECTION_TYPES = [
  "HERO", "INTRO", "FEATURED_PHOTOS", "FEATURED_VIDEO", "SERVICES", "FEATURED_PROJECTS",
  "BEHIND_THE_SCENES", "CLIENTS", "BLOG_HIGHLIGHTS", "CTA",
];

export default async function HomepagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.HOMEPAGE_MANAGE);
  const search = await searchParams;
  const [settings, sections] = await Promise.all([
    prisma.homepageSetting.findUnique({ where: { id: 1 }, include: { ogImage: true } }),
    prisma.homepageSection.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Page d'accueil."
        description="Réglages généraux et sections de la homepage. Les sections sont rendues dans l'ordre indiqué."
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Réglages enregistrés." />}
      {search.created === "1" && <AdminNotice tone="success" title="Section créée." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Section supprimée." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Section introuvable." />}

      <AdminPanel title="Réglages de la page d'accueil" description="Titre, description et image de partage par défaut.">
        <AdminForm action={updateHomepageSettingsAction} submitLabel="Enregistrer les réglages" pendingLabel="Enregistrement…" compact>
          <FormGrid>
            <Field label="Titre FR" name="titleFr" defaultValue={settings?.titleFr} />
            <Field label="Titre EN" name="titleEn" defaultValue={settings?.titleEn} />
            <Field label="Description FR" name="descriptionFr" defaultValue={settings?.descriptionFr} />
            <Field label="Description EN" name="descriptionEn" defaultValue={settings?.descriptionEn} />
          </FormGrid>
          <MediaPicker name="ogImageId" label="Image de partage (Open Graph)" kind="IMAGE" selected={settings?.ogImage ?? null} />
        </AdminForm>
      </AdminPanel>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">Sections</h2>
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted">{sections.length} section(s)</span>
        </div>

        {sections.map((section) => (
          <AdminPanel
            key={section.id}
            title={`${section.type} · ordre ${section.sortOrder}`}
            description={section.enabled ? "Section active sur le site." : "Section désactivée."}
            actions={
              <form action={deleteHomepageSectionAction}>
                <input type="hidden" name="id" value={section.id} />
                <ConfirmSubmit label="Supprimer" confirmMessage={`Supprimer la section ${section.type} ?`} icon={false} />
              </form>
            }
          >
            <AdminForm action={updateHomepageSectionAction} submitLabel="Enregistrer la section" pendingLabel="Enregistrement…" compact>
              <input type="hidden" name="id" value={section.id} />
              <FormGrid cols={3}>
                <SelectField label="Type" name="type" defaultValue={section.type}>
                  {SECTION_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </SelectField>
                <Field label="Ordre" name="sortOrder" type="number" defaultValue={section.sortOrder} />
                <div className="flex items-end pb-2">
                  <CheckboxField label="Section active" name="enabled" defaultChecked={section.enabled} />
                </div>
              </FormGrid>
              <TextareaField
                label="Réglages (JSON)"
                name="settings"
                defaultValue={JSON.stringify(section.settings ?? {}, null, 2)}
                rows={12}
                mono
                help="Modifiez les clés attendues par le bloc public. Les valeurs localisées utilisent les suffixes Fr et En."
              />
            </AdminForm>
          </AdminPanel>
        ))}

        <AdminPanel title="Ajouter une section" description="Créez une nouvelle section et configurez ses réglages en JSON.">
          <AdminForm action={createHomepageSectionAction} submitLabel="Ajouter la section" pendingLabel="Création…" compact>
            <FormGrid cols={3}>
              <SelectField label="Type" name="type" defaultValue="HERO">
                {SECTION_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </SelectField>
              <Field label="Ordre" name="sortOrder" type="number" defaultValue={sections.length + 1} />
              <div className="flex items-end pb-2">
                <CheckboxField label="Active" name="enabled" defaultChecked />
              </div>
            </FormGrid>
            <TextareaField
              label="Réglages (JSON)"
              name="settings"
              defaultValue="{}"
              rows={8}
              mono
              help={'Exemple : {"titleFr":"Titre","titleEn":"Title","projectIds":["..."]}' }
            />
          </AdminForm>
        </AdminPanel>
      </div>
    </div>
  );
}
