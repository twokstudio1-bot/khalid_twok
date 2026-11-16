"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";

type Consent = "granted" | "denied" | null;

export function CookieConsent({
  analyticsId,
  locale,
  privacyHref,
}: {
  analyticsId: string | null;
  locale: "fr" | "en";
  privacyHref: string | null;
}) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const storageKey = "twok_consent_v1";

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "granted" || stored === "denied") {
      // Hydration-safe read of the consent flag from localStorage.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConsent(stored);
    }
    setReady(true);
  }, []);

  function choose(value: "granted" | "denied") {
    window.localStorage.setItem(storageKey, value);
    setConsent(value);
  }

  const showBanner = ready && Boolean(analyticsId) && consent === null;

  return (
    <>
      {analyticsId && consent === "granted" && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="twok-ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analyticsId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {showBanner && (
        <div className="fixed bottom-4 left-4 z-[80] max-w-[360px] border border-line bg-cream p-5 shadow-[0_18px_50px_rgba(20,19,17,0.14)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink">
            {locale === "fr" ? "Mesure d'audience" : "Analytics"}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {locale === "fr"
              ? "Nous utilisons un outil de mesure d'audience uniquement avec votre accord. Aucun cookie de mesure n'est chargé sans consentement."
              : "We use analytics only with your consent. No analytics cookie is loaded without your agreement."}
            {privacyHref && (
              <>
                {" "}
                <Link href={privacyHref} className="underline decoration-champagne underline-offset-2">
                  {locale === "fr" ? "En savoir plus" : "Learn more"}
                </Link>
              </>
            )}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => choose("granted")} className="admin-btn !py-2 text-[10px]">
              {locale === "fr" ? "Accepter" : "Accept"}
            </button>
            <button type="button" onClick={() => choose("denied")} className="admin-btn-ghost !py-2 text-[10px]">
              {locale === "fr" ? "Refuser" : "Decline"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
