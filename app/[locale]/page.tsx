import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { canPreview } from "@/lib/preview";
import { getHomepageSections } from "@/lib/content";
import { getHomepageSettings, getSiteSettings, getSocialLinks, getContactSettings, getMapSettings } from "@/lib/settings";
import { safeSettings, settingsValue } from "@/lib/settings-utils";
import { buildMetadata } from "@/lib/seo";
import { safeExternalUrl } from "@/lib/utils";
import { HeroSection } from "@/components/home/HeroSection";
import { IntroSection } from "@/components/home/IntroSection";
import { FeaturedPhotosSection } from "@/components/home/FeaturedPhotosSection";
import { FeaturedVideoSection } from "@/components/home/FeaturedVideoSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { FeaturedProjectsSection } from "@/components/home/FeaturedProjectsSection";
import { BehindTheScenesSection } from "@/components/home/BehindTheScenesSection";
import { ClientsSection } from "@/components/home/ClientsSection";
import { BlogHighlightsSection } from "@/components/home/BlogHighlightsSection";
import { CtaSection } from "@/components/home/CtaSection";
import { PreviewBar } from "@/components/public/PreviewBar";
import { JsonLd } from "@/components/public/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const locale: AppLocale = raw;
  const [homepage, seo] = await Promise.all([getHomepageSettings(), import("@/lib/settings").then((m) => m.getSeoSettings())]);
  const preview = await canPreview((await searchParams).preview);
  return buildMetadata({
    locale,
    title: (locale === "fr" ? homepage?.titleFr : homepage?.titleEn) ?? null,
    description: (locale === "fr" ? homepage?.descriptionFr : homepage?.descriptionEn) ?? null,
    canonicalPath: `/${locale}`,
    paths: { fr: "/fr", en: "/en" },
    image: homepage?.ogImage?.url ?? seo?.defaultOgMedia?.url ?? null,
    noindex: preview,
  });
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const dict = getDictionary(locale);
  const search = await searchParams;
  const preview = await canPreview(search.preview);

  const [sections, site, homepage, contact, map, socials] = await Promise.all([
    getHomepageSections(preview),
    getSiteSettings(),
    getHomepageSettings(),
    getContactSettings(),
    getMapSettings(),
    getSocialLinks(),
  ]);

  const whatsapp = {
    enabled: Boolean(site?.whatsappEnabled && site.whatsappNumber),
    number: site?.whatsappNumber ?? null,
    message:
      (locale === "fr" ? site?.whatsappMessageFr : site?.whatsappMessageEn) ?? null,
  };

  const socialUrls = socials
    .map((social) => safeExternalUrl(social.url))
    .filter((url): url is string => Boolean(url));
  const address = locale === "fr" ? contact?.addressFr : contact?.addressEn;
  const description = (locale === "fr" ? site?.descriptionFr : site?.descriptionEn) ?? "";
  const mapUrl = safeExternalUrl(map?.publicUrl);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site?.companyName ?? "TWOK STUDIO",
    description,
    url: `/${locale}`,
    image: homepage?.ogImage?.url ?? undefined,
    address: address
      ? { "@type": "PostalAddress", addressLocality: address, addressCountry: "MA" }
      : undefined,
    areaServed: { "@type": "City", name: "Marrakech" },
    sameAs: socialUrls.length ? socialUrls : undefined,
    hasMap: mapUrl ?? undefined,
    knowsLanguage: ["fr", "en"],
  };

  return (
    <>
      {preview && <PreviewBar context="l'accueil" />}
      {sections.map((section) => {
        const settings = safeSettings(section.settings);
        switch (section.type) {
          case "HERO":
            return <HeroSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "INTRO":
            return <IntroSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "FEATURED_PHOTOS":
            return <FeaturedPhotosSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "FEATURED_VIDEO":
            return <FeaturedVideoSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "SERVICES":
            return <ServicesSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "FEATURED_PROJECTS":
            return <FeaturedProjectsSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "BEHIND_THE_SCENES":
            return <BehindTheScenesSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "CLIENTS":
            return <ClientsSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "BLOG_HIGHLIGHTS":
            return <BlogHighlightsSection key={section.id} settings={settings} locale={locale} dict={dict} />;
          case "CTA":
            return <CtaSection key={section.id} settings={settings} locale={locale} whatsapp={whatsapp} />;
          default:
            return null;
        }
      })}
      {!sections.length && (
        <section className="bg-cream py-32">
          <div className="container-editorial">
            <p className="eyebrow-gold">TWOK STUDIO</p>
            <h1 className="mt-6 max-w-4xl font-serif text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] text-ink">
              {settingsValue(
                homepage ? { titleFr: homepage.titleFr, titleEn: homepage.titleEn } : {},
                "title",
                locale,
                "TWOK STUDIO",
              )}
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">{dict.noContent}</p>
          </div>
        </section>
      )}
      <JsonLd data={structuredData} />
    </>
  );
}
