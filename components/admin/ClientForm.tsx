import type { Client, ClientTranslation, Media } from "@prisma/client";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, FormSection, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { createClientAction, updateClientAction } from "@/app/admin/actions/clients";

type ClientRecord = Client & { translations: ClientTranslation[]; logoMedia: Media | null };

export function ClientForm({
  client,
  projects,
  selectedProjectIds = [],
}: {
  client?: ClientRecord | null;
  projects: { id: string; title: string }[];
  selectedProjectIds?: string[];
}) {
  const fr = client?.translations.find((row) => row.locale === "FR") ?? null;
  const en = client?.translations.find((row) => row.locale === "EN") ?? null;
  const isEdit = Boolean(client);

  return (
    <AdminForm
      action={isEdit ? updateClientAction : createClientAction}
      submitLabel={isEdit ? "Enregistrer le client" : "Créer le client"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/clients"
    >
      {client && <input type="hidden" name="id" value={client.id} />}

      <AdminPanel title="Informations client" description="Coordonnées, présentation et affichage public.">
        <div className="space-y-6">
          <FormGrid cols={2}>
            <Field label="Nom" name="name" defaultValue={client?.name} required />
            <Field label="Site web" name="websiteUrl" defaultValue={client?.websiteUrl} placeholder="https://…" />
            <Field label="Ordre d'affichage" name="sortOrder" type="number" defaultValue={client?.sortOrder ?? 0} />
          </FormGrid>
          <TextareaField label="Description" name="description" defaultValue={client?.description} rows={3} />
          <div className="flex flex-wrap gap-5">
            <CheckboxField label="Actif" name="active" defaultChecked={client?.active ?? true} help="Affiché dans la liste des clients." />
            <CheckboxField label="Mis en avant" name="featured" defaultChecked={client?.featured} />
            <CheckboxField label="Logo monochrome" name="monochrome" defaultChecked={client?.monochrome} />
          </div>
          <MediaPicker
            name="logoMediaId"
            label="Logo"
            kind="IMAGE"
            selected={client?.logoMedia ?? null}
            help="Format recommandé : SVG ou PNG transparent."
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Traductions" description="Nom d'affichage et description localisés.">
        <div className="space-y-6">
          <FormSection title="Français">
            <div className="space-y-4">
              <Field label="Nom d'affichage" name="displayNameFr" defaultValue={fr?.displayName} />
              <TextareaField label="Description" name="descriptionFr" defaultValue={fr?.description} rows={3} />
            </div>
          </FormSection>
          <FormSection title="English">
            <div className="space-y-4">
              <Field label="Display name" name="displayNameEn" defaultValue={en?.displayName} />
              <TextareaField label="Description" name="descriptionEn" defaultValue={en?.description} rows={3} />
            </div>
          </FormSection>
        </div>
      </AdminPanel>

      <AdminPanel title="Projets associés" description="Sélectionnez les projets liés à ce client.">
        {projects.length ? (
          <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                <input
                  type="checkbox"
                  name="projectIds"
                  value={project.id}
                  defaultChecked={selectedProjectIds.includes(project.id)}
                  className="h-3.5 w-3.5 accent-[#b08d57]"
                />
                {project.title}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-muted">Aucun projet disponible.</p>
        )}
      </AdminPanel>
    </AdminForm>
  );
}
