import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getMediaByIds, getProjectVideos, getProjectsByIds } from "@/lib/content";
import { pickTranslation } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsValue } from "@/lib/settings-utils";
import { Gallery } from "@/components/media/Gallery";
import { SmartImage } from "@/components/media/SmartImage";
import { SectionHeading } from "@/components/site/SectionHeading";
import type { MediaView } from "@/lib/view";

export async function FeaturedVideoSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const projectIds = settingsIds(settings, "projectIds");
  const videoIds = settingsIds(settings, "videoMediaIds");
  const projects = projectIds.length ? await getProjectsByIds(projectIds, locale) : [];
  const projectVideos = await getProjectVideos(projectIds);
  let videos: MediaView[] = videoIds.length ? await getMediaByIds(videoIds) : [];
  videos = videos.filter((item) => item.kind === "VIDEO");
  if (!videos.length) {
    videos = projectVideos
      .filter((row) => row.media.kind === "VIDEO")
      .map((row) => {
        const translation = pickTranslation(row.project.translations, locale);
        return {
          id: row.media.id,
          kind: row.media.kind,
          url: row.media.url,
          thumbnailUrl: row.media.thumbnailUrl,
          posterUrl: row.media.posterUrl,
          mimeType: row.media.mimeType,
          width: row.media.width,
          height: row.media.height,
          altFr: row.media.altFr,
          altEn: row.media.altEn,
          captionFr: translation?.title ?? row.media.captionFr,
          captionEn: translation?.title ?? row.media.captionEn,
          originalName: row.media.originalName,
        };
      });
  }

  return (
    <section className="bg-charcoal py-20 text-cream sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`03 — ${locale === "fr" ? "Vidéo" : "Film"}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
          link={`/${locale}/video`}
          linkLabel={dict.viewAll}
          light
        />

        {videos.length > 0 ? (
          <div className="mt-14">
            <Gallery items={videos} locale={locale} layout="SLIDER" />
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-14 grid gap-3 sm:grid-cols-2 sm:gap-5">
            {projects.slice(0, 2).map((project) => (
              <Link key={project.id} href={project.href} className="group relative aspect-[16/10] overflow-hidden bg-graphite">
                <SmartImage
                  src={project.coverMedia?.url}
                  alt={(locale === "fr" ? project.coverMedia?.altFr : project.coverMedia?.altEn) || project.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="opacity-75 transition-all duration-[900ms] group-hover:scale-[1.02] group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-ink/20" />
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-cream/40 bg-ink/20 text-cream backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
                  <Play aria-hidden className="ml-1 h-5 w-5 fill-current" />
                </span>
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-6">
                  <div>
                    <p className="eyebrow-gold text-[8px]">{project.categoryNames?.slice(0, 2).join(" · ")}</p>
                    <h3 className="mt-2 font-serif text-2xl text-cream sm:text-3xl">{project.title}</h3>
                  </div>
                  <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-cream/70" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-14 border border-cream/10 p-10 text-center text-sm text-cream/40">
            {dict.noContent}
          </div>
        )}
      </div>
    </section>
  );
}
