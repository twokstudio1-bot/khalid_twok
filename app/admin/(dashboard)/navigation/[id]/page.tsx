import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, SelectField } from "@/components/admin/Fields";
import { updateMenuItemAction } from "@/app/admin/actions/navigation";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un élément de menu" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TARGET_LABELS: Record<string, string> = {
  HOME: "Accueil",
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  DRONE: "Drone",
  BLOG: "Journal",
  CONTACT: "Contact",
  BOOKING: "Réservation",
  PROJECTS: "Projets",
  CLIENTS: "Clients",
  CUSTOM: "Lien personnalisé",
};

export default async function EditMenuItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.NAVIGATION_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [item, pages, categories] = await Promise.all([
    prisma.menuItem.findUnique({
      where: { id },
      include: { menu: { include: { items: true } } },
    }),
    prisma.page.findMany({ where: { deletedAt: null }, include: { translations: { where: { locale: "FR" } } }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { deletedAt: null }, include: { translations: { where: { locale: "FR" } } }, orderBy: [{ service: "asc" }, { sortOrder: "asc" }] }),
  ]);
  if (!item) notFound();

  const menuKey = item.menu.key;
  const siblings = item.menu.items.filter((entry) => entry.id !== id);

  return (
    <div className="mx-auto max-w-4xl">
      <AdminPageHeader
        eyebrow="Navigation"
        title={item.labelFr}
        description={`Dernière modification le ${formatDateTime(item.updatedAt)}.`}
      />
      {search.saved === "1" && <AdminNotice tone="success" title="Élément enregistré." />}
      <AdminForm
        action={updateMenuItemAction}
        submitLabel="Enregistrer"
        pendingLabel="Enregistrement…"
        cancelHref={`/admin/navigation?menu=${menuKey}`}
      >
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="menuKey" value={menuKey} />
        <AdminPanel title="Élément de menu">
          <div className="space-y-6">
            <FormGrid cols={3}>
              <Field label="Libellé FR" name="labelFr" defaultValue={item.labelFr} required />
              <Field label="Libellé EN" name="labelEn" defaultValue={item.labelEn} />
              <SelectField label="Cible" name="target" defaultValue={item.target}>
                {Object.entries(TARGET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </SelectField>
              <SelectField label="Parent" name="parentId" defaultValue={item.parentId ?? ""}>
                <option value="">Racine</option>
                {siblings.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.labelFr}</option>
                ))}
              </SelectField>
              <Field label="Ordre" name="sortOrder" type="number" defaultValue={item.sortOrder} />
              <SelectField label="Page liée (CUSTOM)" name="pageId" defaultValue={item.pageId ?? ""}>
                <option value="">Aucune</option>
                {pages.filter((page) => page.translations[0]?.title).map((page) => (
                  <option key={page.id} value={page.id}>{page.translations[0].title}</option>
                ))}
              </SelectField>
              <SelectField label="Catégorie liée" name="categoryId" defaultValue={item.categoryId ?? ""}>
                <option value="">Aucune</option>
                {categories.filter((category) => category.translations[0]?.name).map((category) => (
                  <option key={category.id} value={category.id}>{category.translations[0].name}</option>
                ))}
              </SelectField>
              <Field label="URL personnalisée (CUSTOM)" name="url" defaultValue={item.url} />
            </FormGrid>
            <div className="flex flex-wrap gap-5">
              <CheckboxField label="Actif" name="enabled" defaultChecked={item.enabled} />
              <CheckboxField label="Ouvrir dans un nouvel onglet" name="openInNewTab" defaultChecked={item.openInNewTab} />
              <CheckboxField label="Afficher les enfants" name="showChildren" defaultChecked={item.showChildren} />
            </div>
          </div>
        </AdminPanel>
      </AdminForm>
    </div>
  );
}
