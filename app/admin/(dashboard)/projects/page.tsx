import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { Images, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDate } from "@/lib/admin";
import { SmartImage } from "@/components/media/SmartImage";

export const metadata: Metadata = { title: "Projets" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.PROJECTS_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED" | undefined =
    search.status === "DRAFT" || search.status === "PUBLISHED" || search.status === "SCHEDULED" || search.status === "ARCHIVED"
      ? search.status
      : undefined;
  const service = search.service === "PHOTO" || search.service === "VIDEO" || search.service === "DRONE" ? search.service : undefined;
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(service ? { categories: { some: { category: { service } } } } : {}),
    ...(q
      ? {
          OR: [
            { translations: { some: { title: { contains: q, mode: "insensitive" as const } } } },
            { translations: { some: { slug: { contains: q, mode: "insensitive" as const } } } },
            { client: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, projects] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: {
        translations: true,
        coverMedia: true,
        client: true,
        categories: { include: { category: { include: { translations: { where: { locale: "FR" } } } } } },
        _count: { select: { media: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { projectDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (service) params.set("service", service);
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return `/admin/projects${value ? `?${value}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Projets."
        description={`${total} projet(s). Gérez les études de cas, les galeries et leur publication.`}
        actions={<Link href="/admin/projects/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouveau projet</Link>}
      />

      {search.created === "1" && <AdminNotice tone="success" title="Projet créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Projet enregistré." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Projet archivé." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Projet introuvable." />}

      <form method="get" action="/admin/projects" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Titre, slug, client…" className="admin-input" />
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
        {(q || service || status) && <Link href="/admin/projects" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {projects.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[860px]">
            <caption className="sr-only">Liste des projets</caption>
            <thead>
              <tr>
                <th scope="col">Projet</th>
                <th scope="col">Client</th>
                <th scope="col">Catégories</th>
                <th scope="col" className="text-center">Médias</th>
                <th scope="col">Date</th>
                <th scope="col">Statut</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const fr = project.translations.find((row) => row.locale === "FR");
                const en = project.translations.find((row) => row.locale === "EN");
                return (
                  <tr key={project.id}>
                    <td data-label="Projet">
                      <div className="flex items-start gap-3">
                        <span className="relative block h-12 w-16 shrink-0 overflow-hidden bg-stone">
                          <SmartImage src={project.coverMedia?.thumbnailUrl ?? project.coverMedia?.url ?? null} alt="" fill sizes="64px" />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/projects/${project.id}`} className="font-medium text-ink hover:text-champagne">
                            {fr?.title ?? en?.title ?? "—"}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] text-muted">/{fr?.slug ?? en?.slug ?? "—"}</p>
                          {project.featured && <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.12em] text-champagne">Mis en avant</span>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Client" className="text-muted">{project.client?.name ?? "—"}</td>
                    <td data-label="Catégories" className="text-muted">
                      {project.categories.length
                        ? project.categories.map((row) => row.category.translations[0]?.name ?? "—").join(", ")
                        : "—"}
                    </td>
                    <td data-label="Médias" className="text-center text-muted">{project._count.media}</td>
                    <td data-label="Date" className="text-muted">{project.projectDate ? formatDate(project.projectDate) : "—"}</td>
                    <td data-label="Statut"><StatusBadge value={project.status} /></td>
                    <td data-label="Actions" data-actions className="text-right">
                      <Link href={`/admin/projects/${project.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
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
          <Images aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun projet.</p>
          <p className="mt-2 text-[12px] text-muted">Créez un projet ou modifiez les filtres.</p>
          <Link href="/admin/projects/new" className="admin-btn mt-5">Créer un projet</Link>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
