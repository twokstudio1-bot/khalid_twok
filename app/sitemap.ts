import type { MetadataRoute } from "next";
import { getSitemapData, categoryPathFromRows, pagePathFromRows } from "@/lib/content";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, projects, articles, pages } = await getSitemapData();
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  const add = (
    path: string,
    lastModified: Date,
    alternates?: { fr?: string | null; en?: string | null },
  ) => {
    if (entries.some((entry) => entry.url === absoluteUrl(path))) return;
    const languages: Record<string, string> = {};
    if (alternates?.fr) languages["fr-MA"] = absoluteUrl(alternates.fr);
    if (alternates?.en) languages["en-MA"] = absoluteUrl(alternates.en);
    if (alternates?.fr) languages["x-default"] = absoluteUrl(alternates.fr);
    entries.push({
      url: absoluteUrl(path),
      lastModified,
      changeFrequency: path.match(/\/(photo|video|drone|blog)(\/|$)/) ? "weekly" : "monthly",
      priority: path === "/fr" || path === "/en" ? 1 : path.includes("/project/") || path.includes("/blog/") ? 0.7 : 0.8,
      ...(Object.keys(languages).length > 1 ? { alternates: { languages } } : {}),
    });
  };

  for (const locale of ["fr", "en"] as const) {
    add(`/${locale}`, now, { fr: "/fr", en: "/en" });
    add(`/${locale}/photo`, now, { fr: "/fr/photo", en: "/en/photo" });
    add(`/${locale}/video`, now, { fr: "/fr/video", en: "/en/video" });
    add(`/${locale}/drone`, now, { fr: "/fr/drone", en: "/en/drone" });
    add(`/${locale}/blog`, now, { fr: "/fr/blog", en: "/en/blog" });
    add(`/${locale}/contact`, now, { fr: "/fr/contact", en: "/en/contact" });
    add(`/${locale}/booking`, now, { fr: "/fr/booking", en: "/en/booking" });
    add(`/${locale}/clients`, now, { fr: "/fr/clients", en: "/en/clients" });
  }

  for (const category of categories) {
    const fr = category.translations.some((t) => t.locale === "FR") ? categoryPathFromRows(category.id, categories, "fr") : null;
    const en = category.translations.some((t) => t.locale === "EN") ? categoryPathFromRows(category.id, categories, "en") : null;
    if (fr) add(fr, category.updatedAt, { fr, en });
    if (en) add(en, category.updatedAt, { fr, en });
  }

  for (const project of projects) {
    const last = project.updatedAt ?? project.publishedAt ?? now;
    const frSlug = project.translations.find((t) => t.locale === "FR")?.slug;
    const enSlug = project.translations.find((t) => t.locale === "EN")?.slug;
    const fr = frSlug ? `/fr/project/${frSlug}` : null;
    const en = enSlug ? `/en/project/${enSlug}` : null;
    if (fr) add(fr, last, { fr, en });
    if (en) add(en, last, { fr, en });
  }

  for (const article of articles) {
    const last = article.updatedAt ?? article.publishedAt ?? now;
    const frSlug = article.translations.find((t) => t.locale === "FR")?.slug;
    const enSlug = article.translations.find((t) => t.locale === "EN")?.slug;
    const fr = frSlug ? `/fr/blog/${frSlug}` : null;
    const en = enSlug ? `/en/blog/${enSlug}` : null;
    if (fr) add(fr, last, { fr, en });
    if (en) add(en, last, { fr, en });
  }

  for (const page of pages) {
    const fr = page.translations.some((t) => t.locale === "FR") ? pagePathFromRows(page.id, pages, "fr") : null;
    const en = page.translations.some((t) => t.locale === "EN") ? pagePathFromRows(page.id, pages, "en") : null;
    if (fr) add(fr, page.updatedAt, { fr, en });
    if (en) add(en, page.updatedAt, { fr, en });
  }

  return entries;
}
