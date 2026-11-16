import Link from "next/link";
import type { Category, CategoryTranslation, Media } from "@prisma/client";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, FormSection, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SlugInput } from "@/components/admin/SlugInput";
import { createCategoryAction, updateCategoryAction } from "@/app/admin/actions/categories";
import { formatDateInput } from "@/lib/admin";

type CategoryRecord = Category & {
  translations: CategoryTranslation[];
  coverMedia: Media | null;
};

export function CategoryForm({
  category,
  parents,
  defaultService = "PHOTO",
}: {
  category?: CategoryRecord | null;
  parents: { id: string; label: string; depth: number }[];
  defaultService?: string;
}) {
  const fr = category?.translations.find((row) => row.locale === "FR") ?? null;
  const en = category?.translations.find((row) => row.locale === "EN") ?? null;
  const isEdit = Boolean(category);

  return (
    <AdminForm
      action={isEdit ? updateCategoryAction : createCategoryAction}
      submitLabel={isEdit ? "Enregistrer les modifications" : "Créer la catégorie"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/categories"
    >
      {category && <input type="hidden" name="id" value={category.id} />}

      <AdminPanel title="Paramètres" description="Rattachement, publication et présentation de la catégorie.">
        <div className="space-y-6">
          <FormGrid cols={3}>
            <SelectField label="Service" name="service" defaultValue={category?.service ?? defaultService} required>
              <option value="PHOTO">Photo</option>
              <option value="VIDEO">Vidéo</option>
              <option value="DRONE">Drone</option>
            </SelectField>
            <SelectField label="Catégorie parente" name="parentId" defaultValue={category?.parentId ?? ""} help="Hiérarchie illimitée.">
              <option value="">Aucune (racine)</option>
              {parents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {"— ".repeat(parent.depth)}
                  {parent.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Statut" name="status" defaultValue={category?.status ?? "DRAFT"} required>
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SCHEDULED">Programmé</option>
              <option value="ARCHIVED">Archivé</option>
            </SelectField>
            <Field label="Ordre d'affichage" name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} />
            <Field
              label="Publication programmée"
              name="publishedAt"
              type="datetime-local"
              defaultValue={formatDateInput(category?.publishedAt, true)}
              help="Utilisé lorsque le statut est « Programmé »."
            />
            <SelectField label="Disposition de galerie" name="galleryLayout" defaultValue={category?.galleryLayout ?? "GRID"}>
              <option value="GRID">Grille</option>
              <option value="MASONRY">Mosaïque</option>
              <option value="SLIDER">Diaporama</option>
              <option value="FULLWIDTH">Pleine largeur</option>
              <option value="EDITORIAL">Éditorial</option>
            </SelectField>
          </FormGrid>
          <div className="grid gap-5 sm:grid-cols-2">
            <MediaPicker
              name="coverMediaId"
              label="Image de couverture"
              kind="IMAGE"
              selected={category?.coverMedia ?? null}
              help="Affichée dans les cartes de catégorie et les listes."
            />
            <div className="pt-1">
              <CheckboxField
                label="Catégorie mise en avant"
                name="featured"
                defaultChecked={category?.featured}
                help="Peut être utilisée par les sections d'accueil."
              />
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Traductions"
        description="Le français est la langue par défaut. Les deux langues sont nécessaires pour la publication."
        actions={
          <Link href="/admin/categories" className="text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink">
            Toutes les catégories
          </Link>
        }
      >
        <div className="space-y-8">
          <FormSection title="Français">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Nom" name="nameFr" id="category-name-fr" defaultValue={fr?.name} required />
                <SlugInput name="slugFr" sourceId="category-name-fr" defaultValue={fr?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Description" name="descriptionFr" defaultValue={fr?.description} rows={3} />
              <FormGrid>
                <Field label="Titre SEO" name="seoTitleFr" defaultValue={fr?.seoTitle} />
                <Field label="Description SEO" name="seoDescriptionFr" defaultValue={fr?.seoDescription} />
              </FormGrid>
            </div>
          </FormSection>
          <FormSection title="English">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Name" name="nameEn" id="category-name-en" defaultValue={en?.name} required />
                <SlugInput name="slugEn" sourceId="category-name-en" defaultValue={en?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Description" name="descriptionEn" defaultValue={en?.description} rows={3} />
              <FormGrid>
                <Field label="SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
                <Field label="SEO description" name="seoDescriptionEn" defaultValue={en?.seoDescription} />
              </FormGrid>
            </div>
          </FormSection>
        </div>
      </AdminPanel>
    </AdminForm>
  );
}
