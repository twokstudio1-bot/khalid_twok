import { ProjectCard, type ProjectCardData } from "@/components/site/ProjectCard";
import { EmptyState } from "@/components/public/EmptyState";
import type { AppLocale } from "@/lib/i18n";

export function ProjectGrid({
  projects,
  locale,
  emptyTitle,
  emptyText,
  bookingHref,
  bookingLabel,
  columns = 2,
}: {
  projects: ProjectCardData[];
  locale: AppLocale;
  emptyTitle: string;
  emptyText: string;
  bookingHref?: string;
  bookingLabel?: string;
  columns?: 2 | 3;
}) {
  if (!projects.length) {
    return <EmptyState title={emptyTitle} text={emptyText} href={bookingHref} linkLabel={bookingLabel} />;
  }
  return (
    <div className={columns === 3 ? "grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-x-5 gap-y-16 sm:grid-cols-2"}>
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          locale={locale}
          index={index}
          aspect={index % 3 === 1 ? "portrait" : index % 3 === 2 ? "landscape" : "tall"}
          className={index % 2 === 1 && columns === 2 ? "sm:pt-20" : ""}
        />
      ))}
    </div>
  );
}
