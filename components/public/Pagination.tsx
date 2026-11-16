import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";

export function Pagination({
  page,
  pages,
  basePath,
  searchParams,
  locale,
}: {
  page: number;
  pages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  locale: AppLocale;
}) {
  if (pages <= 1) return null;
  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const numbers = Array.from({ length: pages }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === pages || Math.abs(value - page) <= 1,
  );
  return (
    <nav aria-label="Pagination" className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-6">
      <div>
        {page > 1 ? (
          <Link href={href(page - 1)} className="link-line min-h-10 text-ink">
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
            {locale === "fr" ? "Précédent" : "Previous"}
          </Link>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted/40">
            {locale === "fr" ? "Précédent" : "Previous"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {numbers.map((value, index) => {
          const previous = numbers[index - 1];
          return (
            <span key={value} className="flex items-center gap-1">
              {previous && value - previous > 1 && <span className="px-2 text-muted/50">…</span>}
              <Link
                href={href(value)}
                aria-current={value === page ? "page" : undefined}
                className={`flex h-10 min-w-10 items-center justify-center border px-2 text-[11px] transition-colors ${
                  value === page
                    ? "border-ink bg-ink text-cream"
                    : "border-line text-muted hover:border-ink hover:text-ink"
                }`}
              >
                {value}
              </Link>
            </span>
          );
        })}
      </div>
      <div>
        {page < pages ? (
          <Link href={href(page + 1)} className="link-line min-h-10 text-ink">
            {locale === "fr" ? "Suivant" : "Next"}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted/40">
            {locale === "fr" ? "Suivant" : "Next"}
          </span>
        )}
      </div>
    </nav>
  );
}
