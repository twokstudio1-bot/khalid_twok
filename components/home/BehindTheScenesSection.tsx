import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getMediaByIds } from "@/lib/content";
import type { BlockSettings } from "@/lib/settings-utils";
import { settingsIds, settingsValue } from "@/lib/settings-utils";
import { Gallery } from "@/components/media/Gallery";
import { SectionHeading } from "@/components/site/SectionHeading";

export async function BehindTheScenesSection({
  settings,
  locale,
  dict,
}: {
  settings: BlockSettings;
  locale: AppLocale;
  dict: Dictionary;
}) {
  const ids = [...settingsIds(settings, "mediaIds"), ...settingsIds(settings, "videoIds")];
  const items = await getMediaByIds(ids);
  if (!items.length) return null;

  return (
    <section className="bg-cream py-20 sm:py-28 lg:py-32">
      <div className="container-editorial">
        <SectionHeading
          eyebrow={`06 — ${dict.behindTheScenes}`}
          title={settingsValue(settings, "title", locale)}
          intro={settingsValue(settings, "intro", locale)}
        />
        <div className="mt-14">
          <Gallery items={items} locale={locale} layout="MASONRY" columns={3} />
        </div>
      </div>
    </section>
  );
}
