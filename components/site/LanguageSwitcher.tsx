"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = { fr: "FR", en: "EN" };
const alternates: Record<string, string> = { fr: "fr-MA", en: "en-MA" };

export function LanguageSwitcher({
  current,
  available,
  variant = "dark",
}: {
  current: "fr" | "en";
  available: string[];
  variant?: "dark" | "light";
}) {
  const pathname = usePathname();

  function switchLocale(target: string) {
    if (target === current) return;
    // Cookie + navigation writes are intentional browser side effects.
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `TWOK_LOCALE=${target};path=/;max-age=31536000;samesite=lax`;
    const hrefs = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        `link[rel="alternate"][hreflang="${alternates[target]}"], link[rel="alternate"][hreflang="${target}"]`,
      ),
    )
      .map((link) => link.getAttribute("href"))
      .filter(Boolean);
    if (hrefs[0]) {
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = hrefs[0];
      return;
    }
    const segments = pathname.split("/");
    const nextSegments = [target, ...segments.slice(2)];
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `/${nextSegments.join("")}` || `/${target}`;
  }

  return (
    <div className={cn("flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.16em]")}>
      {(["fr", "en"] as const).map((locale, index) => {
        const enabled = available.includes(locale);
        return (
          <span key={locale} className="flex items-center gap-1">
            {index > 0 && <span className={variant === "light" ? "text-cream/25" : "text-line"}>/</span>}
            <button
              type="button"
              onClick={() => switchLocale(locale)}
              disabled={!enabled}
              aria-current={locale === current ? "true" : undefined}
              className={cn(
                "inline-flex min-h-10 min-w-6 items-center justify-center px-1 transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                locale === current
                  ? variant === "light"
                    ? "text-cream"
                    : "text-ink"
                  : variant === "light"
                    ? "text-cream/45 hover:text-cream"
                    : "text-muted/70 hover:text-ink",
              )}
            >
              {labels[locale]}
            </button>
          </span>
        );
      })}
    </div>
  );
}
