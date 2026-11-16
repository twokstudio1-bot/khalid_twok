import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  link,
  linkLabel,
  className,
  align = "left",
  light = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: string | null;
  link?: string;
  linkLabel?: string;
  className?: string;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <Reveal className={cn(align === "center" && "text-center", className)}>
      {eyebrow && <p className={cn("eyebrow-gold mb-5", light && "text-gold")}>{eyebrow}</p>}
      <div
        className={cn(
          "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
          align === "center" && "sm:flex-col sm:items-center",
        )}
      >
        <h2
          className={cn(
            "max-w-[820px] font-serif text-[clamp(2.4rem,5vw,4.7rem)] leading-[0.98] tracking-[-0.02em]",
            light ? "text-cream" : "text-ink",
          )}
        >
          {title}
        </h2>
        {link && linkLabel && (
          <Link
            href={link}
            className={cn(
              "link-line shrink-0 pb-1",
              light ? "text-cream/70 hover:text-gold" : "text-ink/65 hover:text-ink",
            )}
          >
            {linkLabel}
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {intro && (
        <p
          className={cn(
            "mt-6 max-w-[560px] text-[14px] leading-[1.9]",
            light ? "text-cream/55" : "text-muted",
            align === "center" && "mx-auto",
          )}
        >
          {intro}
        </p>
      )}
    </Reveal>
  );
}
