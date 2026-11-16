import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getMediaByIds } from "@/lib/content";
import { internalHref } from "@/lib/utils";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsString, settingsValue } from "@/lib/settings-utils";
import { SmartImage } from "@/components/media/SmartImage";
import { Reveal } from "@/components/site/Reveal";

export async function IntroSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const imageId = settingsString(settings, "imageMediaId");
  const media = imageId ? (await getMediaByIds([imageId]))[0] : null;
  const title = settingsValue(settings, "title", locale);
  const body = settingsValue(settings, "body", locale);
  const ctaLabel = settingsValue(settings, "ctaLabel", locale);
  const ctaUrl = settingsString(settings, "ctaUrl", "/studio");
  const signature = settingsValue(settings, "signature", locale);

  return (
    <section className="bg-cream py-20 sm:py-28 lg:py-36">
      <div className="container-editorial grid gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-6 lg:pt-10">
          <div className="flex items-center gap-4">
            <span className="font-serif text-[13px] italic text-champagne">01</span>
            <span className="h-px w-10 bg-champagne/60" />
            <span className="eyebrow">{dict.studio}</span>
          </div>
          <h2 className="mt-7 max-w-[620px] font-serif text-[clamp(2.6rem,5.3vw,4.9rem)] leading-[0.98] tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {body && (
            <p className="mt-8 max-w-[500px] whitespace-pre-line text-[14px] leading-[1.95] text-muted">{body}</p>
          )}
          {ctaLabel && (
            <Link href={internalHref(ctaUrl, locale)} className="link-line mt-9 text-ink">
              {ctaLabel}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          )}
          {signature && (
            <div className="mt-14 flex items-center gap-4 border-t border-line pt-5">
              <span className="h-8 w-8 border border-champagne/50" aria-hidden />
              <span className="text-[9.5px] uppercase tracking-[0.2em] text-muted">{signature}</span>
            </div>
          )}
        </Reveal>

        <div className="lg:col-span-6 lg:pl-8">
          <Reveal delay={0.08}>
            <div className="relative aspect-[4/5] overflow-hidden bg-stone">
              <SmartImage
                src={media?.url}
                alt={(media && (locale === "fr" ? media.altFr : media.altEn)) || "TWOK STUDIO"}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className="absolute bottom-0 left-0 bg-cream/95 px-5 py-4 backdrop-blur-sm">
                <p className="font-serif text-lg italic text-ink">TWOK STUDIO</p>
                <p className="mt-1 text-[8px] uppercase tracking-[0.25em] text-muted">Marrakech · Morocco</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
