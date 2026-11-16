import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n";
import { getMediaByIds } from "@/lib/content";
import { internalHref } from "@/lib/utils";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsNumber, settingsString, settingsValue } from "@/lib/settings-utils";
import { HeroMedia } from "@/components/media/HeroMedia";

export async function HeroSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const posterId = settingsString(settings, "posterMediaId");
  const videoId = settingsString(settings, "videoMediaId");
  const media = await getMediaByIds([posterId, videoId].filter(Boolean));
  const poster = media.find((item) => item.id === posterId) ?? media.find((item) => item.kind === "IMAGE");
  const video = media.find((item) => item.id === videoId && item.kind === "VIDEO");
  const heading = settingsValue(settings, "heading", locale);
  const subtitle = settingsValue(settings, "subtitle", locale);
  const ctaLabel = settingsValue(settings, "ctaLabel", locale);
  const ctaUrl = settingsString(settings, "ctaUrl", "/photo");
  const secondaryLabel = settingsValue(settings, "secondaryLabel", locale);
  const secondaryUrl = settingsString(settings, "secondaryUrl", "");
  const overlay = settingsNumber(settings, "overlay", 35);
  const showScroll = settingsBoolDefault(settings, "showScroll", true);

  return (
    <section className="relative flex min-h-[calc(100svh-74px)] flex-col overflow-hidden bg-charcoal text-cream">
      <HeroMedia
        posterUrl={poster?.url ?? video?.posterUrl ?? video?.thumbnailUrl ?? null}
        videoUrl={video?.url ?? null}
        overlay={overlay}
        alt={poster?.altFr ?? heading ?? "TWOK STUDIO"}
        priority
      />

      <div className="container-editorial relative z-10 flex flex-1 flex-col pb-8 pt-20 sm:pb-10 sm:pt-28">
        <div className="flex items-start justify-between gap-6">
          <p className="text-[9px] uppercase tracking-[0.32em] text-cream/55">
            {settingsValue(settings, "eyebrow", locale, locale === "fr" ? "Marrakech · Studio créatif" : "Marrakech · Creative studio")}
          </p>
          <p className="hidden max-w-[130px] text-right text-[9px] uppercase leading-[1.8] tracking-[0.2em] text-cream/40 sm:block">
            {locale === "fr" ? "Photographie\nVidéo\nDrone" : "Photography\nFilm\nDrone"}
          </p>
        </div>

        <div className="mt-auto max-w-[1050px] pt-24">
          <h1 className="whitespace-pre-line font-serif text-[clamp(3.6rem,9.5vw,9.2rem)] font-light leading-[0.88] tracking-[-0.03em] text-cream [text-shadow:0_2px_40px_rgba(0,0,0,0.18)]">
            {heading}
          </h1>
          {subtitle && (
            <p className="mt-7 max-w-xl text-[11px] uppercase leading-[1.9] tracking-[0.24em] text-cream/70">{subtitle}</p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
            {ctaLabel && (
              <Link href={internalHref(ctaUrl, locale)} className="btn-gold">
                {ctaLabel}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            )}
            {secondaryLabel && secondaryUrl && (
              <Link href={internalHref(secondaryUrl, locale)} className="btn-light">
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-12 flex items-end justify-between gap-6 border-t border-cream/15 pt-5">
          <div className="flex items-center gap-3">
            {showScroll && (
              <span className="flex h-8 w-8 items-center justify-center border border-cream/20">
                <ArrowDown aria-hidden className="h-3 w-3 text-cream/60" />
              </span>
            )}
            <span className="text-[8px] uppercase tracking-[0.26em] text-cream/40">
              {locale === "fr" ? "Faire défiler" : "Scroll to explore"}
            </span>
          </div>
          <p className="text-[8px] uppercase tracking-[0.26em] text-cream/40">
            {locale === "fr" ? "Marrakech · Maroc" : "Marrakech · Morocco"}
          </p>
        </div>
      </div>
    </section>
  );
}

function settingsBoolDefault(settings: BlockSettings, key: string, fallback: boolean) {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}
