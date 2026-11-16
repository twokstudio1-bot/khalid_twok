import "server-only";
import type { Metadata } from "next";
import type { AppLocale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/utils";
import { getHomepageSettings, getSeoSettings, getSiteSettings } from "@/lib/settings";

type SeoPaths = {
  fr: string | null;
  en: string | null;
};

type SeoInput = {
  locale: AppLocale;
  title?: string | null;
  description?: string | null;
  canonicalPath: string;
  paths?: SeoPaths;
  image?: string | null;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  keywords?: string[] | null;
  publishedTime?: string | null;
  modifiedTime?: string | null;
};

export async function buildMetadata(input: SeoInput): Promise<Metadata> {
  const [seo, site, homepage] = await Promise.all([
    getSeoSettings(),
    getSiteSettings(),
    getHomepageSettings(),
  ]).catch(() => [null, null, null] as const);

  const fallbackTitle =
    input.locale === "en"
      ? seo?.siteTitleEn ?? seo?.siteTitleFr ?? "TWOK STUDIO"
      : seo?.siteTitleFr ?? seo?.siteTitleEn ?? "TWOK STUDIO";
  const fallbackDescription =
    input.locale === "en"
      ? seo?.descriptionEn ?? seo?.descriptionFr ?? ""
      : seo?.descriptionFr ?? seo?.descriptionEn ?? "";
  const title = input.title?.trim() || fallbackTitle;
  const description = input.description?.trim() || fallbackDescription;
  const siteName = site?.companyName ?? "TWOK STUDIO";

  const languages: Record<string, string> = {};
  if (input.paths?.fr) languages["fr-MA"] = absoluteUrl(input.paths.fr);
  if (input.paths?.en) languages["en-MA"] = absoluteUrl(input.paths.en);
  if (input.paths?.fr) languages["x-default"] = absoluteUrl(input.paths.fr);

  const ogImageUrl =
    input.image ??
    seo?.defaultOgMedia?.url ??
    homepage?.ogImage?.url ??
    null;

  return {
    title,
    description: description || undefined,
    keywords: input.keywords?.length
      ? input.keywords
      : input.locale === "en"
        ? seo?.keywordsEn?.split(",").map((item) => item.trim()).filter(Boolean)
        : seo?.keywordsFr?.split(",").map((item) => item.trim()).filter(Boolean),
    alternates: {
      canonical: absoluteUrl(input.canonicalPath),
      languages: Object.keys(languages).length ? languages : undefined,
    },
    robots: input.noindex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
    openGraph: {
      type: input.type ?? "website",
      siteName,
      title,
      description: description || undefined,
      url: absoluteUrl(input.canonicalPath),
      locale: input.locale === "en" ? "en_MA" : "fr_MA",
      alternateLocale: input.paths?.[input.locale === "en" ? "fr" : "en"]
        ? [input.locale === "en" ? "fr_MA" : "en_MA"]
        : undefined,
      images: ogImageUrl
        ? [{ url: /^https?:\/\//.test(ogImageUrl) ? ogImageUrl : absoluteUrl(ogImageUrl), alt: title }]
        : undefined,
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || undefined,
      site: seo?.twitterHandle || undefined,
      images: ogImageUrl
        ? [/^https?:\/\//.test(ogImageUrl) ? ogImageUrl : absoluteUrl(ogImageUrl)]
        : undefined,
    },
  };
}

export function pathsFor(locale: AppLocale, pathWithoutLocale: string, otherPath?: string | null): SeoPaths {
  const fr = locale === "fr" ? pathWithoutLocale : otherPath ?? null;
  const en = locale === "en" ? pathWithoutLocale : otherPath ?? null;
  return {
    fr: fr ? `/fr${pathWithoutLocale === "/" ? "" : pathWithoutLocale}` : null,
    en: en ? `/en${pathWithoutLocale === "/" ? "" : pathWithoutLocale}` : null,
  };
}

export function localeServiceNames(locale: AppLocale) {
  return locale === "fr"
    ? { photo: "Photographie", video: "Vidéo", drone: "Drone" }
    : { photo: "Photography", video: "Video", drone: "Drone" };
}
