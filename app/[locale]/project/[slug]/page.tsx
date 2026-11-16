import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getProjectBySlug } from "@/lib/content";
import { canPreview } from "@/lib/preview";
import { buildMetadata } from "@/lib/seo";
import { renderMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";
import { PageHero, HeroAction } from "@/components/public/PageHero";
import { Gallery } from "@/components/media/Gallery";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ProjectCard } from "@/components/site/ProjectCard";
import { PreviewBar } from "@/components/public/PreviewBar";
import { JsonLd } from "@/components/public/JsonLd";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadProject(rawLocale: string, slug: string, previewValue?: string | string[]) {
  if (!isLocale(rawLocale)) return null;
  const preview = await canPreview(previewValue);
  const project = await getProjectBySlug(slug, rawLocale, preview);
  if (!project) return null;
  return { project, preview, locale: rawLocale as AppLocale };
}

function projectPaths(project: NonNullable<Awaited<ReturnType<typeof getProjectBySlug>>>) {
  const fr = project.translations.find((entry) => entry.locale === "FR")?.slug;
  const en = project.translations.find((entry) => entry.locale === "EN")?.slug;
  return {
    fr: fr ? `/fr/project/${fr}` : null,
    en: en ? `/en/project/${en}` : null,
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ locale, slug }, search] = await Promise.all([params, searchParams]);
  const loaded = await loadProject(locale, slug, search.preview);
  if (!loaded) return { title: "Projet introuvable", robots: { index: false, follow: false } };
  const { project } = loaded;
  const paths = projectPaths(project);
  return buildMetadata({
    locale: loaded.locale,
    title: project.seoTitle || project.title,
    description: project.seoDescription || project.summary,
    canonicalPath: `/${locale}/project/${project.slug}`,
    paths,
    image: project.coverMedia?.url ?? null,
    type: "article",
    noindex: loaded.preview,
    modifiedTime: project.updatedAt.toISOString(),
  });
}

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale: rawLocale, slug }, search] = await Promise.all([params, searchParams]);
  if (!isLocale(rawLocale)) notFound();
  const loaded = await loadProject(rawLocale, slug, search.preview);
  if (!loaded) notFound();
  const { project, preview, locale } = loaded;
  const dict = getDictionary(locale);
  const descriptionHtml = renderMarkdown(project.description);
  const serviceRoute = project.projectType?.toLowerCase();
  const serviceLink =
    serviceRoute && ["photo", "video", "drone"].includes(serviceRoute)
      ? `/${locale}/${serviceRoute}`
      : null;
  const media = project.media.map((row) => row.media);

  return (
    <>
      {preview && <PreviewBar context={project.title} />}
      <PageHero
        variant={project.coverMedia?.url ? "image" : "cream"}
        cover={project.coverMedia}
        eyebrow={project.categories.length ? project.categories.map((category) => category.name).join(" · ") : dict.projectDetails}
        title={project.title}
        intro={project.summary}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          ...(serviceLink ? [{ name: dict[serviceRoute as "video"], href: serviceLink }] : []),
          { name: project.title },
        ]}
      >
        <HeroAction href={`/${locale}/booking`} label={dict.bookService} variant={project.coverMedia?.url ? "gold" : "primary"} />
        <Link href={`/${locale}/contact`} className={project.coverMedia?.url ? "btn-light" : "btn-outline"}>
          {dict.requestQuote}
        </Link>
      </PageHero>

      <section className="bg-cream py-14 sm:py-20">
        <div className="container-editorial grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20">
          <aside>
            <dl className="divide-y divide-line border-y border-line">
              {project.clientName && (
                <div className="py-4">
                  <dt className="eyebrow text-[9px]">{dict.client}</dt>
                  <dd className="mt-2 font-serif text-xl text-ink">{project.clientName}</dd>
                </div>
              )}
              {project.location && (
                <div className="py-4">
                  <dt className="eyebrow text-[9px]">{dict.location}</dt>
                  <dd className="mt-2 font-serif text-xl text-ink">{project.location}</dd>
                </div>
              )}
              {project.projectDate && (
                <div className="py-4">
                  <dt className="eyebrow text-[9px]">{locale === "fr" ? "Date" : "Date"}</dt>
                  <dd className="mt-2 font-serif text-xl text-ink">{formatDate(project.projectDate, locale)}</dd>
                </div>
              )}
              {project.categories.length > 0 && (
                <div className="py-4">
                  <dt className="eyebrow text-[9px]">{dict.categories}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink">{project.categories.map((category) => category.name).join(" · ")}</dd>
                </div>
              )}
            </dl>
            <Link href={`/${locale}/booking`} className="link-line mt-7 text-champagne">
              {dict.bookService}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </aside>
          <div>
            {descriptionHtml ? (
              <div className="prose-editorial max-w-[760px]" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
            ) : (
              <p className="max-w-[640px] text-sm leading-relaxed text-muted">{project.summary}</p>
            )}
          </div>
        </div>
      </section>

      {media.length > 0 && (
        <section className="border-t border-line bg-stone py-16 sm:py-24">
          <div className="container-editorial">
            <SectionHeading eyebrow={dict.gallery} title={locale === "fr" ? "Sélection du projet." : "Project selection."} />
            <div className="mt-12">
              <Gallery items={media} locale={locale} layout={project.galleryLayout} />
            </div>
          </div>
        </section>
      )}

      {project.related.length > 0 && (
        <section className="bg-cream py-16 sm:py-24">
          <div className="container-editorial">
            <SectionHeading
              eyebrow={dict.relatedProjects}
              title={locale === "fr" ? "À découvrir ensuite." : "Discover next."}
              link={serviceLink ?? undefined}
              linkLabel={dict.viewAll}
            />
            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              {project.related.slice(0, 4).map((related, index) => (
                <ProjectCard key={related.id} project={related} locale={locale} index={index} aspect={index % 2 ? "landscape" : "tall"} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-charcoal py-20 text-cream sm:py-24">
        <div className="container-editorial flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow-gold">{locale === "fr" ? "Votre projet" : "Your project"}</p>
            <h2 className="mt-4 max-w-2xl font-serif text-[clamp(2.4rem,5vw,4.8rem)] leading-[0.98]">
              {locale === "fr" ? "Créons une série qui vous ressemble." : "Let's create a series that feels like you."}
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href={`/${locale}/booking`} className="btn-gold">
              {dict.bookService}
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <Link href={`/${locale}/contact`} className="btn-light">
              {dict.contact}
            </Link>
          </div>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary ?? undefined,
          url: absoluteUrl(`/${locale}/project/${project.slug}`),
          image: project.coverMedia?.url ? absoluteUrl(project.coverMedia.url) : undefined,
          dateCreated: project.projectDate?.toISOString() ?? undefined,
          locationCreated: project.location ? { "@type": "Place", name: project.location } : undefined,
          creator: { "@type": "Organization", name: "TWOK STUDIO" },
          inLanguage: locale === "fr" ? "fr-MA" : "en-MA",
        }}
      />
    </>
  );
}
