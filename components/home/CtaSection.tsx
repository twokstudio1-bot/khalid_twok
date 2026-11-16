import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsBool, settingsString, settingsValue } from "@/lib/settings-utils";
import { internalHref, whatsappHref } from "@/lib/utils";
import { Reveal } from "@/components/site/Reveal";

export function CtaSection({
  settings,
  locale,
  whatsapp,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  whatsapp: { enabled: boolean; number: string | null; message: string | null };
}) {
  const title = settingsValue(settings, "title", locale);
  const body = settingsValue(settings, "body", locale);
  const primaryLabel = settingsValue(settings, "primaryLabel", locale);
  const primaryUrl = settingsString(settings, "primaryUrl", "/booking");
  const secondaryLabel = settingsValue(settings, "secondaryLabel", locale);
  const secondaryUrl = settingsString(settings, "secondaryUrl", "/contact");
  const showWhatsApp = settingsBool(settings, "showWhatsApp", true) && whatsapp.enabled && Boolean(whatsapp.number);

  return (
    <section className="relative overflow-hidden border-y border-cream/10 bg-charcoal py-24 text-cream sm:py-32 lg:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[34%] border-l border-cream/10 lg:block" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0 hidden h-px w-[34%] bg-gold/30 lg:block" />
      <div className="container-editorial relative z-10">
        <Reveal>
          <div className="flex items-center gap-4">
            <span className="h-px w-12 bg-gold/70" />
            <span className="eyebrow-gold">09 — {locale === "fr" ? "Parlons de votre projet" : "Let's talk"}</span>
          </div>
          <h2 className="mt-8 max-w-[1050px] whitespace-pre-line font-serif text-[clamp(2.9rem,6.8vw,6.8rem)] leading-[0.92] tracking-[-0.02em] text-cream">
            {title}
          </h2>
          {body && <p className="mt-7 max-w-xl text-[14px] leading-[1.9] text-cream/55">{body}</p>}
          <div className="mt-10 flex flex-wrap gap-3">
            {primaryLabel && (
              <Link href={internalHref(primaryUrl, locale)} className="btn-gold">
                {primaryLabel}
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            )}
            {secondaryLabel && (
              <Link href={internalHref(secondaryUrl, locale)} className="btn-light">
                {secondaryLabel}
              </Link>
            )}
            {showWhatsApp && whatsapp.number && (
              <a
                href={whatsappHref(whatsapp.number, whatsapp.message)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-light"
              >
                <MessageCircle aria-hidden className="h-4 w-4" />
                WhatsApp
              </a>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
