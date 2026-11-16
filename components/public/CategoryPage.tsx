import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import type { CategoryNode, ProjectCard as ProjectCardType } from "@/lib/content";
import type { MediaView } from "@/lib/view";
import { PageHero, HeroAction } from "@/components/public/PageHero";
import { CategoryCards } from "@/components/public/CategoryCards";
import { ProjectGrid } from "@/components/public/ProjectGrid";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Gallery } from "@/components/media/Gallery";

export function CategoryPage({
  category,
  children,
  projects,
  gallery,
  locale,
  dict,
  service,
  ancestors,
}: {
  category: { id: string; name: string; href: string; description: string | null; coverMedia: MediaView | null; galleryLayout: "GRID" | "MASONRY" | "SLIDER" | "FULLWIDTH" | "EDITORIAL" };
  children: CategoryNode[];
  projects: ProjectCardType[];
  gallery: MediaView[];
  locale: AppLocale;
  dict: Dictionary;
  service: "photo" | "video" | "drone";
  ancestors: { name: string; href: string }[];
}) {
  const serviceName = dict[service];
  return (
    <>
      <PageHero
        variant={category.coverMedia?.url ? "image" : "cream"}
        cover={category.coverMedia}
        eyebrow={`${serviceName} — ${locale === "fr" ? "Univers" : "World"}`}
        title={category.name}
        intro={category.description}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: serviceName, href: `/${locale}/${service}` },
          ...ancestors,
          { name: category.name },
        ]}
        size="compact"
      >
        <HeroAction href={`/${locale}/booking`} label={dict.bookService} variant={category.coverMedia?.url ? "gold" : "primary"} />
        <Link href={`/${locale}/contact`} className={category.coverMedia?.url ? "btn-light" : "btn-outline"}>
          {dict.requestQuote}
        </Link>
      </PageHero>

      {children.length > 0 && (
        <section className="bg-cream py-16 sm:py-24">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={dict.subcategories}
              title={locale === "fr" ? "Sous-univers." : "Sub-worlds."}
              intro={
                locale === "fr"
                  ? "Affinez votre parcours et découvrez les séries associées."
                  : "Refine your journey and discover the related series."
              }
            />
            <div className="mt-12">
              <CategoryCards categories={children} locale={locale} />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-stone py-16 sm:py-24">
        <div className="container-editorial">
          <SectionHeading
            eyebrow={dict.projects}
            title={
              projects.length
                ? locale === "fr"
                  ? "Projets de cet univers."
                  : "Projects in this world."
                : dict.noProjects
            }
            link={projects.length ? `/${locale}/booking` : undefined}
            linkLabel={projects.length ? dict.bookService : undefined}
          />
          <div className="mt-12">
            <ProjectGrid
              projects={projects}
              locale={locale}
              emptyTitle={dict.noProjects}
              emptyText={
                locale === "fr"
                  ? "Les projets de cette catégorie seront bientôt disponibles. Contactez le studio pour voir des séries complémentaires."
                  : "Projects in this category will be available soon. Contact the studio for additional series."
              }
              bookingHref={`/${locale}/contact`}
              bookingLabel={dict.contact}
            />
          </div>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="bg-cream py-16 sm:py-24">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={dict.gallery}
              title={locale === "fr" ? "Fragments visuels." : "Visual fragments."}
              link={`/${locale}/${service}`}
              linkLabel={dict.viewAll}
            />
            <div className="mt-12">
              <Gallery items={gallery} locale={locale} layout={category.galleryLayout} />
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-cream py-16">
        <div className="container-editorial flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow-gold">{locale === "fr" ? "Un projet similaire ?" : "A similar project?"}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              {locale === "fr"
                ? "Partagez votre brief et nous vous proposerons un format adapté."
                : "Share your brief and we will suggest a suitable format."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/${locale}/booking`} className="btn-primary">
              {dict.bookService}
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/${service}`} className="btn-outline">
              {dict.viewCategory}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
