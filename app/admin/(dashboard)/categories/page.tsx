import type { Metadata } from "next";
import Link from "next/link";
import { FolderTree, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Catégories" };
export const dynamic = "force-dynamic";

const SERVICE_LABELS: Record<string, string> = { PHOTO: "Photo", VIDEO: "Vidéo", DRONE: "Drone" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const service = search.service === "PHOTO" || search.service === "VIDEO" || search.service === "DRONE" ? search.service : undefined;
  const status =
    search.status === "DRAFT" || search.status === "PUBLISHED" || search.status === "SCHEDULED" || search.status === "ARCHIVED"
      ? search.status
      : undefined;

  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
      ...(service ? { service } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            translations: {
              some: {
                OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }],
              },
            },
          }
        : {}),
    },
    include: {
      translations: true,
      parent: { include: { translations: { where: { locale: "FR" } } } },
      _count: { select: { children: true, projects: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const ids = new Set(categories.map((row) => row.id));
  const byParent = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const key = category.parentId && ids.has(category.parentId) ? category.parentId : null;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  }
  const rows: { category: (typeof categories)[number]; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const category of byParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      rows.push({ category, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const category of categories) {
    if (!visited.has(category.id)) rows.push({ category, depth: 0 });
  }

  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Catégories."
        description="Organisez les univers photo, vidéo et drone. La hiérarchie est illimitée et chaque catégorie possède ses propres traductions."
        actions={
          <Link href="/admin/categories/new" className="admin-btn">
            <Plus aria-hidden className="h-3.5 w-3.5" /> Nouvelle catégorie
          </Link>
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Catégorie créée." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Catégorie enregistrée." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Catégorie archivée." />}
      {error && <AdminNotice tone="error" title={error} />}

      <form method="get" action="/admin/categories" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Nom ou slug…" className="admin-input" />
        </label>
        <label>
          <span className="admin-label">Service</span>
          <select name="service" defaultValue={service ?? ""} className="admin-input">
            <option value="">Tous</option>
            <option value="PHOTO">Photo</option>
            <option value="VIDEO">Vidéo</option>
            <option value="DRONE">Drone</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Statut</span>
          <select name="status" defaultValue={status ?? ""} className="admin-input">
            <option value="">Tous</option>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="SCHEDULED">Programmé</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
        </label>
        <button type="submit" className="admin-btn">Filtrer</button>
        {(q || service || status) && (
          <Link href="/admin/categories" className="admin-btn-ghost">Réinitialiser</Link>
        )}
      </form>

      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[780px]">
            <caption className="sr-only">Liste des catégories</caption>
            <thead>
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col">Service</th>
                <th scope="col">Parent</th>
                <th scope="col">Statut</th>
                <th scope="col" className="text-center">Projets</th>
                <th scope="col" className="text-center">Ordre</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ category, depth }) => {
                const fr = category.translations.find((row) => row.locale === "FR");
                const en = category.translations.find((row) => row.locale === "EN");
                const parentFr = category.parent?.translations[0];
                return (
                  <tr key={category.id}>
                    <td data-label="Catégorie">
                      <div style={{ paddingLeft: depth * 18 }}>
                        <Link href={`/admin/categories/${category.id}`} className="font-medium text-ink hover:text-champagne">
                          {fr?.name ?? en?.name ?? "—"}
                        </Link>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">/{fr?.slug ?? en?.slug ?? "—"}</p>
                        {category.featured && <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.12em] text-champagne">Mise en avant</span>}
                      </div>
                    </td>
                    <td data-label="Service" className="text-muted">{SERVICE_LABELS[category.service]}</td>
                    <td data-label="Parent" className="text-muted">{parentFr?.name ?? "—"}</td>
                    <td data-label="Statut"><StatusBadge value={category.status} /></td>
                    <td data-label="Projets" className="text-center text-muted">{category._count.projects}</td>
                    <td data-label="Ordre" className="text-center text-muted">{category.sortOrder}</td>
                    <td data-label="Actions" data-actions className="text-right">
                      <Link href={`/admin/categories/${category.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
                        Modifier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <FolderTree aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucune catégorie.</p>
          <p className="mt-2 text-[12px] text-muted">Créez une première catégorie ou ajustez les filtres.</p>
          <Link href="/admin/categories/new" className="admin-btn mt-5">Créer une catégorie</Link>
        </div>
      )}
    </div>
  );
}
