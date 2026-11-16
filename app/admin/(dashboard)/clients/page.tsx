import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { UsersRound, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { SmartImage } from "@/components/media/SmartImage";

export const metadata: Metadata = { title: "Clients" };
export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.CLIENTS_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const activeFilter = search.active === "true" ? true : search.active === "false" ? false : undefined;
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(activeFilter !== undefined ? { active: activeFilter } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { websiteUrl: { contains: q, mode: "insensitive" } },
            { translations: { some: { displayName: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      include: { logoMedia: true, _count: { select: { projectLinks: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (activeFilter !== undefined) params.set("active", String(activeFilter));
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return `/admin/clients${value ? `?${value}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Clients."
        description={`${total} client(s). Gérez les marques et partenaires affichés sur le site.`}
        actions={<Link href="/admin/clients/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouveau client</Link>}
      />

      {search.created === "1" && <AdminNotice tone="success" title="Client créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Client enregistré." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Client archivé." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Client introuvable." />}

      <form method="get" action="/admin/clients" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Nom ou site web…" className="admin-input" />
        </label>
        <label>
          <span className="admin-label">Actif</span>
          <select name="active" defaultValue={activeFilter === undefined ? "" : String(activeFilter)} className="admin-input">
            <option value="">Tous</option>
            <option value="true">Actifs</option>
            <option value="false">Inactifs</option>
          </select>
        </label>
        <button type="submit" className="admin-btn">Filtrer</button>
        {(q || activeFilter !== undefined) && <Link href="/admin/clients" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {clients.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[760px]">
            <caption className="sr-only">Liste des clients</caption>
            <thead>
              <tr>
                <th scope="col">Client</th>
                <th scope="col">Site web</th>
                <th scope="col" className="text-center">Projets</th>
                <th scope="col">Ordre</th>
                <th scope="col">Actif</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="Client">
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden bg-stone">
                        {client.logoMedia?.url ? (
                          <SmartImage src={client.logoMedia.thumbnailUrl ?? client.logoMedia.url} alt="" fill sizes="64px" />
                        ) : (
                          <span className="font-serif text-[10px] text-muted">LOGO</span>
                        )}
                      </span>
                      <div>
                        <Link href={`/admin/clients/${client.id}`} className="font-medium text-ink hover:text-champagne">{client.name}</Link>
                        {client.featured && <span className="ml-2 text-[9px] uppercase tracking-[0.12em] text-champagne">Mis en avant</span>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Site web" className="text-muted">{client.websiteUrl ? <a href={client.websiteUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">{client.websiteUrl}</a> : "—"}</td>
                  <td data-label="Projets" className="text-center text-muted">{client._count.projectLinks}</td>
                  <td data-label="Ordre" className="text-muted">{client.sortOrder}</td>
                  <td data-label="Actif" className="text-muted">{client.active ? "Oui" : "Non"}</td>
                  <td data-label="Actions" data-actions className="text-right">
                    <Link href={`/admin/clients/${client.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
                      Modifier
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-card p-12 text-center">
          <UsersRound aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun client.</p>
          <p className="mt-2 text-[12px] text-muted">Ajoutez une marque ou un partenaire.</p>
          <Link href="/admin/clients/new" className="admin-btn mt-5">Nouveau client</Link>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
