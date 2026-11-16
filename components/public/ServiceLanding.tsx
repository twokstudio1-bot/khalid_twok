import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import type { CategoryNode, ProjectCard as ProjectCardType } from "@/lib/content";
import type { MediaView } from "@/lib/view";
import { PageHero, HeroAction } from "@/components/public/PageHero";
import { CategoryCards } from "@/components/public/CategoryCards";
import { ProjectGrid } from "@/components/public/ProjectGrid";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Reveal } from "@/components/site/Reveal";

const serviceCopy = {
  PHOTO: {
    fr: {
      eyebrow: "01 — Photographie",
      title: "La photographie,\ncomme un récit.",
      intro:
        "Corporate, portrait, hôtellerie, immobilier, food ou produit : une écriture attentive à la lumière, aux matières et aux gestes. Chaque série est construite pour durer.",
      seoTitle: "Photographie à Marrakech",
      seoDescription:
        "Photographie professionnelle à Marrakech : corporate, portrait, hôtellerie, immobilier, food, produit et mode. Une direction sensible et précise.",
    },
    en: {
      eyebrow: "01 — Photography",
      title: "Photography,\nas storytelling.",
      intro:
        "Corporate, portrait, hospitality, real estate, food or product: imagery attentive to light, materials and gestures. Every series is built to last.",
      seoTitle: "Photography in Marrakech",
      seoDescription:
        "Professional photography in Marrakech: corporate, portrait, hospitality, real estate, food, product and fashion. Sensitive, precise art direction.",
    },
  },
  VIDEO: {
    fr: {
      eyebrow: "02 — Vidéo",
      title: "Des films\nqui ont du sens.",
      intro:
        "Films de marque, interviews, aftermovies et formats sociaux. Du repérage au montage, une production pensée pour le rythme et pour la diffusion.",
      seoTitle: "Production vidéo à Marrakech",
      seoDescription:
        "Production vidéo à Marrakech : films de marque, corporate, interviews, mariages, événements et contenus sociaux. Écriture, tournage et post-production.",
    },
    en: {
      eyebrow: "02 — Video",
      title: "Films that\nmean something.",
      intro:
        "Brand films, interviews, aftermovies and social formats. From location scouting to editing, production designed for rhythm and distribution.",
      seoTitle: "Video production in Marrakech",
      seoDescription:
        "Video production in Marrakech: brand films, corporate, interviews, weddings, events and social content. Storytelling, filming and post-production.",
    },
  },
  DRONE: {
    fr: {
      eyebrow: "03 — Drone",
      title: "Le point de vue\nqui change tout.",
      intro:
        "Architecture, hôtellerie, paysages et films aériens. Une perspective maîtrisée, préparée avec soin et toujours au service du lieu.",
      seoTitle: "Drone et prises de vue aériennes à Marrakech",
      seoDescription:
        "Photographie et vidéo aériennes à Marrakech : immobilier, hôtels, architecture, paysages, événements et suivi de chantier.",
    },
    en: {
      eyebrow: "03 — Drone",
      title: "The perspective\nthat changes everything.",
      intro:
        "Architecture, hospitality, landscapes and aerial films. A controlled perspective, carefully prepared and always in service of the place.",
      seoTitle: "Drone and aerial photography in Marrakech",
      seoDescription:
        "Aerial photography and video in Marrakech: real estate, hotels, architecture, landscapes, events and construction monitoring.",
    },
  },
} as const;

export function serviceSeo(service: "PHOTO" | "VIDEO" | "DRONE", locale: AppLocale) {
  return serviceCopy[service][locale];
}

export async function ServiceLandingPage({
  service,
  locale,
  dict,
  categories,
  projects,
}: {
  service: "PHOTO" | "VIDEO" | "DRONE";
  locale: AppLocale;
  dict: Dictionary;
  categories: CategoryNode[];
  projects: ProjectCardType[];
}) {
  const copy = serviceCopy[service][locale];
  const cover = categories.find((category) => category.coverMedia?.url)?.coverMedia as MediaView | undefined;

  return (
    <>
      <PageHero
        variant="image"
        cover={cover ?? null}
        eyebrow={copy.eyebrow}
        title={copy.title}
        intro={copy.intro}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: dict[service.toLowerCase() as "photo" | "video" | "drone"] },
        ]}
      >
        <HeroAction href={`/${locale}/booking`} label={dict.bookService} variant="gold" />
        <Link href={`/${locale}/contact`} className="btn-light">
          {dict.requestQuote}
        </Link>
      </PageHero>

      {categories.length > 0 && (
        <section className="bg-cream py-20 sm:py-28">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={`${locale === "fr" ? "Univers" : "Worlds"} — ${String(categories.length).padStart(2, "0")}`}
              title={locale === "fr" ? "Explorez nos spécialités." : "Explore our specialities."}
              intro={
                locale === "fr"
                  ? "Chaque univers ouvre sur une sélection de projets, de formats et d'approches."
                  : "Each world opens onto a selection of projects, formats and approaches."
              }
            />
            <div className="mt-14">
              <CategoryCards categories={categories} locale={locale} />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-stone py-20 sm:py-28">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={dict.featuredWork}
            title={locale === "fr" ? "Une sélection\nrécente." : "A recent\nselection."}
            intro={
              locale === "fr"
                ? "Des projets pensés comme des histoires complètes, du premier repérage à la dernière image."
                : "Projects conceived as complete stories, from the first scout to the final frame."
            }
            link={`/${locale}/booking`}
            linkLabel={dict.bookService}
          />
          <Reveal className="mt-14">
            <ProjectGrid
              projects={projects}
              locale={locale}
              emptyTitle={dict.noProjects}
              emptyText={
                locale === "fr"
                  ? "De nouveaux projets seront publiés prochainement. Contactez-nous pour découvrir des séries complémentaires."
                  : "New projects will be published soon. Contact us to discover additional series."
              }
              bookingHref={`/${locale}/contact`}
              bookingLabel={dict.contact}
            />
          </Reveal>
        </div>
      </section>

      <section className="bg-cream py-20 sm:py-24">
        <div className="container-editorial grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div>
            <p className="eyebrow-gold">{locale === "fr" ? "Prochaine étape" : "Next step"}</p>
            <h2 className="mt-5 max-w-lg font-serif text-[clamp(2.5rem,5vw,4.8rem)] leading-[0.98] text-ink">
              {locale === "fr" ? "Parlons de votre projet." : "Let's talk about your project."}
            </h2>
          </div>
          <div className="flex flex-col justify-between border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            <p className="max-w-md text-sm leading-[1.9] text-muted">
              {locale === "fr"
                ? "Un brief, une date ou simplement une idée ? Nous vous répondons avec une proposition claire, adaptée au format et au calendrier."
                : "A brief, a date or simply an idea? We will reply with a clear proposal tailored to your format and timeline."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/${locale}/booking`} className="btn-primary">
                {dict.bookService}
                <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/${locale}/contact`} className="btn-outline">
                {dict.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
