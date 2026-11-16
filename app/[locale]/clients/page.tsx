import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { isLocale, getDictionary, type AppLocale } from "@/lib/i18n";
import { getClients } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { PageHero } from "@/components/public/PageHero";
import { SmartImage } from "@/components/media/SmartImage";
import { EmptyState } from "@/components/public/EmptyState";
import { SectionHeading } from "@/components/site/SectionHeading";
import { safeExternalUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return buildMetadata({
    locale,
    title: locale === "fr" ? "Clients & partenaires" : "Clients & partners",
    description:
      locale === "fr"
        ? "Une sélection de marques, d'hôtels et de partenaires ayant collaboré avec TWOK STUDIO à Marrakech."
        : "A selection of brands, hotels and partners that have worked with TWOK STUDIO in Marrakech.",
    canonicalPath: `/${locale}/clients`,
    paths: { fr: "/fr/clients", en: "/en/clients" },
  });
}

export default async function ClientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: AppLocale = raw;
  const dict = getDictionary(locale);
  const clients = await getClients();

  return (
    <>
      <PageHero
        eyebrow={dict.ourClients}
        title={locale === "fr" ? "Clients &\npartenaires." : "Clients &\npartners."}
        intro={
          locale === "fr"
            ? "Une sélection de collaborations, publiée au fil des projets. Chaque référence est présentée avec les éléments fournis par le studio."
            : "A selection of collaborations, published as projects unfold. Each reference is presented with the material provided by the studio."
        }
        breadcrumbs={[
          { name: locale === "fr" ? "Accueil" : "Home", href: `/${locale}` },
          { name: locale === "fr" ? "Clients" : "Clients" },
        ]}
      />

      <section className="bg-cream py-16 sm:py-24">
        <div className="container-editorial">
          {clients.length ? (
            <>
              <SectionHeading
                eyebrow={`${String(clients.length).padStart(2, "0")} ${locale === "fr" ? "partenaires" : "partners"}`}
                title={locale === "fr" ? "Collaborations sélectionnées." : "Selected collaborations."}
              />
              <ul className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                {clients.map((client) => {
                  const translation = client.translations.find((item) => item.locale === (locale === "fr" ? "FR" : "EN"));
                  const name = translation?.displayName || client.name;
                  const description = translation?.description || client.description;
                  const url = safeExternalUrl(client.websiteUrl);
                  return (
                    <li key={client.id} className="bg-white p-7 sm:p-9">
                      <div className="flex min-h-[90px] items-center">
                        {client.logoMedia?.url ? (
                          <SmartImage src={client.logoMedia.url} alt={name} width={220} height={90} className="max-h-16 w-auto object-contain" />
                        ) : (
                          <span className="font-serif text-3xl text-ink">{name}</span>
                        )}
                      </div>
                      {description && <p className="mt-5 text-[12.5px] leading-relaxed text-muted">{description}</p>}
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="link-line mt-5 text-ink">
                          {locale === "fr" ? "Voir le site" : "Visit website"}
                          <ArrowUpRight aria-hidden className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <EmptyState
              title={locale === "fr" ? "Une sélection en préparation." : "A selection in preparation."}
              text={
                locale === "fr"
                  ? "Les références seront publiées ici au fur et à mesure. Nous pouvons partager une sélection privée sur demande."
                  : "References will be published here as they become available. We can share a private selection on request."
              }
              href={`/${locale}/contact`}
              linkLabel={dict.contact}
            />
          )}
        </div>
      </section>

      <section className="border-t border-line bg-stone py-16">
        <div className="container-editorial flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow-gold">{locale === "fr" ? "Collaboration" : "Collaboration"}</p>
            <h2 className="mt-3 font-serif text-[clamp(2.2rem,4.4vw,3.8rem)] text-ink">
              {locale === "fr" ? "Travaillons ensemble." : "Let's work together."}
            </h2>
          </div>
          <Link href={`/${locale}/contact`} className="btn-primary">
            {dict.contact}
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
