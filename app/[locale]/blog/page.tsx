import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getArticleCategories, getArticles } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { PageHero } from "@/components/public/PageHero";
import { ArticleCard } from "@/components/site/ArticleCard";
import { BlogSearch } from "@/components/public/BlogSearch";
import { Pagination } from "@/components/public/Pagination";
import { EmptyState } from "@/components/public/EmptyState";
import { JsonLd } from "@/components/public/JsonLd";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ locale: raw }, search] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) return {};
  const query = first(search.q)?.trim();
  const category = first(search.category);
  const page = Math.max(1, Number(first(search.page) ?? 1) || 1);
  return buildMetadata({
    locale: raw,
    title: raw === "fr" ? "Le journal" : "The journal",
    description:
      raw === "fr"
        ? "Notes de terrain, conseils et regards sur la photographie, la vidéo et le drone à Marrakech."
        : "Field notes, advice and perspectives on photography, video and drone in Marrakech.",
    canonicalPath: `/${raw}/blog`,
    paths: { fr: "/fr/blog", en: "/en/blog" },
    noindex: Boolean(query || category || page > 1),
  });
}

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: raw }, search] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const dict = getDictionary(locale);
  const query = first(search.q)?.trim() ?? "";
  const categorySlug = first(search.category) ?? "";
  const page = Math.max(1, Number(first(search.page) ?? 1) || 1);

  const [result, categories] = await Promise.all([
    getArticles({ locale, page, perPage: 9, query: query || undefined, categorySlug: categorySlug || undefined }),
    getArticleCategories(),
  ]);
  const featured = !query && !categorySlug && page === 1 ? result.items.find((article) => article.featured) : undefined;
  const rest = featured ? result.items.filter((article) => article.id !== featured.id) : result.items;

  return (
    <>
      <PageHero
        eyebrow={locale === "fr" ? "Notes & regards" : "Notes & perspectives"}
        title={locale === "fr" ? "Le journal." : "The journal."}
        intro={
          locale === "fr"
            ? "Conseils de production, coulisses et réflexions sur l'image. Des articles écrits par le studio, à lire avant de lancer un projet."
            : "Production advice, behind the scenes and thoughts on image-making. Articles written by the studio, to read before starting a project."
        }
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: dict.blog },
        ]}
      />

      <section className="bg-cream py-12 sm:py-16">
        <div className="container-editorial">
          <div className="flex flex-col gap-6 border-y border-line py-6 lg:flex-row lg:items-center lg:justify-between">
            <BlogSearch locale={locale} query={query} category={categorySlug} />
            <div className="flex shrink-0 flex-wrap gap-2" role="group" aria-label={dict.categories}>
              <Link
                href={`/${locale}/blog${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                className={cn(
                  "inline-flex min-h-10 items-center border px-3 py-2 text-[9px] uppercase tracking-[0.16em] transition-colors",
                  !categorySlug ? "border-ink bg-ink text-cream" : "border-line text-muted hover:border-ink hover:text-ink",
                )}
              >
                {dict.allCategories}
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${locale}/blog?category=${encodeURIComponent(locale === "fr" ? category.slugFr : category.slugEn)}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                  className={cn(
                    "inline-flex min-h-10 items-center border px-3 py-2 text-[9px] uppercase tracking-[0.16em] transition-colors",
                    categorySlug === (locale === "fr" ? category.slugFr : category.slugEn)
                      ? "border-ink bg-ink text-cream"
                      : "border-line text-muted hover:border-ink hover:text-ink",
                  )}
                >
                  {locale === "fr" ? category.nameFr : category.nameEn}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              {result.total} {locale === "fr" ? (result.total > 1 ? "articles" : "article") : result.total > 1 ? "articles" : "article"}
              {query ? ` — « ${query} »` : ""}
            </p>
            {categorySlug && <p className="text-[10px] uppercase tracking-[0.18em] text-champagne">{categorySlug.replace(/-/g, " ")}</p>}
          </div>

          {result.items.length === 0 ? (
            <div className="mt-12">
              <EmptyState
                title={locale === "fr" ? "Aucun article trouvé." : "No articles found."}
                text={
                  locale === "fr"
                    ? "Essayez une autre recherche ou explorez toutes les catégories du journal."
                    : "Try another search or explore all journal categories."
                }
                href={`/${locale}/blog`}
                linkLabel={locale === "fr" ? "Réinitialiser la recherche" : "Reset search"}
              />
            </div>
          ) : featured ? (
            <div className="mt-12">
              <Link href={featured.href} className="group grid gap-8 lg:grid-cols-2 lg:gap-12">
                <ArticleCard article={featured} locale={locale} featured />
                <div className="hidden flex-col justify-end border-t border-line pt-6 lg:flex lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
                  <p className="eyebrow-gold">{locale === "fr" ? "À la une" : "Featured"}</p>
                  <p className="mt-4 max-w-md text-sm leading-[1.9] text-muted">
                    {locale === "fr"
                      ? "Chaque mois, nous partageons une lecture concrète de notre métier : préparation, lumière, récit et fabrication."
                      : "Each month, we share a practical view of our craft: preparation, light, storytelling and production."}
                  </p>
                  <span className="link-line mt-7 text-ink">{dict.readMore}</span>
                </div>
              </Link>
              {rest.length > 0 && (
                <div className="mt-20 grid gap-10 border-t border-line pt-14 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                  {rest.map((article) => (
                    <ArticleCard key={article.id} article={article} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {result.items.map((article) => (
                <ArticleCard key={article.id} article={article} locale={locale} />
              ))}
            </div>
          )}

          <Pagination
            page={result.page}
            pages={result.pages}
            basePath={`/${locale}/blog`}
            searchParams={{ q: query || undefined, category: categorySlug || undefined }}
            locale={locale}
          />
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: locale === "fr" ? "Le journal TWOK STUDIO" : "The TWOK STUDIO journal",
          url: absoluteUrl(`/${locale}/blog`),
          inLanguage: locale === "fr" ? "fr-MA" : "en-MA",
          publisher: { "@type": "Organization", name: "TWOK STUDIO" },
        }}
      />
    </>
  );
}
