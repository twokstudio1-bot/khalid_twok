import Link from "next/link";
import type { PageBlock, PageTemplate } from "@prisma/client";
import type { AppLocale, Dictionary } from "@/lib/i18n";
import { getArticles, getArticlesByIds, getCategoryRows, getClients, getMediaByIds, getProjectVideos, getProjectsByIds, getProjectsForCategoryBranch, getTestimonials, pickTranslation } from "@/lib/content";
import { getBookingServices, getContactSettings, getMapSettings, getPhones, getSocialLinks, getSiteSettings } from "@/lib/settings";
import { safeSettings, settingsBool, settingsIds, settingsNumber, settingsString, settingsValue } from "@/lib/settings-utils";
import { renderMarkdown } from "@/lib/markdown";
import { cn, internalHref, safeExternalUrl, whatsappHref } from "@/lib/utils";
import { SmartImage } from "@/components/media/SmartImage";
import { Gallery } from "@/components/media/Gallery";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ProjectCard } from "@/components/site/ProjectCard";
import { ArticleCard } from "@/components/site/ArticleCard";
import { SocialLinks } from "@/components/site/Footer";
import { ContactForm } from "@/components/public/ContactForm";
import { BookingForm } from "@/components/public/BookingForm";
import { MapEmbed } from "@/components/public/MapEmbed";
import { EmptyState } from "@/components/public/EmptyState";
import { categoryPathFromRows } from "@/lib/content";

function mediaAlt(media: { altFr: string | null; altEn: string | null } | null | undefined, locale: AppLocale, fallback = "") {
  return (locale === "fr" ? media?.altFr : media?.altEn) || fallback;
}

async function GalleryByIds({
  ids,
  layout,
  columns,
  locale,
}: {
  ids: string[];
  layout: "GRID" | "MASONRY" | "SLIDER" | "FULLWIDTH" | "EDITORIAL";
  columns: 2 | 3 | 4;
  locale: AppLocale;
}) {
  const items = await getMediaByIds(ids);
  if (!items.length) return null;
  return <Gallery items={items} layout={layout} columns={columns} locale={locale} />;
}

