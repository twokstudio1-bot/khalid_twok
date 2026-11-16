import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  locale,
  variant = "dark",
  className,
  tagline = "Marrakech",
}: {
  locale: string;
  variant?: "dark" | "light";
  className?: string;
  tagline?: string;
}) {
  return (
    <Link
      href={`/${locale}`}
      aria-label={locale === "en" ? "TWOK STUDIO — Home" : "TWOK STUDIO — Accueil"}
      className={cn("group inline-flex flex-col leading-none", className)}
    >
      <span
        className={cn(
          "font-serif text-[28px] tracking-[0.16em] transition-colors sm:text-[30px]",
          variant === "light" ? "text-cream" : "text-ink",
        )}
      >
        TWOK
      </span>
      <span
        className={cn(
          "mt-1 flex items-center gap-2 text-[7.5px] font-medium uppercase tracking-[0.4em]",
          variant === "light" ? "text-cream/55" : "text-muted",
        )}
      >
        Studio
        <span className={cn("h-px w-4", variant === "light" ? "bg-gold/70" : "bg-champagne/70")} />
        {tagline}
      </span>
    </Link>
  );
}
