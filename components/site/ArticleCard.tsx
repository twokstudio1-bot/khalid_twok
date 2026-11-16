import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/media/SmartImage";
import { formatDate } from "@/lib/utils";
import type { MediaView } from "@/lib/view";

export type ArticleCardData = {
  id: string;
  href: string;
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | string | null;
  coverMedia?: MediaView | null;
  category?: { nameFr: string; nameEn: string } | null;
};

export function ArticleCard({
  article,
  locale,
  featured = false,
}: {
  article: ArticleCardData;
  locale: "fr" | "en";
  featured?: boolean;
}) {
  const categoryName = article.category
    ? locale === "fr"
      ? article.category.nameFr
      : article.category.nameEn
    : null;
  return (
    <Link href={article.href} className="group flex flex-col">
      <div className={`relative overflow-hidden bg-stone ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <SmartImage
          src={article.coverMedia?.url}
          alt={
            (article.coverMedia && (locale === "fr" ? article.coverMedia.altFr : article.coverMedia.altEn)) ||
            article.title
          }
          fill
          sizes={featured ? "100vw" : "(max-width: 768px) 100vw, 33vw"}
          className="transition-transform duration-[900ms] group-hover:scale-[1.025]"
        />
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <div className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-muted">
          {article.publishedAt && <time dateTime={new Date(article.publishedAt).toISOString()}>{formatDate(article.publishedAt, locale)}</time>}
          {article.publishedAt && categoryName && <span className="h-2.5 w-px bg-line" />}
          {categoryName && <span className="text-champagne">{categoryName}</span>}
        </div>
        <h3 className={`mt-3 font-serif leading-[1.12] text-ink transition-colors group-hover:text-champagne ${featured ? "text-[2.1rem] sm:text-[3rem]" : "text-[1.7rem]"}`}>
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted">{article.excerpt}</p>
        )}
        <span className="mt-5 inline-flex items-center gap-2 text-[9.5px] font-medium uppercase tracking-[0.2em] text-ink">
          {locale === "fr" ? "Lire l'article" : "Read article"}
          <ArrowRight aria-hidden className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
