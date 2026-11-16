import type { Article, ArticleTranslation, Media } from "@prisma/client";
import Link from "next/link";
import { AdminForm } from "@/components/admin/AdminForm";
import { AdminPanel, CheckboxField, Field, FormGrid, FormSection, SelectField, TextareaField } from "@/components/admin/Fields";
import { MediaPicker } from "@/components/admin/MediaPicker";
import { SlugInput } from "@/components/admin/SlugInput";
import { createArticleAction, updateArticleAction } from "@/app/admin/actions/articles";
import { formatDateInput } from "@/lib/admin";
import { toMediaView } from "@/lib/admin-content";

type ArticleRecord = Article & {
  translations: (ArticleTranslation & { seoImage: Media | null })[];
  coverMedia: Media | null;
};

export function ArticleForm({
  article,
  categories,
  tags,
  authors,
  selectedTagIds = [],
}: {
  article?: ArticleRecord | null;
  categories: { id: string; nameFr: string; nameEn: string }[];
  tags: { id: string; nameFr: string; nameEn: string }[];
  authors: { id: string; name: string }[];
  selectedTagIds?: string[];
}) {
  const fr = article?.translations.find((row) => row.locale === "FR") ?? null;
  const en = article?.translations.find((row) => row.locale === "EN") ?? null;
  const isEdit = Boolean(article);

  return (
    <AdminForm
      action={isEdit ? updateArticleAction : createArticleAction}
      submitLabel={isEdit ? "Enregistrer l'article" : "Créer l'article"}
      pendingLabel="Enregistrement…"
      cancelHref="/admin/articles"
    >
      {article && <input type="hidden" name="id" value={article.id} />}

      <AdminPanel title="Paramètres de l'article" description="Publication, classement et image de couverture.">
        <div className="space-y-6">
          <FormGrid cols={3}>
            <SelectField label="Statut" name="status" defaultValue={article?.status ?? "DRAFT"} required>
              <option value="DRAFT">Brouillon</option>
              <option value="PUBLISHED">Publié</option>
              <option value="SCHEDULED">Programmé</option>
              <option value="ARCHIVED">Archivé</option>
            </SelectField>
            <Field
              label="Publication programmée"
              name="publishedAt"
              type="datetime-local"
              defaultValue={formatDateInput(article?.publishedAt, true)}
              help="Utilisé si le statut est « Programmé »."
            />
            <SelectField label="Catégorie" name="categoryId" defaultValue={article?.categoryId ?? ""}>
              <option value="">Non classé</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.nameFr}</option>
              ))}
            </SelectField>
            <SelectField label="Auteur" name="authorId" defaultValue={article?.authorId ?? ""}>
              <option value="">Utilisateur courant</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>{author.name}</option>
              ))}
            </SelectField>
            <div className="flex items-end pb-2">
              <CheckboxField label="Article mis en avant" name="featured" defaultChecked={article?.featured} />
            </div>
            <div className="flex items-end pb-2">
              <Link href="/admin/articles/taxonomy" className="text-[11px] uppercase tracking-[0.12em] text-muted hover:text-ink">
                Gérer catégories & étiquettes
              </Link>
            </div>
          </FormGrid>

          <MediaPicker
            name="coverMediaId"
            label="Image de couverture"
            kind="IMAGE"
            selected={article?.coverMedia ?? null}
            help="Utilisée dans le journal et les partages sociaux."
          />

          <div>
            <span className="admin-label">Étiquettes</span>
            {tags.length ? (
              <div className="flex flex-wrap gap-x-6 gap-y-2 border border-line bg-white px-3 py-3">
                {tags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-[12.5px] text-ink">
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={selectedTagIds.includes(tag.id)}
                      className="h-3.5 w-3.5 accent-[#b08d57]"
                    />
                    {tag.nameFr}
                  </label>
                ))}
              </div>
            ) : (
              <p className="border border-dashed border-line bg-white px-4 py-4 text-[11px] text-muted">
                Aucune étiquette. <Link href="/admin/articles/taxonomy" className="underline underline-offset-2">Créez-en une</Link>.
              </p>
            )}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Traductions" description="Le contenu accepte le Markdown.">
        <div className="space-y-8">
          <FormSection title="Français">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Titre" name="titleFr" id="article-title-fr" defaultValue={fr?.title} required />
                <SlugInput name="slugFr" sourceId="article-title-fr" defaultValue={fr?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Chapô" name="excerptFr" defaultValue={fr?.excerpt} rows={2} />
              <TextareaField label="Contenu" name="contentFr" defaultValue={fr?.content} rows={14} mono help="Markdown pris en charge : titres, listes, liens, images, citations." />
              <FormGrid>
                <Field label="Titre SEO" name="seoTitleFr" defaultValue={fr?.seoTitle} />
                <Field label="Description SEO" name="seoDescriptionFr" defaultValue={fr?.seoDescription} />
              </FormGrid>
              <MediaPicker name="seoImageFrId" label="Image de partage FR" kind="IMAGE" selected={toMediaView(fr?.seoImage ?? null)} />
            </div>
          </FormSection>
          <FormSection title="English">
            <div className="space-y-4">
              <FormGrid>
                <Field label="Title" name="titleEn" id="article-title-en" defaultValue={en?.title} required />
                <SlugInput name="slugEn" sourceId="article-title-en" defaultValue={en?.slug ?? ""} />
              </FormGrid>
              <TextareaField label="Excerpt" name="excerptEn" defaultValue={en?.excerpt} rows={2} />
              <TextareaField label="Content" name="contentEn" defaultValue={en?.content} rows={14} mono />
              <FormGrid>
                <Field label="SEO title" name="seoTitleEn" defaultValue={en?.seoTitle} />
                <Field label="SEO description" name="seoDescriptionEn" defaultValue={en?.seoDescription} />
              </FormGrid>
              <MediaPicker name="seoImageEnId" label="Social image EN" kind="IMAGE" selected={toMediaView(en?.seoImage ?? null)} />
            </div>
          </FormSection>
        </div>
      </AdminPanel>
    </AdminForm>
  );
}
