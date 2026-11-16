import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getClients } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsBool, settingsValue } from "@/lib/settings-utils";
import { SmartImage } from "@/components/media/SmartImage";
import { SectionHeading } from "@/components/site/SectionHeading";
import { cn, safeExternalUrl } from "@/lib/utils";

export async function ClientsSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const clients = await getClients();
  if (!clients.length) return null;
  const monochrome = settingsBool(settings, "monochrome", false);

  return (
    <section className="border-y border-line bg-white py-16 sm:py-20">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`07 — ${dict.ourClients}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
          align="center"
        />
        <ul className="mt-12 grid grid-cols-2 items-center gap-px overflow-hidden border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {clients.map((client) => {
            const translation = client.translations.find((item) => item.locale === (locale === "fr" ? "FR" : "EN"));
            const name = translation?.displayName || client.name;
            const url = safeExternalUrl(client.websiteUrl);
            const logo = (
              <div className={cn("relative flex h-24 items-center justify-center bg-white px-6 transition-all duration-500 sm:h-28", monochrome ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0" : "hover:bg-stone/50")}>
                {client.logoMedia?.url ? (
                  <SmartImage src={client.logoMedia.url} alt={name} width={200} height={80} className="max-h-12 w-auto object-contain" />
                ) : (
                  <span className="font-serif text-lg tracking-wide text-ink">{name}</span>
                )}
              </div>
            );
            return (
              <li key={client.id} className="bg-white">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="group block" aria-label={name}>
                    {logo}
                    <span className="sr-only">{name}</span>
                  </a>
                ) : (
                  logo
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
