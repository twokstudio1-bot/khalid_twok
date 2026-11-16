import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Tags } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, Field, FormGrid } from "@/components/admin/Fields";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import {
  createArticleTagAction,
  deleteArticleCategoryAction,
  deleteArticleTagAction,
  saveArticleCategoryAction,
} from "@/app/admin/actions/articles";

export const metadata: Metadata = { title: "Taxonomie du journal" };
export const dynamic = "force-dynamic";

export default async function ArticleTaxonomyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePermission(PERMISSIONS.ARTICLES_MANAGE);
  const search = await searchParams;
  const editId = typeof search.edit === "string" ? search.edit : "";
  const [categories, tags, editing] = await Promise.all([
    prisma.articleCategory.findMany({
      include: { _count: { select: { articles: { where: { deletedAt: null } } } } },
      orderBy: { nameFr: "asc" },
    }),
    prisma.articleTag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { nameFr: "asc" },
    }),
    editId ? prisma.articleCategory.findUnique({ where: { id: editId } }) : Promise.resolve(null),
  ]);
  const error = typeof search.error === "string" ? search.error : null;

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        eyebrow="Journal"
        title="Taxonomie."
        description="Catégories et étiquettes utilisées par les articles du journal."
        actions={<Link href="/admin/articles" className="admin-btn-ghost"><ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Articles</Link>}
      />

      {search.saved === "1" && <AdminNotice tone="success" title="Taxonomie enregistrée." />}
      {search.deleted === "1" && <AdminNotice tone="success" title="Élément supprimé." />}
      {error && <AdminNotice tone="error" title={error} />}

      <div className="space-y-6">
        <AdminPanel
          title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          description="Les catégories organisent les articles en sections éditoriales."
          actions={editing ? <Link href="/admin/articles/taxonomy" className="text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink">Annuler l&apos;édition</Link> : null}
        >
          <AdminForm
            action={saveArticleCategoryAction}
            submitLabel={editing ? "Enregistrer" : "Créer la catégorie"}
            pendingLabel="Enregistrement…"
            compact
          >
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <FormGrid>
              <Field label="Nom FR" name="nameFr" defaultValue={editing?.nameFr} required />
              <Field label="Nom EN" name="nameEn" defaultValue={editing?.nameEn} required />
              <Field label="Slug FR" name="slugFr" defaultValue={editing?.slugFr} placeholder="Généré depuis le nom si vide" />
              <Field label="Slug EN" name="slugEn" defaultValue={editing?.slugEn} placeholder="Généré depuis le nom si vide" />
            </FormGrid>
          </AdminForm>

          {categories.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <div className="admin-table-wrap">
                <table className="admin-table min-w-[560px]">
                  <caption className="sr-only">Catégories d&apos;articles</caption>
                  <thead>
                    <tr>
                      <th scope="col">Catégorie</th>
                      <th scope="col">Slugs</th>
                      <th scope="col" className="text-center">Articles</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td data-label="Catégorie">
                          <p className="text-ink">{category.nameFr}</p>
                          <p className="text-[10.5px] text-muted">{category.nameEn}</p>
                        </td>
                        <td data-label="Slugs" className="font-mono text-[10.5px] text-muted">{category.slugFr} · {category.slugEn}</td>
                        <td data-label="Articles" className="text-center text-muted">{category._count.articles}</td>
                        <td data-label="Actions" data-actions className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link href={`/admin/articles/taxonomy?edit=${category.id}`} className="text-[10px] uppercase tracking-[0.1em] text-ink hover:underline">Modifier</Link>
                            <form action={deleteArticleCategoryAction}>
                              <input type="hidden" name="id" value={category.id} />
                              <ConfirmSubmit label="Supprimer" confirmMessage={`Supprimer la catégorie « ${category.nameFr} » ?`} icon={false} />
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="Étiquettes" description="Les étiquettes sont transverses et peuvent être sélectionnées sur chaque article.">
          <AdminForm action={createArticleTagAction} submitLabel="Créer l'étiquette" pendingLabel="Création…" compact>
            <FormGrid cols={3}>
              <Field label="Nom FR" name="nameFr" required />
              <Field label="Nom EN" name="nameEn" placeholder="Identique au FR si vide" />
              <Field label="Slug" name="slug" placeholder="Généré depuis le nom si vide" />
            </FormGrid>
          </AdminForm>

          {tags.length > 0 ? (
            <div className="mt-6 border-t border-line pt-4">
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag.id} className="flex items-center gap-2 border border-line bg-white px-2.5 py-1.5 text-[11.5px] text-ink">
                    <Tags aria-hidden className="h-3 w-3 text-muted" />
                    {tag.nameFr}
                    <span className="text-[9.5px] text-muted">({tag._count.articles})</span>
                    <form action={deleteArticleTagAction}>
                      <input type="hidden" name="id" value={tag.id} />
                      <ConfirmSubmit
                        label="×"
                        confirmMessage={`Supprimer l'étiquette « ${tag.nameFr} » ? Elle sera retirée des articles.`}
                        icon={false}
                        className="text-[13px] leading-none text-muted hover:text-red-700"
                      />
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-5 text-[12px] text-muted">Aucune étiquette pour le moment.</p>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
