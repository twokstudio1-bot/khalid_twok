import type { Media, Project, ProjectTranslation } from "@prisma/client";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, FormSection, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { MediaMultiPicker } from "@/components/admin/MediaMultiPicker";
import { SlugInput } from "@/components/admin/SlugInput";
import { createProjectAction, updateProjectAction } from "@/app/admin/actions/projects";
import { formatDateInput } from "@/lib/admin";
import { toMediaView } from "@/lib/admin-content";
import type { AdminMediaView } from "@/lib/media-view";

type ProjectRecord = Project & {
  translations: (ProjectTranslation & { seoImage: Media | null })[];
  coverMedia: Media | null;
};

const SERVICE_LABEL: Record<string, string> = { PHOTO: "Photo", VIDEO: "Vidéo", DRONE: "Drone" };

export function ProjectForm({
  project,
  categories,
  clients,
  relatedProjects,
  selectedCategoryIds = [],
  galleryMedia = [],
  selectedRelatedIds = [],
}: {
  project?: ProjectRecord | null;
  categories: { id: string; name: string; service: string }[];
  clients: { id: string; name: string }[];
  relatedProjects: { id: string; title: string }[];
  selectedCategoryIds?: string[];
  galleryMedia?: AdminMediaView[];
  selectedRelatedIds?: string[];
}) {
  const fr = project?.translations.find((row) => row.locale === "FR") ?? null;
  const en = project?.translations.find((row) => row.locale === "EN") ?? null;
  const isEdit = Boolean(project);
  const grouped = categories.reduce<Record<string, typeof categories>>((acc, category) => {
    acc[category.service] = acc[category.service] ?? [];
    acc[category.service].push(category);
    return acc;
  }, {});

  return (
    <AdminForm
      action={isEdit ? updateProjectAction : createProjectAction}
      submitLabel={isEdit ? "Enregistrer le projet" : "Créer le projet"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/projects"
    >
      {project && <input type="hidden" name="id" value={project.id} />}

      <AdminPanel title="Paramètres du projet" description="Classification, publication, couverture et galerie.">
        <div className="space-y-6">
          <FormGrid cols={3}>
            <SelectField label="Statut" name="status" defaultValue={project?.status ?? "DRAFT"} required>
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SCHEDULED">Programmé</option>
              <option value="ARCHIVED">Archivé</option>
            </SelectField>
            <Field
              label="Publication programmée"
              name="publishedAt"
              type="datetime-local"
              defaultValue={formatDateInput(project?.publishedAt, true)}
              help="Utilisé si le statut est « Programmé »."
            />
            <Field label="Ordre d'affichage" name="sortOrder" type="number" defaultValue={project?.sortOrder ?? 0} />
            <Field label="Type de projet" name="projectType" defaultValue={project?.projectType} placeholder="Mariage, campagne, film de marque…" />
            <Field label="Lieu" name="location" defaultValue={project?.location} placeholder="Marrakech, Maroc" />
            <Field label="Date du projet" name="projectDate" type="date" defaultValue={formatDateInput(project?.projectDate)} />
            <SelectField label="Client" name="clientId" defaultValue={project?.clientId ?? ""}>
              <option value="">Aucun client associé</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </SelectField>
            <SelectField label="Disposition de galerie" name="galleryLayout" defaultValue={project?.galleryLayout ?? "GRID"}>
              <option value="GRID">Grille</option>
              <option value="MASONRY">Mosaïque</option>
              <option value="SLIDER">Diaporama</option>
              <option value="FULLWIDTH">Pleine largeur</option>
              <option value="EDITORIAL">Éditorial</option>
            </SelectField>
            <div className="flex items-end pb-2">
              <CheckboxField label="Projet mis en avant" name="featured" defaultChecked={project?.featured} />
            </div>
          </FormGrid>

          <div className="grid gap-5 sm:grid-cols-2">
            <MediaPicker
              name="coverMediaId"
              label="Image de couverture"
              kind="IMAGE"
              selected={project?.coverMedia ?? null}
              help="Utilisée dans les listes, cartes et partages."
            />
            <div>
              <span className="admin-label">Catégories</span>
              {categories.length ? (
                <div className="max-h-56 space-y-3 overflow-y-auto border border-line bg-white px-3 py-2.5">
                  {Object.entries(grouped).map(([service, rows]) => (
                    <div key={service}>
                      <p className="mb-1 text-[9px] uppercase tracking-[0.16em] text-muted">{SERVICE_LABEL[service] ?? service}</p>
                      {rows.map((category) => (
                        <label key={category.id} className="flex items-center gap-2 py-0.5 text-[12px] text-ink">
                          <input
                            type="checkbox"
                            name="categoryIds"
                            value={category.id}
                            defaultChecked={selectedCategoryIds.includes(category.id)}
                            className="h-3.5 w-3.5 accent-[#b08d57]"
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border border-dashed border-line bg-white px-4 py-5 text-[11px] text-muted">
                  Aucune catégorie. Créez-en une depuis le menu Catégories.
                </p>
              )}
            </div>
          </div>

          <MediaMultiPicker
            name="mediaIds"
            label="Galerie du projet"
            initial={galleryMedia}
            help="L'ordre de sélection est l'ordre d'affichage. Images et vidéos acceptées."
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Traductions" description="Contenu éditorial du projet dans les deux langues.">
        <div className="space-y-8">
          <FormSection title="Français">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Titre" name="titleFr" id="project-title-fr" defaultValue={fr?.title} required />
                <SlugInput name="slugFr" sourceId="project-title-fr" defaultValue={fr?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Résumé" name="summaryFr" defaultValue={fr?.summary} rows={2} help="Quelques lignes affichées dans les cartes et listes." />
              <TextareaField label="Description" name="descriptionFr" defaultValue={fr?.description} rows={8} mono help="Markdown pris en charge : titres, listes, liens, citations." />
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
                <Field label="Title" name="titleEn" id="project-title-en" defaultValue={en?.title} required />
                <SlugInput name="slugEn" sourceId="project-title-en" defaultValue={en?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Summary" name="summaryEn" defaultValue={en?.summary} rows={2} />
              <TextareaField label="Description" name="descriptionEn" defaultValue={en?.description} rows={8} mono />
              <FormGrid>
                <Field label="SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
                <Field label="SEO description" name="seoDescriptionEn" defaultValue={en?.seoDescription} />
              </FormGrid>
              <MediaPicker name="seoImageEnId" label="Social image EN" kind="IMAGE" selected={toMediaView(en?.seoImage ?? null)} />
            </div>
          </FormSection>
        </div>
      </AdminPanel>

      <AdminPanel title="Projets liés" description="Sélectionnez des projets à suggérer en fin de page.">
        {relatedProjects.length ? (
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProjects.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                <input
                  type="checkbox"
                  name="relatedIds"
                  value={item.id}
                  defaultChecked={selectedRelatedIds.includes(item.id)}
                  className="h-3.5 w-3.5 accent-[#b08d57]"
                />
                {item.title}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">Aucun autre projet disponible.</p>
        )}
      </AdminPanel>
    </AdminForm>
  );
}
