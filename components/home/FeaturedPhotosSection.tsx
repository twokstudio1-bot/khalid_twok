import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getFeaturedProjects, getProjectsByIds } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsValue } from "@/lib/settings-utils";
import { ProjectCard } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/site/SectionHeading";

export async function FeaturedPhotosSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const ids = settingsIds(settings, "projectIds");
  const projects = ids.length ? await getProjectsByIds(ids, locale) : await getFeaturedProjects(locale, 3);
  if (!projects.length) return null;

  return (
    <section className="bg-stone py-20 sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`02 — ${locale === "fr" ? "Photographie" : "Photography"}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
          link={`/${locale}/photo`}
          linkLabel={dict.viewAll}
        />
        <div className="mt-14 grid grid-cols-12 gap-x-4 gap-y-12 sm:gap-x-6">
          {projects.slice(0, 3).map((project, index) => {
            const layout =
              index === 0
                ? "col-span-12 sm:col-span-7"
                : index === 1
                  ? "col-span-12 sm:col-span-5 sm:pt-28"
                  : "col-span-12 sm:col-span-6 sm:col-start-4";
            return (
              <div key={project.id} className={layout}>
                <ProjectCard
                  project={project}
                  locale={locale}
                  index={index}
                  aspect={index === 1 ? "portrait" : index === 2 ? "wide" : "tall"}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
