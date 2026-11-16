import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getLatestProjects, getProjectsByIds } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsValue } from "@/lib/settings-utils";
import { ProjectCard } from "@/components/site/ProjectCard";
import { SectionHeading } from "@/components/site/SectionHeading";

export async function FeaturedProjectsSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const ids = settingsIds(settings, "projectIds");
  const projects = ids.length ? await getProjectsByIds(ids, locale) : await getLatestProjects(locale, 5);
  if (!projects.length) return null;

  return (
    <section className="bg-stone py-20 sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`05 — ${dict.projects}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
          link={`/${locale}/photo`}
          linkLabel={dict.viewAll}
        />
        <div className="mt-14 grid grid-cols-12 gap-x-4 gap-y-12 sm:gap-x-6">
          {projects.slice(0, 5).map((project, index) => (
            <div
              key={project.id}
              className={
                index === 0
                  ? "col-span-12"
                  : index === 1
                    ? "col-span-12 sm:col-span-7"
                    : index === 2
                      ? "col-span-12 sm:col-span-5"
                      : "col-span-12 sm:col-span-6"
              }
            >
              <ProjectCard
                project={project}
                locale={locale}
                index={index}
                aspect={index === 0 ? "wide" : index === 3 ? "landscape" : "tall"}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
