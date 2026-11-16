import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, SelectField } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { createMenuItemAction, deleteMenuItemAction } from "@/app/admin/actions/navigation";

export const metadata: Metadata = { title: "Navigation" };
export const dynamic = "force-dynamic";

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

export default async function NavigationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.NAVIGATION_MANAGE);
  const search = await searchParams;
  const menuKey = typeof search.menu === "string" ? search.menu : "header";
  const menu = await prisma.menu.findUnique({
    where: { key: menuKey },
    include: { items: { orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }] } },
  });
  const menus = await prisma.menu.findMany({ orderBy: { key: "asc" } });
  const pages = await prisma.page.findMany({
    where: { deletedAt: null },
    include: { translations: { where: { locale: "FR" } } },
    orderBy: { createdAt: "asc" },
  });
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    include: { translations: { where: { locale: "FR" } } },
    orderBy: [{ service: "asc" }, { sortOrder: "asc" }],
  });

  const pageMap = new Map(pages.map((page) => [page.id, page.translations[0]?.title ?? page.id]));

  const items = menu?.items ?? [];
  const byParent = new Map<string | null, typeof items>();
  for (const item of items) {
    const key = item.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  }
  const rows: { item: (typeof items)[number]; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const item of byParent.get(parentId) ?? []) {
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      rows.push({ item, depth });
      walk(item.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const item of items) if (!visited.has(item.id)) rows.push({ item, depth: 0 });

  const parentOptions = items.filter((item) => !item.parentId);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Navigation."
        description="Gérez les menus et leurs éléments. Les menus sont affichés sur le site public selon leur clé."
      />

      {search.created === "1" && <AdminNotice tone="success" title="Élément créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Élément enregistré." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Élément supprimé." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Élément introuvable." />}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {menus.map((item) => (
          <Link
            key={item.id}
            href={`/admin/navigation?menu=${item.key}`}
            aria-current={menuKey === item.key ? "page" : undefined}
            className={`inline-flex min-h-10 items-center border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors ${menuKey === item.key ? "border-ink bg-ink text-cream" : "border-line bg-white text-muted hover:text-ink"}`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      {rows.length ? (
        <div className="admin-table-wrap mb-6">
          <table className="admin-table min-w-[760px]">
            <caption className="sr-only">Éléments du menu</caption>
            <thead>
              <tr>
                <th scope="col">Libellé</th>
                <th scope="col">Cible</th>
                <th scope="col">Lien</th>
                <th scope="col" className="text-center">Ordre</th>
                <th scope="col" className="text-center">Actif</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, depth }) => (
                <tr key={item.id}>
                  <td data-label="Libellé">
                    <div style={{ paddingLeft: depth * 16 }}>
                      <p className="font-medium text-ink">{item.labelFr}</p>
                      <p className="mt-0.5 text-[10.5px] text-muted">{item.labelEn}</p>
                    </div>
                  </td>
                  <td data-label="Cible" className="text-muted">{TARGET_LABELS[item.target] ?? item.target}</td>
                  <td data-label="Lien" className="font-mono text-[10.5px] text-muted">
                    {item.target === "CUSTOM"
                      ? item.url ?? pageMap.get(item.pageId ?? "") ?? "—"
                      : "Route automatique"}
                  </td>
                  <td data-label="Ordre" className="text-center text-muted">{item.sortOrder}</td>
                  <td data-label="Actif" className="text-center text-muted">{item.enabled ? "Oui" : "Non"}</td>
                  <td data-label="Actions" data-actions className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/navigation/${item.id}?menu=${menuKey}`} className="text-[10px] uppercase tracking-[0.1em] text-ink hover:underline">
                        Modifier
                      </Link>
                      <form action={deleteMenuItemAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="menuKey" value={menuKey} />
                        <ConfirmSubmit label="Supprimer" confirmMessage={`Supprimer « ${item.labelFr} » ?`} icon={false} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card mb-6 p-10 text-center">
          <Navigation aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun élément.</p>
          <p className="mt-2 text-[12px] text-muted">Ajoutez le premier élément au menu {menu?.name ?? menuKey}.</p>
        </div>
      )}

      <AdminPanel title="Ajouter un élément" description="Les modifications sont appliquées après enregistrement.">
        <AdminForm
          action={createMenuItemAction}
          submitLabel="Ajouter l'élément"
          pendingLabel="Création…"
          compact
        >
          <input type="hidden" name="menuId" value={menu?.id ?? ""} />
          <input type="hidden" name="menuKey" value={menuKey} />
          <FormGrid cols={3}>
            <Field label="Libellé FR" name="labelFr" required />
            <Field label="Libellé EN" name="labelEn" placeholder="Identique au FR si vide" />
            <SelectField label="Cible" name="target" defaultValue="CUSTOM">
              {Object.entries(TARGET_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </SelectField>
            <SelectField label="Parent" name="parentId" defaultValue="">
              <option value="">Racine</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.labelFr}</option>
              ))}
            </SelectField>
            <Field label="Ordre" name="sortOrder" type="number" defaultValue={0} />
            <SelectField label="Page liée (CUSTOM)" name="pageId" defaultValue="">
              <option value="">Aucune</option>
              {pages.filter((page) => page.translations[0]?.title).map((page) => (
                <option key={page.id} value={page.id}>{page.translations[0].title}</option>
              ))}
            </SelectField>
            <SelectField label="Catégorie liée" name="categoryId" defaultValue="">
              <option value="">Aucune</option>
              {categories.filter((category) => category.translations[0]?.name).map((category) => (
                <option key={category.id} value={category.id}>{category.translations[0].name}</option>
              ))}
            </SelectField>
            <Field label="URL personnalisée (CUSTOM)" name="url" placeholder="/fr/ma-page" />
          </FormGrid>
          <div className="flex flex-wrap gap-5">
            <CheckboxField label="Actif" name="enabled" defaultChecked />
            <CheckboxField label="Ouvrir dans un nouvel onglet" name="openInNewTab" />
            <CheckboxField label="Afficher les enfants" name="showChildren" />
          </div>
        </AdminForm>
      </AdminPanel>
    </div>
  );
}
