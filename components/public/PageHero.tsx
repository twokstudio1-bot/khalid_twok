import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { SmartImage } from "@/components/media/SmartImage";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { cn } from "@/lib/utils";
import type { MediaView } from "@/lib/view";

export function PageHero({
  title,
  eyebrow,
  intro,
  cover,
  breadcrumbs,
  children,
  variant = "cream",
  size = "default",
  align = "left",
}: {
  title: string;
  eyebrow?: string;
  intro?: string | null;
  cover?: MediaView | { url: string; altFr?: string | null; altEn?: string | null } | null;
  breadcrumbs?: { name: string; href?: string }[];
  children?: ReactNode;
  variant?: "cream" | "dark" | "image";
  size?: "default" | "compact";
  align?: "left" | "center";
}) {
  const hasImage = variant === "image" && cover?.url;
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        hasImage ? "border-ink/10 bg-charcoal text-cream" : "border-line bg-cream text-ink",
      )}
    >
      {hasImage && (
        <>
          <SmartImage
            src={cover?.url}
            alt={(cover && "altFr" in cover ? cover.altFr : null) || title}
            fill
            priority
            sizes="100vw"
            className="opacity-65"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/20" />
        </>
      )}
      <div
        className={cn(
          "container-editorial relative z-10 flex flex-col",
          size === "compact" ? "pb-12 pt-24 sm:pb-16 sm:pt-32" : "pb-16 pt-28 sm:pb-24 sm:pt-40",
        )}
      >
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} light={Boolean(hasImage)} className="mb-10" />}
        <div className={cn("max-w-[1100px]", align === "center" && "mx-auto text-center")}>
          {eyebrow && (
            <p className={cn("eyebrow-gold mb-5", hasImage ? "text-gold-soft" : "text-champagne")}>{eyebrow}</p>
          )}
          <h1
            className={cn(
              "text-balance font-serif font-light leading-[0.95] tracking-[-0.025em]",
              size === "compact"
                ? "text-[clamp(2.6rem,6vw,5.8rem)]"
                : "text-[clamp(3.1rem,7.6vw,7.8rem)]",
              hasImage ? "text-cream" : "text-ink",
            )}
          >
            {title}
          </h1>
          {intro && (
            <p
              className={cn(
                "mt-7 max-w-[680px] text-[14px] leading-[1.9]",
                align === "center" && "mx-auto",
                hasImage ? "text-cream/70" : "text-muted",
              )}
            >
              {intro}
            </p>
          )}
          {children && <div className="mt-9 flex flex-wrap items-center gap-3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function HeroAction({
  href,
  label,
  variant = "primary",
  external = false,
}: {
  href: string;
  label: string;
  variant?: "primary" | "light" | "gold";
  external?: boolean;
}) {
  const className = variant === "gold" ? "btn-gold" : variant === "light" ? "btn-light" : "btn-primary";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
        <ArrowRight aria-hidden className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight aria-hidden className="h-3.5 w-3.5" />
    </Link>
  );
}
