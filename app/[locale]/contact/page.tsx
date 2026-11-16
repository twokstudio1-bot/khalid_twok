import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getContactSettings, getMapSettings, getPhones, getBookingServices, getSocialLinks } from "@/lib/settings";
import { getPrivacyPath } from "@/lib/navigation";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/public/PageHero";
import { ContactDetails } from "@/components/public/ContactDetails";
import { ContactForm } from "@/components/public/ContactForm";
import { MapEmbed } from "@/components/public/MapEmbed";
import { SocialLinks } from "@/components/site/Footer";
import { JsonLd } from "@/components/public/JsonLd";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildMetadata({
    locale,
    title: locale === "fr" ? "Contact" : "Contact",
    description:
      locale === "fr"
        ? "Contactez TWOK STUDIO à Marrakech pour votre projet de photographie, vidéo ou drone. Formulaire, coordonnées et localisation."
        : "Contact TWOK STUDIO in Marrakech for your photography, video or drone project. Form, contact details and location.",
    canonicalPath: `/${locale}/contact`,
    paths: { fr: "/fr/contact", en: "/en/contact" },
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const dict = getDictionary(locale);
  const [contact, map, phones, services, socials, privacyHref] = await Promise.all([
    getContactSettings(),
    getMapSettings(),
    getPhones(),
    getBookingServices(),
    getSocialLinks(),
    getPrivacyPath(locale),
  ]);
  const address = locale === "fr" ? contact?.addressFr : contact?.addressEn;
  const hours = locale === "fr" ? contact?.hoursFr : contact?.hoursEn;
  const intro = locale === "fr" ? contact?.introFr : contact?.introEn;
  const hasLocation = Boolean(address || map?.enabled);

  return (
    <>
      <PageHero
        eyebrow={locale === "fr" ? "Parlons de votre projet" : "Let's talk about your project"}
        title={locale === "fr" ? "Contact." : "Contact."}
        intro={intro || dict.contactText}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: dict.contact },
        ]}
      >
        <Link href={`/${locale}/booking`} className="btn-primary">
          {dict.bookService}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </PageHero>

      <section className="bg-cream py-16 sm:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20">
          <aside>
            <p className="eyebrow-gold mb-7">{locale === "fr" ? "Coordonnées" : "Details"}</p>
            <ContactDetails
              locale={locale}
              phones={phones.map((phone) => ({
                id: phone.id,
                label: phone.label,
                number: phone.number,
                isPrimary: phone.isPrimary,
                whatsappEnabled: phone.whatsappEnabled,
              }))}
              email={contact?.email ?? null}
              address={address ?? null}
              hours={hours ?? null}
            />
            {socials.length > 0 && (
              <div className="mt-10 border-t border-line pt-6">
                <p className="eyebrow mb-4">{dict.followUs}</p>
                <SocialLinks
                  links={socials.map((social) => ({
                    id: social.id,
                    platform: social.platform,
                    url: social.url,
                    username: social.username,
                    icon: social.icon,
                  }))}
                />
              </div>
            )}
          </aside>

          <ContactForm
            locale={locale}
            privacyHref={privacyHref}
            sourcePage={`/${locale}/contact`}
            services={services.map((service) => ({
              id: service.id,
              name: locale === "fr" ? service.nameFr : service.nameEn,
            }))}
          />
        </div>
      </section>

      {hasLocation && (
        <section className="border-t border-line bg-stone py-16 sm:py-24">
          <div className="container-editorial">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow-gold">{locale === "fr" ? "Nous trouver" : "Find us"}</p>
                <h2 className="mt-3 font-serif text-[clamp(2.3rem,5vw,4.5rem)] leading-[0.98] text-ink">
                  {address || (locale === "fr" ? "Carte & itinéraire" : "Map & directions")}
                </h2>
              </div>
              <Link href={`/${locale}/booking`} className="link-line text-ink">
                {dict.bookService}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            </div>
            <MapEmbed map={map} locale={locale} />
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: locale === "fr" ? "Contact — TWOK STUDIO" : "Contact — TWOK STUDIO",
          url: absoluteUrl(`/${locale}/contact`),
          mainEntity: {
            "@type": "ProfessionalService",
            name: "TWOK STUDIO",
            ...(contact?.email ? { email: contact.email } : {}),
            ...(address
              ? { address: { "@type": "PostalAddress", addressLocality: address, addressCountry: "MA" } }
              : {}),
          },
        }}
      />
    </>
  );
}
