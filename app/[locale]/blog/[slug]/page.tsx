import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getArticleBySlug, getRelatedArticles } from "@/lib/content";
import { canPreview } from "@/lib/preview";
import { buildMetadata } from "@/lib/seo";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl, formatDate } from "@/lib/utils";
import { PageHero } from "@/components/public/PageHero";
import { ArticleCard } from "@/components/site/ArticleCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { PreviewBar } from "@/components/public/PreviewBar";
import { JsonLd } from "@/components/public/JsonLd";

export const dynamic = "force-dynamic";

async function loadArticle(rawLocale: string, slug: string, previewValue?: string | string[]) {
  if (!isLocale(rawLocale)) return null;
  const preview = await canPreview(previewValue);
  const article = await getArticleBySlug(slug, rawLocale, preview);
  if (!article) return null;
  return { article, preview, locale: rawLocale as AppLocale };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ locale, slug }, search] = await Promise.all([params, searchParams]);
  const loaded = await loadArticle(locale, slug, search.preview);
  if (!loaded) return { title: "Article introuvable", robots: { index: false, follow: false } };
  const { article } = loaded;
  return buildMetadata({
    locale: loaded.locale,
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    canonicalPath: `/${locale}/blog/${article.alternates[loaded.locale]?.split("/").pop() ?? article.slug}`,
    paths: {
      fr: article.alternates.fr,
      en: article.alternates.en,
    },
    image: article.coverMedia?.url ?? null,
    type: "article",
    publishedTime: article.publishedAt?.toISOString() ?? null,
    modifiedTime: article.updatedAt.toISOString(),
    noindex: loaded.preview,
  });
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: raw, slug }, search] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) notFound();
  const loaded = await loadArticle(raw, slug, search.preview);
  if (!loaded) notFound();
  const { article, locale, preview } = loaded;
  const dict = getDictionary(locale);
  const html = renderMarkdown(article.content);
  const category = article.category
    ? locale === "fr"
      ? article.category.nameFr
      : article.category.nameEn
    : null;
  const related = await getRelatedArticles(article.id, article.categoryId, locale, 3);
  const shareUrl = absoluteUrl(`/${locale}/blog/${article.alternates[locale]?.split("/").pop() ?? article.slug}`);
  const author = article.authorName === "TWOK Administrator" ? "TWOK STUDIO" : article.authorName;
  const currentPath = `/${locale}/blog/${article.alternates[locale]?.split("/").pop() ?? article.slug}`;

  return (
    <>
      {preview && <PreviewBar context={article.title} />}
      <PageHero
        variant={article.coverMedia?.url ? "image" : "cream"}
        cover={article.coverMedia}
        eyebrow={category || (locale === "fr" ? "Le journal" : "The journal")}
        title={article.title}
        intro={article.excerpt || null}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: dict.blog, href: `/${locale}/blog` },
          { name: article.title },
        ]}
      />

      <section className="bg-cream py-14 sm:py-20">
        <div className="container-editorial grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:gap-20">
          <aside>
            <div className="border-y border-line py-5">
              <p className="eyebrow text-[9px]">{dict.publishedOn}</p>
              <time dateTime={article.publishedAt?.toISOString() ?? undefined} className="mt-2 block font-serif text-xl text-ink">
                {formatDate(article.publishedAt, locale)}
              </time>
              <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                {dict.by} {author}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted/70">
                {Math.max(2, Math.round((article.content.split(/\s+/).length ?? 200) / 200))} {dict.readingTime}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1 text-[9px]">{dict.share}</span>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center border border-line px-3 text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-ink hover:text-ink"
              >
                LinkedIn
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(article.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center border border-line px-3 text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-ink hover:text-ink"
              >
                X
              </a>
            </div>
            <Link href={`/${locale}/blog`} className="link-line mt-8 text-ink">
              <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
              {dict.backToBlog}
            </Link>
          </aside>

          <article className="min-w-0">
            {html ? (
              <div className="prose-editorial max-w-[760px]" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-sm leading-relaxed text-muted">{article.excerpt}</p>
            )}
            {article.tags.length > 0 && (
              <div className="mt-12 flex flex-wrap gap-2 border-t border-line pt-6">
                {article.tags.map((tag) => (
                  <span key={tag.id} className="border border-line px-3 py-1.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                    {locale === "fr" ? tag.nameFr : tag.nameEn}
                  </span>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-line bg-stone py-16 sm:py-24">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={dict.relatedArticles}
              title={locale === "fr" ? "Poursuivre la lecture." : "Continue reading."}
              link={`/${locale}/blog`}
              linkLabel={dict.viewAll}
            />
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-charcoal py-16 text-cream sm:py-20">
        <div className="container-editorial flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow-gold">{locale === "fr" ? "Passons à l'image" : "Let's make images"}</p>
            <h2 className="mt-4 max-w-2xl font-serif text-[clamp(2.3rem,5vw,4.4rem)] leading-[1]">
              {locale === "fr" ? "Un projet à préparer ?" : "A project to prepare?"}
            </h2>
          </div>
          <div className="flex gap-3">
            <Link href={`/${locale}/booking`} className="btn-gold">
              {dict.bookService}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/contact`} className="btn-light">
              {dict.contact}
            </Link>
          </div>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.excerpt || undefined,
          image: article.coverMedia?.url ? absoluteUrl(article.coverMedia.url) : undefined,
          datePublished: article.publishedAt?.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          author: { "@type": "Organization", name: "TWOK STUDIO" },
          publisher: { "@type": "Organization", name: "TWOK STUDIO" },
          mainEntityOfPage: absoluteUrl(currentPath),
          inLanguage: locale === "fr" ? "fr-MA" : "en-MA",
          keywords: article.tags.map((tag) => (locale === "fr" ? tag.nameFr : tag.nameEn)).join(", "),
        }}
      />
    </>
  );
}
