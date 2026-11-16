import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getServiceLandingCovers } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsValue } from "@/lib/settings-utils";
import { SmartImage } from "@/components/media/SmartImage";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Reveal } from "@/components/site/Reveal";

const services = [
  {
    key: "photo",
    number: "01",
    titleFr: "Photographie",
    titleEn: "Photography",
    descriptionFr:
      "Corporate, mariage, immobilier, portrait, hôtellerie, food et produit. Une image précise, de la direction au post-traitement.",
    descriptionEn:
      "Corporate, weddings, real estate, portrait, hospitality, food and product. Precise imagery, from direction to post-production.",
    href: "/photo",
  },
  {
    key: "video",
    number: "02",
    titleFr: "Vidéographie",
    titleEn: "Videography",
    descriptionFr:
      "Films de marque, interviews, aftermovies et formats sociaux. Des récits pensés pour le montage et la diffusion.",
    descriptionEn:
      "Brand films, interviews, aftermovies and social formats. Stories designed for the edit and for distribution.",
    href: "/video",
  },
  {
    key: "drone",
    number: "03",
    titleFr: "Drone",
    titleEn: "Drone",
    descriptionFr:
      "Architecture, hôtellerie, paysages et films aériens. Un regard maîtrisé, au service du lieu.",
    descriptionEn:
      "Architecture, hospitality, landscapes and aerial films. A controlled perspective, in service of the place.",
    href: "/drone",
  },
] as const;

export async function ServicesSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const covers = await getServiceLandingCovers(locale);

  return (
    <section className="bg-cream py-20 sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`04 — ${locale === "fr" ? "Prestations" : "Services"}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
        />
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
          {services.map((service, index) => (
            <Reveal key={service.key} delay={index * 0.08} className={index === 1 ? "md:pt-14" : index === 2 ? "md:pt-28" : ""}>
              <Link href={`/${locale}${service.href}`} className="group block">
                <div className="media-zoom relative aspect-[3/4] overflow-hidden bg-stone">
                  <SmartImage
                    src={covers[service.key].cover}
                    alt={locale === "fr" ? service.titleFr : service.titleEn}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 text-[9px] uppercase tracking-[0.26em] text-cream/80">
                    {service.number}
                  </span>
                  <span className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center border border-white/40 text-white transition-colors duration-300 group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
                    <ArrowUpRight aria-hidden className="h-4 w-4" />
                  </span>
                </div>
                <div className="border-b border-line pb-6 pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-[2rem] leading-none text-ink">{locale === "fr" ? service.titleFr : service.titleEn}</h3>
                    <span className="text-[9px] uppercase tracking-[0.16em] text-muted">
                      {covers[service.key].count} {dict.categories.toLowerCase()}
                    </span>
                  </div>
                  <p className="mt-3 max-w-[360px] text-[12.5px] leading-[1.8] text-muted">
                    {locale === "fr" ? service.descriptionFr : service.descriptionEn}
                  </p>
                  <span className="link-line mt-5 text-ink">
                    {dict.discover}
                    <ArrowUpRight aria-hidden className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
