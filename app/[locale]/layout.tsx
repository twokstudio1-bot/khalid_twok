import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type AppLocale } from "@/lib/i18n";
import {
  getContactSettings,
  getLanguages,
  getMapSettings,
  getPhones,
  getSeoSettings,
  getSiteSettings,
  getSocialLinks,
} from "@/lib/settings";
import { getNavigationItems, getPrivacyPath } from "@/lib/navigation";
import { getAdminSession } from "@/lib/auth";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { CookieConsent } from "@/components/site/CookieConsent";
import { MaintenanceScreen } from "@/components/public/MaintenanceScreen";
import { safeExternalUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function localizedPages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
  return ["all"];
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  if (!isLocale(rawLocale)) notFound();
  const locale: AppLocale = rawLocale;
  const dict = getDictionary(locale);

  const [site, contact, map, phones, socials, seo, languages, headerItems, footerItems, legalItems, privacyHref] =
    await Promise.all([
      getSiteSettings(),
      getContactSettings(),
      getMapSettings(),
      getPhones(),
      getSocialLinks(),
      getSeoSettings(),
      getLanguages(),
      getNavigationItems(locale, "header"),
      getNavigationItems(locale, "footer"),
      getNavigationItems(locale, "legal"),
      getPrivacyPath(locale),
    ]);

  const session = site?.maintenanceMode ? await getAdminSession() : null;
  if (site?.maintenanceMode && !session) {
    return (
      <MaintenanceScreen
        locale={locale}
        companyName={site.companyName}
        message={locale === "fr" ? site.descriptionFr : site.descriptionEn}
      />
    );
  }

  const address = locale === "fr" ? contact?.addressFr : contact?.addressEn;
  const hours = locale === "fr" ? contact?.hoursFr : contact?.hoursEn;
  const availableLocales = languages
    .map((language) => language.code)
    .filter((code): code is AppLocale => code === "fr" || code === "en");

  const whatsappMessage = {
    default: (locale === "fr" ? site?.whatsappMessageFr : site?.whatsappMessageEn) ?? "",
    photo: (locale === "fr" ? site?.whatsappPhotoFr : site?.whatsappPhotoEn) ?? "",
    video: (locale === "fr" ? site?.whatsappVideoFr : site?.whatsappVideoEn) ?? "",
    drone: (locale === "fr" ? site?.whatsappDroneFr : site?.whatsappDroneEn) ?? "",
  };

  return (
    <>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:bg-ink focus:px-5 focus:py-3 focus:text-[11px] focus:uppercase focus:tracking-[0.18em] focus:text-cream"
      >
        {dict.skipToContent}
      </a>
      <Header
        locale={locale}
        dict={dict}
        items={headerItems}
        availableLocales={availableLocales.length ? availableLocales : ["fr", "en"]}
      />
      <main id="contenu" className="min-h-[55vh]">{children}</main>
      <Footer
        locale={locale}
        dict={dict}
        items={footerItems}
        legalItems={legalItems}
        phones={phones.map((phone) => ({
          id: phone.id,
          label: phone.label,
          number: phone.number,
          isPrimary: phone.isPrimary,
          whatsappEnabled: phone.whatsappEnabled,
        }))}
        socials={socials.map((social) => ({
          id: social.id,
          platform: social.platform,
          url: social.url,
          username: social.username,
          icon: social.icon,
        }))}
        email={contact?.email ?? null}
        address={address ?? null}
        hours={hours ?? null}
        mapUrl={safeExternalUrl(map?.publicUrl)}
        directionsUrl={safeExternalUrl(map?.directionsUrl ?? map?.publicUrl)}
        intro={(locale === "fr" ? site?.footerIntroFr : site?.footerIntroEn) ?? null}
        copyright={(locale === "fr" ? site?.copyrightFr : site?.copyrightEn) ?? ""}
        companyName={site?.companyName ?? "TWOK STUDIO"}
      />
      <WhatsAppButton
        config={{
          enabled: Boolean(site?.whatsappEnabled && site.whatsappNumber),
          number: site?.whatsappNumber ?? null,
          position: site?.whatsappPosition ?? "RIGHT",
          pages: localizedPages(site?.whatsappPages),
          messages: whatsappMessage,
        }}
      />
      <CookieConsent
        analyticsId={seo?.googleAnalyticsId ?? null}
        locale={locale}
        privacyHref={privacyHref}
      />
    </>
  );
}
