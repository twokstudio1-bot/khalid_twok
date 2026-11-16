"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import type { MediaView } from "@/lib/view";
import { cn } from "@/lib/utils";

type GalleryProps = {
  items: MediaView[];
  locale: "fr" | "en";
  layout?: "GRID" | "MASONRY" | "SLIDER" | "FULLWIDTH" | "EDITORIAL";
  className?: string;
  columns?: 2 | 3 | 4;
};

function isEmbeddable(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
}

function embedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

function MediaVisual({
  item,
  locale,
  className,
  priority,
}: {
  item: MediaView;
  locale: "fr" | "en";
  className?: string;
  priority?: boolean;
}) {
  const src = item.kind === "VIDEO" ? item.posterUrl || item.thumbnailUrl : item.url;
  const alt = (locale === "fr" ? item.altFr : item.altEn) || item.originalName;
  return (
    <>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={cn("h-full w-full object-cover", className)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      ) : (
        <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-line", className)}>
          <span className="font-serif text-3xl text-muted/50">TWOK</span>
        </div>
      )}
      {item.kind === "VIDEO" && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center border border-white/50 bg-black/25 text-white backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play aria-hidden className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </span>
      )}
    </>
  );
}

export function Gallery({ items, locale, layout = "GRID", className, columns = 3 }: GalleryProps) {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const filtered = useMemo(() => items.filter(Boolean), [items]);

  const openAt = useCallback((index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setActive(index);
  }, []);

  const close = useCallback(() => {
    setActive(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const move = useCallback(
    (direction: 1 | -1) => {
      setActive((current) => {
        if (current === null || filtered.length === 0) return current;
        return (current + direction + filtered.length) % filtered.length;
      });
    },
    [filtered.length],
  );

  useEffect(() => {
    if (active === null) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [active, close, move]);

  if (!filtered.length) return null;
  const activeItem = active !== null ? filtered[active] : null;
  const caption = activeItem
    ? (locale === "fr" ? activeItem.captionFr || activeItem.altFr : activeItem.captionEn || activeItem.altEn) ||
      activeItem.originalName
    : "";

  const gridClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
        ? "grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      {layout === "SLIDER" ? (
        <div className={cn("flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}>
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => openAt(index, event.currentTarget)}
              className="group relative aspect-[4/5] w-[78vw] shrink-0 snap-start overflow-hidden bg-stone sm:w-[42vw] lg:w-[30vw]"
              aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${item.originalName}`}
            >
              <MediaVisual item={item} locale={locale} className="transition-transform duration-700 group-hover:scale-[1.03]" />
            </button>
          ))}
        </div>
      ) : layout === "FULLWIDTH" ? (
        <div className={cn("space-y-4 sm:space-y-8", className)}>
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => openAt(index, event.currentTarget)}
              className="group relative block aspect-[4/3] w-full overflow-hidden bg-stone sm:aspect-[16/9]"
              aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${item.originalName}`}
            >
              <MediaVisual item={item} locale={locale} className="transition-transform duration-[1200ms] group-hover:scale-[1.02]" />
            </button>
          ))}
        </div>
      ) : layout === "MASONRY" ? (
        <div className={cn("columns-1 gap-3 sm:columns-2 lg:gap-5", columns === 4 ? "lg:columns-4" : columns === 2 ? "lg:columns-2" : "lg:columns-3", className)}>
          {filtered.map((item, index) => {
            const ratio = item.width && item.height ? item.height / item.width : 1.2;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(event) => openAt(index, event.currentTarget)}
                className="group relative mb-3 block w-full overflow-hidden bg-stone lg:mb-5 [break-inside:avoid]"
                style={{ aspectRatio: `1 / ${Math.min(Math.max(ratio, 0.7), 1.7)}` }}
                aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${item.originalName}`}
              >
                <MediaVisual item={item} locale={locale} className="transition-transform duration-700 group-hover:scale-[1.03]" />
              </button>
            );
          })}
        </div>
      ) : layout === "EDITORIAL" ? (
        <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-5", className)}>
          {filtered.map((item, index) => {
            const pattern = index % 6;
            const spans = [
              "sm:col-span-7 sm:row-span-2",
              "sm:col-span-5",
              "sm:col-span-5",
              "sm:col-span-5",
              "sm:col-span-7",
              "sm:col-span-5",
            ];
            const aspects = ["aspect-[4/5]", "aspect-[4/3]", "aspect-[4/3]", "aspect-[4/3]", "aspect-[3/2]", "aspect-[4/5]"];
            return (
              <button
                key={item.id}
                type="button"
                onClick={(event) => openAt(index, event.currentTarget)}
                className={cn("group relative overflow-hidden bg-stone", spans[pattern], aspects[pattern])}
                aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${item.originalName}`}
              >
                <MediaVisual item={item} locale={locale} className="transition-transform duration-[900ms] group-hover:scale-[1.03]" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className={cn("grid gap-3 sm:gap-5", gridClass, className)}>
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={(event) => openAt(index, event.currentTarget)}
              className="group relative aspect-[4/3] overflow-hidden bg-stone"
              aria-label={`${locale === "fr" ? "Ouvrir" : "Open"} ${item.originalName}`}
            >
              <MediaVisual item={item} locale={locale} className="transition-transform duration-700 group-hover:scale-[1.03]" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeItem && (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={caption}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-[#0b0a09]/96 text-cream backdrop-blur-sm"
            onClick={close}
          >
            <div className="flex items-center justify-between px-5 py-4 sm:px-8">
              <span className="text-[10px] uppercase tracking-[0.25em] text-cream/60">
                {(active ?? 0) + 1} / {filtered.length}
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center border border-cream/20 transition-colors hover:border-gold hover:text-gold"
                aria-label={locale === "fr" ? "Fermer" : "Close"}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center px-3 pb-4 sm:px-16" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={locale === "fr" ? "Précédent" : "Previous"}
                className="mr-2 hidden h-11 w-11 shrink-0 items-center justify-center border border-cream/20 transition-colors hover:border-gold sm:flex"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" />
              </button>
              <div className="flex max-h-[76vh] max-w-6xl items-center justify-center">
                {activeItem.kind === "VIDEO" ? (
                  isEmbeddable(activeItem.url) && !activeItem.url.match(/\.(mp4|webm)$/i) ? (
                    <iframe
                      src={embedUrl(activeItem.url) ?? ""}
                      title={caption}
                      className="aspect-video h-full max-h-[76vh] w-[82vw] max-w-5xl border-0"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={activeItem.url}
                      poster={activeItem.posterUrl ?? undefined}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[76vh] w-auto max-w-full bg-black"
                    />
                  )
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeItem.url}
                    alt={(locale === "fr" ? activeItem.altFr : activeItem.altEn) ?? caption}
                    className="max-h-[76vh] w-auto max-w-full object-contain"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={locale === "fr" ? "Suivant" : "Next"}
                className="ml-2 hidden h-11 w-11 shrink-0 items-center justify-center border border-cream/20 transition-colors hover:border-gold sm:flex"
              >
                <ArrowRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-cream/10 px-5 py-4 sm:px-8">
              <p className="max-w-2xl text-xs leading-relaxed text-cream/60">{caption}</p>
              <div className="flex gap-2 sm:hidden">
                <button type="button" onClick={() => move(-1)} className="flex h-10 w-10 items-center justify-center border border-cream/20" aria-label={locale === "fr" ? "Précédent" : "Previous"}>
                  <ArrowLeft aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(1)} className="flex h-10 w-10 items-center justify-center border border-cream/20" aria-label={locale === "fr" ? "Suivant" : "Next"}>
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
