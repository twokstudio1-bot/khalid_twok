import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { NavItemView, PhoneView, SocialView } from "@/lib/view";
import type { Dictionary } from "@/lib/i18n";
import { Logo } from "@/components/site/Logo";
import { cn, phoneHref, safeExternalUrl } from "@/lib/utils";

export function SocialLinks({
  links,
  variant = "dark",
  className,
}: {
  links: SocialView[];
  variant?: "dark" | "light";
  className?: string;
}) {
  if (!links.length) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-5 gap-y-2.5", className)}>
      {links.map((link) => {
        const url = safeExternalUrl(link.url) ?? (link.url.startsWith("mailto:") ? link.url : null);
        if (!url) return null;
        return (
          <li key={link.id}>
            <a
              href={url}
              target={url.startsWith("http") ? "_blank" : undefined}
              rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={link.username ? `${link.platform} — ${link.username}` : link.platform}
              className={cn(
                "group inline-flex min-h-10 items-center gap-1 border-b pb-0.5 text-[9.5px] uppercase tracking-[0.16em] transition-colors",
                variant === "light"
                  ? "border-cream/20 text-cream/55 hover:border-gold hover:text-gold"
                  : "border-line text-muted hover:border-ink hover:text-ink",
              )}
            >
              {link.platform}
              <ArrowUpRight aria-hidden className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function Footer({
  locale,
  dict,
  items,
  legalItems,
  phones,
  socials,
  email,
  address,
  hours,
  mapUrl,
  directionsUrl,
  intro,
  copyright,
  companyName,
}: {
  locale: "fr" | "en";
  dict: Dictionary;
  items: NavItemView[];
  legalItems: NavItemView[];
  phones: PhoneView[];
  socials: SocialView[];
  email: string | null;
  address: string | null;
  hours: string | null;
  mapUrl: string | null;
  directionsUrl: string | null;
  intro: string | null;
  copyright: string;
  companyName: string;
}) {
  const fallbackCopyright = `© ${new Date().getFullYear()} ${companyName}. ${locale === "fr" ? "Tous droits réservés." : "All rights reserved."}`;
  return (
    <footer className="bg-charcoal text-cream">
      <div className="container-editorial pb-8 pt-16 sm:pt-20">
        <div className="grid gap-12 border-b border-cream/10 pb-14 lg:grid-cols-[1.25fr_0.7fr_0.7fr_1fr] lg:gap-16">
          <div>
            <Logo locale={locale} variant="light" />
            <p className="mt-6 max-w-xs text-[13px] leading-relaxed text-cream/55">
              {intro ?? (locale === "fr"
                ? "Studio créatif à Marrakech : photographie, films et vues aériennes."
                : "Creative studio in Marrakech: photography, films and aerial views.")}
            </p>
            <SocialLinks links={socials} variant="light" className="mt-7" />
          </div>

          <div>
            <h2 className="eyebrow-gold">{dict.explore}</h2>
            <ul className="mt-5 space-y-2.5">
              {items.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-[13px] text-cream/60 transition-colors hover:text-cream">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow-gold">{dict.studio}</h2>
            <ul className="mt-5 space-y-2.5">
              <li>
                <Link href={`/${locale}/booking`} className="text-[13px] text-cream/60 transition-colors hover:text-cream">
                  {dict.bookService}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/clients`} className="text-[13px] text-cream/60 transition-colors hover:text-cream">
                  {dict.ourClients}
                </Link>
              </li>
              {legalItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-[13px] text-cream/60 transition-colors hover:text-cream">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow-gold">{dict.contact}</h2>
            <ul className="mt-5 space-y-3 text-[13px] text-cream/60">
              {phones.map((phone) => (
                <li key={phone.id}>
                  <a href={phoneHref(phone.number)} className="flex items-center gap-2 transition-colors hover:text-cream">
                    <Phone aria-hidden className="h-3 w-3 text-gold/70"  />
                    {phone.number}
                  </a>
                </li>
              ))}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="flex items-center gap-2 transition-colors hover:text-cream">
                    <Mail aria-hidden className="h-3 w-3 text-gold/70"  />
                    {email}
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2">
                  <MapPin aria-hidden className="mt-0.5 h-3 w-3 shrink-0 text-gold/70"  />
                  <span>{address}</span>
                </li>
              )}
              {hours && <li className="pl-5 text-cream/45">{hours}</li>}
            </ul>
            {(mapUrl || directionsUrl) && (
              <a
                href={directionsUrl ?? mapUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line mt-6 text-gold"
              >
                {dict.getDirections}
                <ArrowUpRight aria-hidden className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6 pt-7 text-[10px] uppercase tracking-[0.16em] text-cream/35 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright ? copyright.replace("{year}", String(new Date().getFullYear())) : fallbackCopyright}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legalItems.map((item) => (
              <Link key={item.id} href={item.href} className="transition-colors hover:text-cream/70">
                {item.label}
              </Link>
            ))}
            <Link href={`/${locale}/contact`} className="transition-colors hover:text-cream/70">
              {dict.contact}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
