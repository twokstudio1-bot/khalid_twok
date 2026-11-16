import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs({
  items,
  className,
  light = false,
}: {
  items: { name: string; href?: string }[];
  className?: string;
  light?: boolean;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn("flex flex-wrap items-center gap-2 text-[9.5px] uppercase tracking-[0.18em]", className)}>
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`} className="flex items-center gap-2">
          {index > 0 && <ChevronRight aria-hidden className={cn("h-2.5 w-2.5", light ? "text-cream/35" : "text-line")} />}
          {item.href ? (
            <Link href={item.href} className={cn("transition-colors", light ? "text-cream/55 hover:text-cream" : "text-muted hover:text-ink")}>
              {item.name}
            </Link>
          ) : (
            <span className={light ? "text-cream/80" : "text-ink"}>{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
