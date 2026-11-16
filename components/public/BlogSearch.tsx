import Link from "next/link";
import { Search, X } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";

export function BlogSearch({
  locale,
  query,
  category,
}: {
  locale: AppLocale;
  query?: string;
  category?: string;
}) {
  return (
    <form action={`/${locale}/blog`} method="get" className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
      {category && <input type="hidden" name="category" value={category} />}
      <label htmlFor="blog-search" className="sr-only">{locale === "fr" ? "Rechercher" : "Search"}</label>
      <div className="relative flex-1">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          id="blog-search"
          name="q"
          defaultValue={query}
          placeholder={locale === "fr" ? "Rechercher un article…" : "Search an article…"}
          className="field pl-9"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary !px-5 !py-2.5">
          {locale === "fr" ? "Rechercher" : "Search"}
        </button>
        {(query || category) && (
          <Link href={`/${locale}/blog`} aria-label={locale === "fr" ? "Réinitialiser" : "Reset"} className="flex h-[42px] w-[42px] items-center justify-center border border-line text-muted hover:border-ink hover:text-ink">
            <X aria-hidden className="h-4 w-4" />
          </Link>
        )}
      </div>
    </form>
  );
}