export async function PageBlocks({
  blocks,
  locale,
  template,
  dict,
}: {
  blocks: PageBlock[];
  locale: AppLocale;
  template?: PageTemplate;
  dict: Dictionary;
}) {
  const [map, site, contact, phones, socials, privacyPage] = await Promise.all([
    getMapSettings(),
    getSiteSettings(),
    getContactSettings(),
    getPhones(),
    getSocialLinks(),
    import("@/lib/navigation").then((module) => module.getPrivacyPath(locale)),
  ]);
  void site;

  const rendered = await Promise.all(
    blocks.map(async (block) => {
      if (!block.enabled) return null;
      const settings = safeSettings(block.settings);
      const container = template === "FULL_WIDTH" ? "w-full" : "container-editorial";
      switch (block.type) {
        case "HEADING": {
          return (
            <section key={block.id} className="bg-cream py-16 sm:py-24">
              <div className="container-editorial">
                <SectionHeading
                  eyebrow={settingsValue(settings, "eyebrow", locale) || undefined}
                  title={settingsValue(settings, "title", locale)}
                  intro={settingsValue(settings, "intro", locale) || null}
                  align={settingsString(settings, "align", "left") === "center" ? "center" : "left"}
                />
              </div>
            </section>
          );
        }
        case "RICH_TEXT": {
          const html = renderMarkdown(settingsValue(settings, "body", locale));
          if (!html) return null;
          return (
            <section key={block.id} className="bg-cream py-14 sm:py-20">
              <div className="container-narrow">
                <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
            </section>
          );
        }
        case "IMAGE": {
          const media = (await getMediaByIds([settingsString(settings, "mediaId")]))[0];
          if (!media) return null;
          return (
            <section key={block.id} className="bg-cream py-10 sm:py-16">
              <div className={container}>
                <figure>
                  <div className="relative aspect-[16/10] overflow-hidden bg-stone sm:aspect-[16/9]">
                    <SmartImage src={media.url} alt={mediaAlt(media, locale)} fill sizes="100vw" />
                  </div>
                  {settingsValue(settings, "caption", locale) && (
                    <figcaption className="mt-3 text-[10px] uppercase tracking-[0.16em] text-muted">
                      {settingsValue(settings, "caption", locale)}
                    </figcaption>
                  )}
                </figure>
              </div>
            </section>
          );
        }
        case "VIDEO": {
          const media = (await getMediaByIds([settingsString(settings, "mediaId")]))[0];
          if (!media) return null;
          return (
            <section key={block.id} className="bg-cream py-10 sm:py-16">
              <div className="container-narrow">
                <Gallery items={[media]} layout="FULLWIDTH" locale={locale} />
              </div>
            </section>
          );
        }
        case "IMAGE_GALLERY":
        case "VIDEO_GALLERY":
        case "MIXED_GALLERY": {
          const ids = [...settingsIds(settings, "mediaIds"), ...settingsIds(settings, "videoIds")];
          const rawLayout = settingsString(settings, "layout", "GRID").toUpperCase();
          const layout = (["GRID", "MASONRY", "SLIDER", "FULLWIDTH", "EDITORIAL"].includes(rawLayout)
            ? rawLayout
            : "GRID") as "GRID" | "MASONRY" | "SLIDER" | "FULLWIDTH" | "EDITORIAL";
          const cols = settingsNumber(settings, "columns", 3);
          const columns = (cols === 2 || cols === 4 ? cols : 3) as 2 | 3 | 4;
          const items = (await getMediaByIds(ids)).filter((item) =>
            block.type === "IMAGE_GALLERY"
              ? item.kind === "IMAGE"
              : block.type === "VIDEO_GALLERY"
                ? item.kind === "VIDEO"
                : true,
          );
          if (!items.length) return null;
          return (
            <section key={block.id} className="bg-cream py-12 sm:py-20">
              <div className={layout === "FULLWIDTH" ? "w-full" : container}>
                <Gallery items={items} layout={layout} columns={columns} locale={locale} />
              </div>
            </section>
          );
        }
        case "TWO_COLUMNS": {
          const left = renderMarkdown(settingsValue(settings, "leftBody", locale));
          const right = renderMarkdown(settingsValue(settings, "rightBody", locale));
          if (!left && !right) return null;
          return (
            <section key={block.id} className="bg-cream py-16 sm:py-24">
              <div className="container-editorial">
                {settingsValue(settings, "title", locale) && (
                  <SectionHeading title={settingsValue(settings, "title", locale)} />
                )}
                <div className="mt-10 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 sm:gap-16">
                  <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: left }} />
                  <div className="prose-editorial" dangerouslySetInnerHTML={{ __html: right }} />
                </div>
              </div>
            </section>
          );
        }
        case "FULL_WIDTH_IMAGE": {
          const media = (await getMediaByIds([settingsString(settings, "mediaId")]))[0];
          if (!media) return null;
          return (
            <section key={block.id} className="bg-cream">
              <div className="relative min-h-[48vh] w-full overflow-hidden bg-stone sm:min-h-[72vh]">
                <SmartImage src={media.url} alt={mediaAlt(media, locale)} fill sizes="100vw" />
              </div>
              {settingsValue(settings, "caption", locale) && (
                <div className="container-editorial py-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                  {settingsValue(settings, "caption", locale)}
                </div>
              )}
            </section>
          );
        }
        case "FULL_WIDTH_VIDEO": {
          const media = (await getMediaByIds([settingsString(settings, "mediaId")]))[0];
          if (!media) return null;
          return (
            <section key={block.id} className="bg-charcoal py-10">
              <Gallery items={[media]} layout="FULLWIDTH" locale={locale} />
            </section>
          );
        }
        case "PROJECT_CARDS": {
          const ids = settingsIds(settings, "projectIds");
          const projects = ids.length
            ? await getProjectsByIds(ids, locale)
            : (await getProjectsForCategoryBranch(settingsString(settings, "categoryId"), locale).catch(() => []));
          const selected = projects.length ? projects : [];
          return (
            <section key={block.id} className="bg-cream py-16 sm:py-24">
              <div className="container-editorial">
                <SectionHeading
                  eyebrow={settingsValue(settings, "eyebrow", locale) || undefined}
                  title={settingsValue(settings, "title", locale) || dict.featuredWork}
                  intro={settingsValue(settings, "intro", locale) || null}
                />
                <div className="mt-12">
                  {selected.length ? (
                    <div className="grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                      {selected.map((project, index) => (
                        <ProjectCard key={project.id} project={project} locale={locale} index={index} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState title={dict.projects} text={dict.noProjects} href={`/${locale}/contact`} linkLabel={dict.contact} />
                  )}
                </div>
              </div>
            </section>
          );
        }
        case "CATEGORY_CARDS": {
          const service = settingsString(settings, "service", "").toUpperCase() as "PHOTO" | "VIDEO" | "DRONE" | "";
          const rows = await getCategoryRows(service || undefined, false);
          const ids = settingsIds(settings, "categoryIds");
          const roots = ids.length
            ? rows.filter((row) => ids.includes(row.id))
            : rows.filter((row) => !row.parentId && (!service || row.service === service));
          const cards = roots.map((row) => {
            const translation = pickTranslation(row.translations, locale);
            return {
              id: row.id,
              name: translation?.name ?? "—",
              description: translation?.description ?? null,
              href: categoryPathFromRows(row.id, rows, locale),
              cover: row.coverMedia,
            };
          });
          if (!cards.length) return null;
          return (
            <section key={block.id} className="bg-cream py-16 sm:py-24">
              <div className="container-editorial">
                <SectionHeading
                  eyebrow={settingsValue(settings, "eyebrow", locale) || undefined}
                  title={settingsValue(settings, "title", locale) || dict.categories}
                  intro={settingsValue(settings, "intro", locale) || null}
                />
                <div className="mt-12 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((card) => (
                    <Link key={card.id} href={card.href} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-stone">
                        <SmartImage src={card.cover?.url} alt={card.name} fill sizes="33vw" className="transition-transform duration-700 group-hover:scale-[1.03]" />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 to-transparent" />
                      </div>
                      <h3 className="mt-4 font-serif text-2xl text-ink group-hover:text-champagne">{card.name}</h3>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        case "CLIENT_LOGOS": {
          const clients = await getClients();
          if (!clients.length) return null;
          return (
            <section key={block.id} className="border-y border-line bg-white py-14">
              <div className="container-editorial">
                <p className="eyebrow-gold mb-8 text-center">{settingsValue(settings, "title", locale, dict.ourClients)}</p>
                <ul className="grid grid-cols-2 items-center gap-px border border-line bg-line sm:grid-cols-4 lg:grid-cols-6">
                  {clients.map((client) => {
                    const translation = pickTranslation(client.translations, locale);
                    const name = translation?.displayName || client.name;
                    return (
                      <li key={client.id} className="flex h-24 items-center justify-center bg-white p-6">
                        {client.logoMedia?.url ? (
                          <SmartImage src={client.logoMedia.url} alt={name} width={180} height={70} className="max-h-10 w-auto object-contain" />
                        ) : (
                          <span className="font-serif text-lg text-ink">{name}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        }
        case "BLOG_ARTICLES": {
          const ids = settingsIds(settings, "articleIds");
          const articles = ids.length ? await getArticlesByIds(ids, locale) : (await getArticles({ locale, perPage: 3 })).items;
          if (!articles.length) return null;
          return (
            <section key={block.id} className="bg-cream py-16 sm:py-24">
              <div className="container-editorial">
                <SectionHeading
                  title={settingsValue(settings, "title", locale, dict.latestArticles)}
                  intro={settingsValue(settings, "intro", locale) || null}
                  link={`/${locale}/blog`}
                  linkLabel={dict.viewAll}
                />
                <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
                  {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} locale={locale} />
                  ))}
                </div>
              </div>
            </section>
          );
        }
        case "TESTIMONIALS": {
          const testimonials = await getTestimonials(locale);
          if (!testimonials.length) return null;
          return (
            <section key={block.id} className="bg-stone py-16 sm:py-24">
              <div className="container-editorial">
                <SectionHeading title={settingsValue(settings, "title", locale, dict.ourClients)} align="center" />
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                  {testimonials.map((testimonial) => (
                    <figure key={testimonial.id} className="border border-line bg-white p-7">
                      <blockquote className="font-serif text-[1.45rem] leading-[1.35] text-ink">“{testimonial.quote}”</blockquote>
                      <figcaption className="mt-6 border-t border-line pt-4 text-[10px] uppercase tracking-[0.16em] text-muted">
                        {testimonial.author}{testimonial.role ? ` — ${testimonial.role}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        case "CTA": {
          const primaryUrl = settingsString(settings, "primaryUrl", "/booking");
          const secondaryUrl = settingsString(settings, "secondaryUrl", "/contact");
          const whatsappEnabled = Boolean(site?.whatsappEnabled && site.whatsappNumber && settingsBool(settings, "showWhatsApp", true));
          const message = settingsValue(settings, "body", locale);
          return (
            <section key={block.id} className="relative overflow-hidden bg-charcoal py-20 text-cream sm:py-28">
              <div className="container-editorial">
                <p className="eyebrow-gold">{settingsValue(settings, "eyebrow", locale) || "TWOK STUDIO"}</p>
                <h2 className="mt-6 max-w-[1000px] whitespace-pre-line font-serif text-[clamp(2.8rem,6vw,6rem)] leading-[0.94]">
                  {settingsValue(settings, "title", locale)}
                </h2>
                {message && <p className="mt-6 max-w-xl text-sm leading-relaxed text-cream/60">{message}</p>}
                <div className="mt-9 flex flex-wrap gap-3">
                  {settingsValue(settings, "primaryLabel", locale) && (
                    <Link href={internalHref(primaryUrl, locale)} className="btn-gold">
                      {settingsValue(settings, "primaryLabel", locale)}
                    </Link>
                  )}
                  {settingsValue(settings, "secondaryLabel", locale) && (
                    <Link href={internalHref(secondaryUrl, locale)} className="btn-light">
                      {settingsValue(settings, "secondaryLabel", locale)}
                    </Link>
                  )}
                  {whatsappEnabled && site?.whatsappNumber && (
                    <a href={whatsappHref(site.whatsappNumber, settingsValue(settings, "body", locale))} target="_blank" rel="noopener noreferrer" className="btn-light">
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </section>
          );
        }
        case "CONTACT_FORM": {
          const services = await getBookingServices();
          return (
            <section key={block.id} className="bg-stone py-16 sm:py-24">
              <div className="container-editorial grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div>
                  <p className="eyebrow-gold">{settingsValue(settings, "eyebrow", locale) || dict.contact}</p>
                  <h2 className="mt-5 font-serif text-[clamp(2.3rem,4.4vw,4rem)] leading-[1] text-ink">
                    {settingsValue(settings, "title", locale) || dict.contactIntro}
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
                    {settingsValue(settings, "intro", locale) || dict.contactText}
                  </p>
                </div>
                <ContactForm
                  locale={locale}
                  services={services.map((service) => ({
                    id: service.id,
                    name: locale === "fr" ? service.nameFr : service.nameEn,
                  }))}
                  privacyHref={privacyPage}
                />
              </div>
            </section>
          );
        }
        case "BOOKING_FORM": {
          const services = await getBookingServices();
          return (
            <section key={block.id} className="bg-stone py-16 sm:py-24">
              <div className="container-editorial grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
                <div>
                  <p className="eyebrow-gold">{settingsValue(settings, "eyebrow", locale) || dict.availability}</p>
                  <h2 className="mt-5 font-serif text-[clamp(2.3rem,4.4vw,4rem)] leading-[1] text-ink">
                    {settingsValue(settings, "title", locale) || dict.bookingIntro}
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-relaxed text-muted">
                    {settingsValue(settings, "intro", locale) || dict.bookingText}
                  </p>
                </div>
                <BookingForm
                  locale={locale}
                  privacyHref={privacyPage}
                  services={services.map((service) => ({
                    id: service.id,
                    name: locale === "fr" ? service.nameFr : service.nameEn,
                    description: locale === "fr" ? service.descriptionFr : service.descriptionEn,
                    durationMinutes: service.durationMinutes,
                    priceFrom: service.priceFrom ? service.priceFrom.toString() : null,
                  }))}
                />
              </div>
            </section>
          );
        }
        case "MAP": {
          return (
            <section key={block.id} className="bg-cream py-14 sm:py-20">
              <div className="container-editorial">
                {settingsValue(settings, "title", locale) && (
                  <SectionHeading title={settingsValue(settings, "title", locale)} />
                )}
                <MapEmbed map={map} locale={locale} className="mt-10" />
              </div>
            </section>
          );
        }
        case "SOCIAL_LINKS": {
          return (
            <section key={block.id} className="bg-cream py-14">
              <div className="container-editorial flex flex-col items-center">
                <p className="eyebrow-gold">{settingsValue(settings, "title", locale, dict.followUs)}</p>
                <SocialLinks links={socials} className="mt-5" />
              </div>
            </section>
          );
        }
        case "SPACER": {
          const size = settingsNumber(settings, "size", 64);
          return <div key={block.id} aria-hidden style={{ height: `${Math.min(Math.max(size, 8), 400)}px` }} />;
        }
        default:
          return null;
      }
    })
  );

  return <>{rendered}</>;
}
