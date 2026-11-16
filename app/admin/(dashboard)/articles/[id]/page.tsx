import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ArticleForm } from "@/components/admin/ArticleForm";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { deleteArticleAction } from "@/app/admin/actions/articles";
import { formatDateTime } from "@/lib/admin";

export const metadata: Metadata = { title: "Modifier un article" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.ARTICLES_MANAGE);
  const { id } = await params;
  const search = await searchParams;
  if (!UUID.test(id)) notFound();

  const [article, categories, tags, authors] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        translations: { include: { seoImage: true } },
        coverMedia: true,
        tags: true,
      },
    }),
    prisma.articleCategory.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.articleTag.findMany({ orderBy: { nameFr: "asc" } }),
    prisma.user.findMany({ where: { deletedAt: null, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);
  if (!article || article.deletedAt) notFound();

  const fr = article.translations.find((row) => row.locale === "FR");
  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        eyebrow="Journal"
        title={fr?.title ?? "Article"}
        description={`Créé le ${formatDateTime(article.createdAt)} · Dernière modification le ${formatDateTime(article.updatedAt)}.`}
        actions={
          fr?.slug ? (
            <a href={`/fr/blog/${fr.slug}`} target="_blank" rel="noreferrer" className="admin-btn-ghost">
              Voir sur le site <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </a>
          ) : null
        }
      />

      {search.created === "1" && <AdminNotice tone="success" title="Article créé. Complétez le contenu et les traductions." />}
      {search.saved === "1" && <AdminNotice tone="success" title="Article enregistré." />}
      {error && <AdminNotice tone="error" title="Action impossible.">{error}</AdminNotice>}

      <ArticleForm
        article={article}
        categories={categories.map((category) => ({ id: category.id, nameFr: category.nameFr, nameEn: category.nameEn }))}
        tags={tags.map((tag) => ({ id: tag.id, nameFr: tag.nameFr, nameEn: tag.nameEn }))}
        authors={authors.map((author) => ({ id: author.id, name: author.name }))}
        selectedTagIds={article.tags.map((row) => row.tagId)}
      />

      <section className="admin-card mt-6 border-red-200 p-5 sm:p-6">
        <h2 className="font-serif text-2xl text-ink">Archiver l&apos;article</h2>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          L&apos;article quitte le journal public. Son contenu et ses traductions restent conservés dans l&apos;administration.
        </p>
        <form action={deleteArticleAction} className="mt-4">
          <input type="hidden" name="id" value={article.id} />
          <ConfirmSubmit
            label="Archiver cet article"
            confirmMessage={`Archiver « ${fr?.title ?? article.id} » ? Il ne sera plus visible sur le site.`}
          />
        </form>
      </section>
    </div>
  );
}
