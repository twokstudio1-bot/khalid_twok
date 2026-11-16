import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "@/components/media/SmartImage";
import { cn, formatDate } from "@/lib/utils";
import type { MediaView } from "@/lib/view";

export type ProjectCardData = {
  id: string;
  href: string;
  title: string;
  summary?: string | null;
  categoryNames?: string[];
  coverMedia?: MediaView | null;
  location?: string | null;
  projectDate?: Date | string | null;
};

export function ProjectCard({
  project,
  locale,
  aspect = "portrait",
  showMeta = true,
  index,
  className,
}: {
  project: ProjectCardData;
  locale: "fr" | "en";
  aspect?: "portrait" | "landscape" | "wide" | "tall";
  showMeta?: boolean;
  index?: number;
  className?: string;
}) {
  const aspectClass = {
    portrait: "aspect-[4/5]",
    landscape: "aspect-[4/3]",
    wide: "aspect-[16/9]",
    tall: "aspect-[3/4]",
  }[aspect];
  const alt = project.coverMedia
    ? (locale === "fr" ? project.coverMedia.altFr : project.coverMedia.altEn) || project.title
    : project.title;

  return (
    <Link href={project.href} className={cn("group block", className)}>
      <div className={cn("media-zoom relative overflow-hidden bg-stone", aspectClass)}>
        <SmartImage
          src={project.coverMedia?.url}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="absolute right-4 top-4 flex h-9 w-9 translate-y-1 items-center justify-center border border-white/45 bg-white/10 text-white opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </div>
        {typeof index === "number" && (
          <span className="absolute bottom-4 left-4 text-[9px] uppercase tracking-[0.24em] text-white/75">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
      </div>
      {showMeta && (
        <div className="flex items-start justify-between gap-4 pt-4">
          <div>
            {project.categoryNames && project.categoryNames.length > 0 && (
              <p className="eyebrow-gold mb-1.5 text-[9px]">{project.categoryNames.slice(0, 2).join(" · ")}</p>
            )}
            <h3 className="font-serif text-[1.6rem] leading-tight text-ink transition-colors group-hover:text-champagne sm:text-[1.8rem]">
              {project.title}
            </h3>
            {project.summary && (
              <p className="mt-2 max-w-[420px] text-[12.5px] leading-relaxed text-muted">{project.summary}</p>
            )}
          </div>
          <div className="shrink-0 text-right text-[9.5px] uppercase tracking-[0.14em] text-muted/80">
            {project.location && <p>{project.location}</p>}
            {project.projectDate && <p className="mt-1">{formatDate(project.projectDate, locale).slice(-4)}</p>}
          </div>
        </div>
      )}
    </Link>
  );
}
