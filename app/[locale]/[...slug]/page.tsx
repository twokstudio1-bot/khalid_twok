import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import type { AppLocale } from "@/lib/i18n";
import { getDictionary, isLocale } from "@/lib/i18n";
import { findRedirect, getPageById, resolvePagePath } from "@/lib/content";
import { canPreview } from "@/lib/preview";
import { buildMetadata } from "@/lib/seo";
import { ensureInternalPath } from "@/lib/utils";
import { PageHero } from "@/components/public/PageHero";
import { PageBlocks } from "@/components/public/PageBlocks";
import { PreviewBar } from "@/components/public/PreviewBar";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

async function loadPage(rawLocale: string, segments: string[], previewValue?: string | string[]) {
  if (!isLocale(rawLocale)) return null;
  const preview = await canPreview(previewValue);
  const resolved = await resolvePagePath(rawLocale, segments, preview);
  if (!resolved) return null;
  const page = await getPageById(resolved.page.id);
  if (!page) return null;
  return { resolved, page, preview, locale: rawLocale as AppLocale };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const [{ locale, slug }, search] = await Promise.all([params, searchParams]);
  const loaded = await loadPage(locale, slug ?? [], search.preview);
  if (!loaded) return { title: "Page introuvable", robots: { index: false, follow: false } };
  const { resolved, page } = loaded;
  const translation = page.translations.find((entry) => entry.locale === (locale === "fr" ? "FR" : "EN"));
  return buildMetadata({
    locale: loaded.locale,
    title: resolved.seoTitle || resolved.title,
    description: resolved.seoDescription || resolved.excerpt,
    canonicalPath: resolved.href,
    paths: {
      fr: locale === "fr" ? resolved.href : resolved.alternateHref,
      en: locale === "en" ? resolved.href : resolved.alternateHref,
    },
    image: page.coverMedia?.url ?? translation?.seoImage?.url ?? null,
    noindex: loaded.preview,
  });
}

export default async function CustomPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: raw, slug }, search] = await Promise.all([params, searchParams]);
  if (!isLocale(raw)) notFound();
  const segments = slug ?? [];
  const loaded = await loadPage(raw, segments, search.preview);
  if (!loaded) {
    const redirect = await findRedirect(raw, `/${segments.join("/")}`);
    if (redirect) {
      const target = ensureInternalPath(redirect.toPath);
      if (target) permanentRedirect(target);
    }
    notFound();
  }

  const { resolved, page, preview, locale } = loaded;
  const dict = getDictionary(locale);
  const title = resolved.title;
  const body = (
    <PageBlocks blocks={page.blocks} locale={locale} template={page.template} dict={dict} />
  );

  if (page.template === "LANDING") {
    return (
      <>
        {preview && <PreviewBar context={title} />}
        {body}
      </>
    );
  }

  return (
    <>
      {preview && <PreviewBar context={title} />}
      <PageHero
        variant={page.coverMedia?.url ? "image" : "cream"}
        cover={page.coverMedia}
        eyebrow={locale === "fr" ? "TWOK STUDIO" : "TWOK STUDIO"}
        title={title}
        intro={resolved.excerpt}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: title },
        ]}
        size="compact"
      />
      {body}
    </>
  );
}
