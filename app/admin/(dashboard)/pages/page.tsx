import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.PAGES_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status =
    search.status === "DRAFT" || search.status === "PUBLISHED" || search.status === "SCHEDULED" || search.status === "ARCHIVED"
      ? search.status
      : undefined;

  const where: Prisma.PageWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(q
      ? {
          translations: { some: { title: { contains: q, mode: "insensitive" } } },
        }
      : {}),
  };

  const pages = await prisma.page.findMany({
    where,
    include: { translations: true, parent: { include: { translations: { where: { locale: "FR" } } } }, _count: { select: { children: true, blocks: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const ids = new Set(pages.map((page) => page.id));
  const byParent = new Map<string | null, typeof pages>();
  for (const page of pages) {
    const key = page.parentId && ids.has(page.parentId) ? page.parentId : null;
    const list = byParent.get(key) ?? [];
    list.push(page);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
  const rows: { page: (typeof pages)[number]; depth: number }[] = [];
  const visited = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    for (const page of byParent.get(parentId) ?? []) {
      if (visited.has(page.id)) continue;
      visited.add(page.id);
      rows.push({ page, depth });
      walk(page.id, depth + 1);
    }
  };
  walk(null, 0);
  for (const page of pages) if (!visited.has(page.id)) rows.push({ page, depth: 0 });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Pages."
        description="Créez des pages personnalisées et assemblez-les avec des blocs réutilisables."
        actions={<Link href="/admin/pages/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouvelle page</Link>}
      />

      {search.created === "1" && <AdminNotice tone="success" title="Page créée." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Page enregistrée." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Page archivée." />}
      {search.blockCreated === "1" && <AdminNotice tone="success" title="Bloc ajouté." />}
      {search.blockSaved === "1" && <AdminNotice tone="success" title="Bloc enregistré." />}
      {search.blockDeleted === "1" && <AdminNotice tone="success" title="Bloc supprimé." />}
      {typeof search.error === "string" && <AdminNotice tone="error" title={decodeURIComponent(search.error)} />}

      <form method="get" action="/admin/pages" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Titre…" className="admin-input" />
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
        {(q || status) && <Link href="/admin/pages" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {rows.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[760px]">
            <caption className="sr-only">Liste des pages</caption>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Parent</th>
                <th scope="col">Template</th>
                <th scope="col" className="text-center">Blocs</th>
                <th scope="col">Statut</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ page, depth }) => {
                const fr = page.translations.find((row) => row.locale === "FR");
                const parentFr = page.parent?.translations[0];
                return (
                  <tr key={page.id}>
                    <td data-label="Page">
                      <div style={{ paddingLeft: depth * 16 }}>
                        <Link href={`/admin/pages/${page.id}`} className="font-medium text-ink hover:text-champagne">
                          {fr?.title ?? "—"}
                        </Link>
                        <p className="mt-0.5 font-mono text-[10px] text-muted">/{fr?.slug ?? "—"}</p>
                      </div>
                    </td>
                    <td data-label="Parent" className="text-muted">{parentFr?.title ?? "—"}</td>
                    <td data-label="Template" className="text-muted">{page.template}</td>
                    <td data-label="Blocs" className="text-center text-muted">{page._count.blocks}</td>
                    <td data-label="Statut"><StatusBadge value={page.status} /></td>
                    <td data-label="Actions" data-actions className="text-right">
                      <Link href={`/admin/pages/${page.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
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
          <FileText aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucune page.</p>
          <p className="mt-2 text-[12px] text-muted">Créez une page personnalisée.</p>
          <Link href="/admin/pages/new" className="admin-btn mt-5">Nouvelle page</Link>
        </div>
      )}
    </div>
  );
}
