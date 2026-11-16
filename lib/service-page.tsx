import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type AppLocale } from "@/lib/i18n";
import { categoryAncestors, getCategoryGallery, getCategoryRows, getCategoryTree, getProjectsForCategoryBranch, getProjectsForService, resolveCategoryPath } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { canPreview } from "@/lib/preview";
import { ServiceLandingPage, serviceSeo } from "@/components/public/ServiceLanding";
import { CategoryPage } from "@/components/public/CategoryPage";
import { PreviewBar } from "@/components/public/PreviewBar";
import { JsonLd } from "@/components/public/JsonLd";
import { absoluteUrl } from "@/lib/utils";

type ServiceKey = "PHOTO" | "VIDEO" | "DRONE";
const routeService: Record<ServiceKey, "photo" | "video" | "drone"> = {
  PHOTO: "photo",
  VIDEO: "video",
  DRONE: "drone",
};

export async function serviceLandingMetadata(service: ServiceKey, rawLocale: string): Promise<Metadata> {
  if (!isLocale(rawLocale)) return {};
  const locale: AppLocale = rawLocale;
  const copy = serviceSeo(service, locale);
  const slug = routeService[service];
  return buildMetadata({
    locale,
    title: copy.seoTitle,
    description: copy.seoDescription,
    canonicalPath: `/${locale}/${slug}`,
    paths: { fr: `/fr/${slug}`, en: `/en/${slug}` },
    image: null,
  });
}

export async function renderServiceLanding(service: ServiceKey, rawLocale: string) {
  if (!isLocale(rawLocale)) notFound();
  const locale: AppLocale = rawLocale;
  const dict = getDictionary(locale);
  const categories = await getCategoryTree(service, locale);
  const projects = await getProjectsForService(service, locale, 9);
  const slug = routeService[service];
  const copy = serviceSeo(service, locale);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: absoluteUrl(`/${locale}`) },
            { "@type": "ListItem", position: 2, name: copy.seoTitle, item: absoluteUrl(`/${locale}/${slug}`) },
          ],
        }}
      />
      <ServiceLandingPage service={service} locale={locale} dict={dict} categories={categories} projects={projects} />
    </>
  );
}

export async function categoryMetadata(
  service: ServiceKey,
  rawLocale: string,
  segments: string[],
  previewValue?: string | string[],
): Promise<Metadata> {
  if (!isLocale(rawLocale)) return {};
  const locale: AppLocale = rawLocale;
  const preview = await canPreview(previewValue);
  const resolved = await resolveCategoryPath(service, locale, segments, preview);
  if (!resolved) return { title: "Page introuvable", robots: { index: false, follow: false } };
  const translation = resolved.category.translations.find((item) => item.locale === (locale === "fr" ? "FR" : "EN"));
  const current = resolved.href;
  const alternate = resolved.alternateHref;
  const paths = {
    fr: locale === "fr" ? current : alternate,
    en: locale === "en" ? current : alternate,
  };
  return buildMetadata({
    locale,
    title: translation?.seoTitle || resolved.name,
    description: translation?.seoDescription || resolved.description,
    canonicalPath: current,
    paths,
    image: resolved.category.coverMedia?.url ?? null,
    noindex: preview,
  });
}

export async function renderCategoryPage(
  service: ServiceKey,
  rawLocale: string,
  segments: string[],
  search: Record<string, string | string[] | undefined>,
) {
  if (!isLocale(rawLocale)) notFound();
  const locale: AppLocale = rawLocale;
  const dict = getDictionary(locale);
  const preview = await canPreview(search.preview);
  const resolved = await resolveCategoryPath(service, locale, segments, preview);
  if (!resolved) notFound();

  const tree = await getCategoryTree(service, locale, preview);
  const findNode = (nodes: typeof tree, id: string): (typeof tree)[number] | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  };
  const node = findNode(tree, resolved.category.id);
  const projects = await getProjectsForCategoryBranch(resolved.category.id, locale, preview);
  const gallery = preview ? [] : await getCategoryGallery(resolved.category.id, 12);
  const ancestors = categoryAncestors(resolved.category.id, await getCategoryRows(service, preview), locale);
  const slug = routeService[service];
  return (
    <>
      {preview && <PreviewBar context={resolved.name} />}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: absoluteUrl(`/${locale}`) },
            { "@type": "ListItem", position: 2, name: dict[slug], item: absoluteUrl(`/${locale}/${slug}`) },
            ...ancestors.map((ancestor, index) => ({
              "@type": "ListItem",
              position: index + 3,
              name: ancestor.name,
              item: absoluteUrl(ancestor.href),
            })),
            {
              "@type": "ListItem",
              position: ancestors.length + 3,
              name: resolved.name,
              item: absoluteUrl(resolved.href),
            },
          ],
        }}
      />
      <CategoryPage
        service={slug}
        locale={locale}
        dict={dict}
        category={{
          id: resolved.category.id,
          name: resolved.name,
          href: resolved.href,
          description: resolved.description,
          coverMedia: resolved.category.coverMedia,
          galleryLayout: resolved.category.galleryLayout,
        }}
        projects={projects}
        gallery={gallery}
        ancestors={resolved.ancestors}
      >
        {node?.children ?? []}
      </CategoryPage>
    </>
  );
}
