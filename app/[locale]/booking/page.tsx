import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Clock3 } from "lucide-react";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getBookingServices, getAvailability, getContactSettings, getPhones, getSiteSettings } from "@/lib/settings";
import { getPrivacyPath } from "@/lib/navigation";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/public/PageHero";
import { BookingForm } from "@/components/public/BookingForm";
import { EmptyState } from "@/components/public/EmptyState";
import { JsonLd } from "@/components/public/JsonLd";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildMetadata({
    locale,
    title: locale === "fr" ? "Réserver une prestation" : "Book a service",
    description:
      locale === "fr"
        ? "Demandez une réservation photo, vidéo ou drone à Marrakech. Choisissez une date et un créneau ; la confirmation est effectuée par le studio."
        : "Request a photography, video or drone booking in Marrakech. Choose a date and slot; the studio confirms availability.",
    canonicalPath: `/${locale}/booking`,
    paths: { fr: "/fr/booking", en: "/en/booking" },
  });
}

export default async function BookingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const dict = getDictionary(locale);
  const [services, availability, contact, phones, site, privacyHref] = await Promise.all([
    getBookingServices(),
    getAvailability(),
    getContactSettings(),
    getPhones(),
    getSiteSettings(),
    getPrivacyPath(locale),
  ]);
  const hours = locale === "fr" ? contact?.hoursFr : contact?.hoursEn;
  const timezone = availability?.timezone ?? site?.timezone ?? null;
  const address = locale === "fr" ? contact?.addressFr : contact?.addressEn;
  const steps = locale === "fr"
    ? [
        { number: "01", title: "Votre demande", text: "Choisissez une prestation, une date et un créneau. Décrivez votre projet en quelques lignes." },
        { number: "02", title: "Vérification", text: "Le studio vérifie les disponibilités et la faisabilité, puis vous contacte pour confirmer." },
        { number: "03", title: "Production", text: "Une fois confirmée, la date est bloquée. Nous préparons ensemble les détails de la journée." },
      ]
    : [
        { number: "01", title: "Your request", text: "Choose a service, a date and a slot. Describe your project in a few lines." },
        { number: "02", title: "Review", text: "The studio checks availability and feasibility, then contacts you to confirm." },
        { number: "03", title: "Production", text: "Once confirmed, the date is reserved. We prepare the details of the day together." },
      ];

  return (
    <>
      <PageHero
        eyebrow={locale === "fr" ? "Disponibilités & demandes" : "Availability & requests"}
        title={locale === "fr" ? "Réserver." : "Book."}
        intro={dict.bookingText}
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: dict.bookNow },
        ]}
        size="compact"
      >
        <Link href={`/${locale}/contact`} className="btn-outline">
          {locale === "fr" ? "Une question d'abord ?" : "A question first?"}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </PageHero>

      <section className="bg-cream py-14 sm:py-20">
        <div className="container-editorial grid gap-12 lg:grid-cols-[0.58fr_1.42fr] lg:gap-16">
          <aside>
            <div className="border border-line bg-stone p-6">
              <p className="eyebrow-gold">{locale === "fr" ? "Comment ça marche" : "How it works"}</p>
              <ol className="mt-6 space-y-6">
                {steps.map((step) => (
                  <li key={step.number} className="grid grid-cols-[32px_1fr] gap-3 border-t border-line pt-5">
                    <span className="font-serif text-lg italic text-champagne">{step.number}</span>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink">{step.title}</p>
                      <p className="mt-2 text-[12px] leading-relaxed text-muted">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 border border-line bg-white p-6">
              <p className="eyebrow-gold flex items-center gap-2"><Clock3 aria-hidden className="h-3 w-3"  />{dict.workingHours}</p>
              {hours ? (
                <p className="mt-4 text-sm leading-relaxed text-muted">{hours}</p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  {locale === "fr" ? "Horaires non renseignés pour le moment." : "Opening hours are not set yet."}
                </p>
              )}
              {timezone && (
                <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-muted-light">{timezone}</p>
              )}
              {address && <p className="mt-5 border-t border-line pt-4 text-sm text-ink">{address}</p>}
              {phones.length > 0 && (
                <div className="mt-3 space-y-1 text-sm text-ink">
                  {phones.map((phone) => <p key={phone.id}>{phone.number}</p>)}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-start gap-3 text-[11px] leading-relaxed text-muted">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-champagne" />
              <p>
                {locale === "fr"
                  ? "Votre demande est enregistrée immédiatement. Elle reste en attente jusqu'à la confirmation du studio : aucun créneau n'est bloqué avant validation."
                  : "Your request is recorded immediately. It remains pending until studio confirmation: no slot is blocked before validation."}
              </p>
            </div>
          </aside>

          {services.length > 0 ? (
            <BookingForm
              locale={locale}
              privacyHref={privacyHref}
              services={services.map((service) => ({
                id: service.id,
                name: locale === "fr" ? service.nameFr : service.nameEn,
                description: locale === "fr" ? service.descriptionFr : service.descriptionEn,
                durationMinutes: service.durationMinutes,
                priceFrom: service.priceFrom ? service.priceFrom.toString() : null,
              }))}
            />
          ) : (
            <EmptyState
              title={dict.noServices}
              text={
                locale === "fr"
                  ? "La prise de réservation en ligne sera disponible prochainement. Vous pouvez déjà nous écrire."
                  : "Online booking will be available soon. You can already write to us."
              }
              href={`/${locale}/contact`}
              linkLabel={dict.contact}
            />
          )}
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: locale === "fr" ? "Réserver une prestation — TWOK STUDIO" : "Book a service — TWOK STUDIO",
          url: absoluteUrl(`/${locale}/booking`),
        }}
      />
    </>
  );
}
