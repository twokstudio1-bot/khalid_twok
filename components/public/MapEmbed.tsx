import { ArrowUpRight, MapPin } from "lucide-react";
import type { MapSetting } from "@prisma/client";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function safeMapEmbed(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const allowedHost =
      parsed.hostname === "www.google.com" ||
      parsed.hostname === "google.com" ||
      parsed.hostname === "maps.google.com" ||
      parsed.hostname.endsWith(".google.com");
    if (parsed.protocol !== "https:" || !allowedHost || !parsed.pathname.includes("/maps/embed")) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function MapEmbed({
  map,
  locale,
  className,
}: {
  map: Pick<MapSetting, "enabled" | "embedUrl" | "publicUrl" | "directionsUrl" | "addressFr" | "addressEn"> | null;
  locale: AppLocale;
  className?: string;
}) {
  if (!map?.enabled) return null;
  const embed = safeMapEmbed(map.embedUrl);
  const address = locale === "fr" ? map.addressFr : map.addressEn;
  const link = map.directionsUrl || map.publicUrl;

  if (!embed) {
    return (
      <div className={cn("flex min-h-[280px] flex-col items-center justify-center border border-line bg-stone p-8 text-center", className)}>
        <MapPin aria-hidden className="h-5 w-5 text-champagne"  />
        <p className="mt-4 font-serif text-2xl text-ink">
          {address || (locale === "fr" ? "Carte non configurée" : "Map not configured")}
        </p>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">
          {locale === "fr"
            ? "La carte intégrée n'est pas encore configurée. Vous pouvez ouvrir l'itinéraire dans Google Maps."
            : "The embedded map has not been configured yet. You can open the directions in Google Maps."}
        </p>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="btn-outline mt-6">
            {locale === "fr" ? "Ouvrir dans Google Maps" : "Open in Google Maps"}
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden border border-line bg-stone", className)}>
      <iframe
        title={locale === "fr" ? "Localisation TWOK STUDIO" : "TWOK STUDIO location"}
        src={embed}
        className="h-[360px] w-full border-0 sm:h-[460px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 inline-flex min-h-10 items-center gap-2 border border-ink/20 bg-cream/95 px-4 py-2.5 text-[9px] uppercase tracking-[0.18em] text-ink backdrop-blur-sm transition-colors hover:bg-white"
        >
          {locale === "fr" ? "Itinéraire" : "Directions"}
          <ArrowUpRight aria-hidden className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
