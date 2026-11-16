import type { Media, Page, PageTranslation } from "@prisma/client";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, FormSection, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SlugInput } from "@/components/admin/SlugInput";
import { createPageAction, updatePageAction } from "@/app/admin/actions/pages";
import { formatDateInput } from "@/lib/admin";
import { toMediaView } from "@/lib/admin-content";

type PageRecord = Page & { translations: (PageTranslation & { seoImage: Media | null })[]; coverMedia: Media | null };

export function PageForm({
  page,
  parents,
}: {
  page?: PageRecord | null;
  parents: { id: string; label: string; depth: number }[];
}) {
  const fr = page?.translations.find((row) => row.locale === "FR") ?? null;
  const en = page?.translations.find((row) => row.locale === "EN") ?? null;
  const isEdit = Boolean(page);

  return (
    <AdminForm
      action={isEdit ? updatePageAction : createPageAction}
      submitLabel={isEdit ? "Enregistrer la page" : "Créer la page"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/pages"
    >
      {page && <input type="hidden" name="id" value={page.id} />}

      <AdminPanel title="Paramètres" description="Hiérarchie, publication et présentation.">
        <div className="space-y-6">
          <FormGrid cols={3}>
            <SelectField label="Statut" name="status" defaultValue={page?.status ?? "DRAFT"} required>
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SCHEDULED">Programmé</option>
              <option value="ARCHIVED">Archivé</option>
            </SelectField>
            <SelectField label="Template" name="template" defaultValue={page?.template ?? "DEFAULT"}>
              <option value="DEFAULT">Par défaut</option>
              <option value="FULL_WIDTH">Pleine largeur</option>
              <option value="LANDING">Landing</option>
              <option value="SIDEBAR">Avec barre latérale</option>
            </SelectField>
            <Field label="Ordre" name="sortOrder" type="number" defaultValue={page?.sortOrder ?? 0} />
            <SelectField label="Page parente" name="parentId" defaultValue={page?.parentId ?? ""}>
              <option value="">Racine</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>{"— ".repeat(parent.depth)}{parent.label}</option>
              ))}
            </SelectField>
            <Field label="Publication programmée" name="publishedAt" type="datetime-local" defaultValue={formatDateInput(page?.publishedAt, true)} />
            <div className="flex items-end pb-2">
              <CheckboxField label="Afficher dans la navigation" name="showInNav" defaultChecked={page?.showInNav} />
            </div>
          </FormGrid>
          <MediaPicker name="coverMediaId" label="Image de couverture" kind="IMAGE" selected={page?.coverMedia ?? null} />
        </div>
      </AdminPanel>

      <AdminPanel title="Traductions" description="Contenu des deux langues.">
        <div className="space-y-8">
          <FormSection title="Français">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Titre" name="titleFr" id="page-title-fr" defaultValue={fr?.title} required />
                <SlugInput name="slugFr" sourceId="page-title-fr" defaultValue={fr?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Extrait" name="excerptFr" defaultValue={fr?.excerpt} rows={2} />
              <FormGrid>
                <Field label="Titre SEO" name="seoTitleFr" defaultValue={fr?.seoTitle} />
                <Field label="Description SEO" name="seoDescriptionFr" defaultValue={fr?.seoDescription} />
              </FormGrid>
              <MediaPicker name="seoImageFrId" label="Image de partage FR" kind="IMAGE" selected={toMediaView(fr?.seoImage ?? null)} />
            </div>
          </FormSection>
          <FormSection title="English">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Title" name="titleEn" id="page-title-en" defaultValue={en?.title} required />
                <SlugInput name="slugEn" sourceId="page-title-en" defaultValue={en?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Excerpt" name="excerptEn" defaultValue={en?.excerpt} rows={2} />
              <FormGrid>
                <Field label="SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
                <Field label="SEO description" name="seoDescriptionEn" defaultValue={en?.seoDescription} />
              </FormGrid>
              <MediaPicker name="seoImageEnId" label="Social image EN" kind="IMAGE" selected={toMediaView(en?.seoImage ?? null)} />
            </div>
          </FormSection>
        </div>
      </AdminPanel>
    </AdminForm>
  );
}
