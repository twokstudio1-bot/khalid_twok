import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getArticles, getArticlesByIds } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsValue } from "@/lib/settings-utils";
import { ArticleCard } from "@/components/site/ArticleCard";
import { SectionHeading } from "@/components/site/SectionHeading";
import { SmartImage } from "@/components/media/SmartImage";
import { formatDate } from "@/lib/utils";

export async function BlogHighlightsSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const ids = settingsIds(settings, "articleIds");
  let articles: {
    id: string;
    title: string;
    href: string;
    excerpt?: string | null;
    coverMedia?: import("@/lib/view").MediaView | null;
    publishedAt?: Date | string | null;
    category?: { nameFr: string; nameEn: string } | null;
  }[] = [];
  if (ids.length) {
    articles = await getArticlesByIds(ids, locale);
  } else {
    const result = await getArticles({ locale, perPage: 3 });
    articles = result.items;
  }
  if (!articles.length) return null;

  return (
    <section className="bg-cream py-20 sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`08 — ${dict.latestArticles}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
          link={`/${locale}/blog`}
          linkLabel={dict.viewAll}
        />
        <div className="mt-14 grid gap-10 md:grid-cols-12 md:gap-8">
          {articles[0] && (
            <div className="md:col-span-7">
              <ArticleCard key={articles[0].id} article={articles[0]} locale={locale} featured />
            </div>
          )}
          {articles.length > 1 && (
            <div className="md:col-span-5 md:pt-16">
              {articles.slice(1, 3).map((article) => {
                const cover = article.coverMedia;
                const alt = (cover && (locale === "fr" ? cover.altFr : cover.altEn)) || article.title;
                return (
                  <Link
                    key={article.id}
                    href={article.href}
                    className="group grid grid-cols-[92px_1fr] gap-4 border-t border-line py-5 first:border-t-0 first:pt-0"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone">
                      <SmartImage src={cover?.url} alt={alt} fill sizes="92px" className="transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <div className="flex min-w-0 flex-col justify-center">
                      <p className="text-[8.5px] uppercase tracking-[0.16em] text-muted">
                        {article.publishedAt && <time dateTime={new Date(article.publishedAt).toISOString()}>{formatDate(article.publishedAt, locale)}</time>}
                        {article.category && <span className="ml-2 text-champagne">{locale === "fr" ? article.category.nameFr : article.category.nameEn}</span>}
                      </p>
                      <h3 className="mt-2 font-serif text-[1.45rem] leading-[1.12] text-ink transition-colors group-hover:text-champagne">
                        {article.title}
                      </h3>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-muted">
                        {dict.readMore}
                        <ArrowRight aria-hidden className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
