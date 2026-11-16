import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { BookOpen, Plus, Tags } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SmartImage } from "@/components/media/SmartImage";
import { formatDate } from "@/lib/admin";

export const metadata: Metadata = { title: "Journal" };
export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.ARTICLES_MANAGE);
  const search = await searchParams;
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | "ARCHIVED" | undefined =
    search.status === "DRAFT" || search.status === "PUBLISHED" || search.status === "SCHEDULED" || search.status === "ARCHIVED"
      ? search.status
      : undefined;
  const categoryId = typeof search.category === "string" ? search.category : "";
  const rawPage = Number.parseInt(typeof search.page === "string" ? search.page : "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const where: Prisma.ArticleWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { translations: { some: { title: { contains: q, mode: "insensitive" } } } },
            { translations: { some: { slug: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, articles, categories] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      include: {
        translations: true,
        coverMedia: true,
        category: true,
        author: { select: { name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.articleCategory.findMany({ orderBy: { nameFr: "asc" } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (categoryId) params.set("category", categoryId);
    if (targetPage > 1) params.set("page", String(targetPage));
    const value = params.toString();
    return `/admin/articles${value ? `?${value}` : ""}`;
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Journal."
        description={`${total} article(s). Rédigez, classez et programmez les publications du blog.`}
        actions={
          <>
            <Link href="/admin/articles/taxonomy" className="admin-btn-ghost"><Tags aria-hidden className="h-3.5 w-3.5" /> Taxonomie</Link>
            <Link href="/admin/articles/new" className="admin-btn"><Plus aria-hidden className="h-3.5 w-3.5" /> Nouvel article</Link>
          </>
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Article créé." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Article enregistré." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Article archivé." />}
      {search.error === "introuvable" && <AdminNotice tone="error" title="Article introuvable." />}

      <form method="get" action="/admin/articles" className="admin-toolbar">
        <label className="min-w-[220px] flex-1">
          <span className="admin-label">Rechercher</span>
          <input name="q" defaultValue={q} placeholder="Titre ou slug…" className="admin-input" />
        </label>
        <label>
          <span className="admin-label">Catégorie</span>
          <select name="category" defaultValue={categoryId} className="admin-input">
            <option value="">Toutes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.nameFr}</option>
            ))}
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
        {(q || status || categoryId) && <Link href="/admin/articles" className="admin-btn-ghost">Réinitialiser</Link>}
      </form>

      {articles.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[820px]">
            <caption className="sr-only">Liste des articles</caption>
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Auteur</th>
                <th scope="col">Publication</th>
                <th scope="col">Statut</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const fr = article.translations.find((row) => row.locale === "FR");
                const en = article.translations.find((row) => row.locale === "EN");
                return (
                  <tr key={article.id}>
                    <td data-label="Article">
                      <div className="flex items-start gap-3">
                        <span className="relative block h-12 w-16 shrink-0 overflow-hidden bg-stone">
                          <SmartImage src={article.coverMedia?.thumbnailUrl ?? article.coverMedia?.url ?? null} alt="" fill sizes="64px" />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/articles/${article.id}`} className="font-medium text-ink hover:text-champagne">
                            {fr?.title ?? en?.title ?? "—"}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] text-muted">/{fr?.slug ?? en?.slug ?? "—"}</p>
                          {article.featured && <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.12em] text-champagne">À la une</span>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Catégorie" className="text-muted">{article.category?.nameFr ?? "—"}</td>
                    <td data-label="Auteur" className="text-muted">{article.author?.name ?? "—"}</td>
                    <td data-label="Publication" className="text-muted">{article.publishedAt ? formatDate(article.publishedAt) : "—"}</td>
                    <td data-label="Statut"><StatusBadge value={article.status} /></td>
                    <td data-label="Actions" data-actions className="text-right">
                      <Link href={`/admin/articles/${article.id}`} className="text-[10px] uppercase tracking-[0.12em] text-ink underline-offset-2 hover:underline">
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
          <BookOpen aria-hidden className="mx-auto h-7 w-7 text-muted-light"  />
          <p className="mt-4 font-serif text-2xl text-ink">Aucun article.</p>
          <p className="mt-2 text-[12px] text-muted">Écrivez un premier article ou modifiez les filtres.</p>
          <Link href="/admin/articles/new" className="admin-btn mt-5">Rédiger un article</Link>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
