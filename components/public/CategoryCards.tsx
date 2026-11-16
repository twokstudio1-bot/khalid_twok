import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/media/SmartImage";
import type { CategoryNode } from "@/lib/content";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function CategoryCards({
  categories,
  locale,
  className,
}: {
  categories: CategoryNode[];
  locale: AppLocale;
  className?: string;
}) {
  if (!categories.length) return null;
  return (
    <div className={cn("grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {categories.map((category, index) => (
        <Link
          key={category.id}
          href={category.href}
          className={cn("group block", index % 3 === 1 ? "lg:pt-14" : index % 3 === 2 ? "lg:pt-7" : "")}
        >
          <div className="media-zoom relative aspect-[4/5] overflow-hidden bg-stone">
            <SmartImage
              src={category.coverMedia?.url}
              alt={(locale === "fr" ? category.coverMedia?.altFr : category.coverMedia?.altEn) || category.name}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
            <span className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center border border-white/40 bg-ink/10 text-[9px] tracking-[0.2em] text-white backdrop-blur-sm">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center border border-white/40 text-white opacity-0 transition-all duration-300 group-hover:border-gold group-hover:bg-gold group-hover:text-ink group-hover:opacity-100">
              <ArrowUpRight aria-hidden className="h-4 w-4" />
            </span>
          </div>
          <div className="border-b border-line pb-5 pt-4">
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-serif text-[1.8rem] leading-tight text-ink transition-colors group-hover:text-champagne">
                {category.name}
              </h3>
              {category.children.length > 0 && (
                <span className="mt-2 shrink-0 text-[8.5px] uppercase tracking-[0.16em] text-muted">
                  {category.children.length} {locale === "fr" ? "sous-univers" : "sub-worlds"}
                </span>
              )}
            </div>
            {category.description && (
              <p className="mt-2 line-clamp-2 max-w-[380px] text-[12.5px] leading-relaxed text-muted">
                {category.description}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
