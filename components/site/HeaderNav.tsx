"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import type { NavItemView, CategoryNavItem } from "@/lib/view";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/site/Logo";
import { LanguageSwitcher } from "@/components/site/LanguageSwitcher";

type HeaderNavProps = {
  locale: "fr" | "en";
  dict: Dictionary;
  items: NavItemView[];
  availableLocales: string[];
  bookLabel: string;
  tagline: string;
};

function CategoryTree({ items, onNavigate, depth = 0 }: { items: CategoryNavItem[]; onNavigate?: () => void; depth?: number }) {
  return (
    <ul className={cn(depth > 0 && "mt-1 space-y-1 pl-3")}>
      {items.map((category) => (
        <li key={category.id}>
          <Link
            href={category.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between gap-3 py-1.5 transition-colors hover:text-champagne",
              depth === 0 ? "text-[11px] tracking-[0.08em]" : "text-[10.5px] text-muted",
            )}
          >
            <span>{category.name}</span>
            <ArrowUpRight aria-hidden className="h-3 w-3 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"  />
          </Link>
          {category.children.length > 0 && (
            <CategoryTree items={category.children} onNavigate={onNavigate} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
}

export function HeaderNav({ locale, dict, items, availableLocales, bookLabel, tagline }: HeaderNavProps) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const closeTimer = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMobile() {
    setMobileOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenId(null);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobile();
        return;
      }
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
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  const isActive = (item: NavItemView) => {
    if (item.target === "HOME") return pathname === `/${locale}`;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  function scheduleClose() {
    closeTimer.current = window.setTimeout(() => setOpenId(null), 120);
  }
  function cancelClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-500",
          scrolled ? "border-line bg-cream/95" : "border-line/70 bg-cream/85",
        )}
      >
        <div className="container-editorial grid h-[74px] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Logo locale={locale} tagline={tagline} />

          <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
            {items.map((item) => {
              const hasDropdown = item.children.length > 0;
              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => {
                    cancelClose();
                    if (hasDropdown) setOpenId(item.id);
                  }}
                  onMouseLeave={scheduleClose}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpenId(null);
                  }}
                >
                  <Link
                    href={item.href}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                    onFocus={() => hasDropdown && setOpenId(item.id)}
                    aria-haspopup={hasDropdown ? "true" : undefined}
                    aria-expanded={hasDropdown ? openId === item.id : undefined}
                    aria-current={isActive(item) ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-1 py-3 text-[10.5px] font-medium uppercase tracking-[0.2em] transition-colors",
                      isActive(item) ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {item.label}
                    {hasDropdown && (
                      <ChevronDown aria-hidden
                        className={cn("h-3 w-3 text-champagne transition-transform duration-300", openId === item.id && "rotate-180")}
                        
                      />
                    )}
                    <span
                      className={cn(
                        "absolute inset-x-0 -bottom-[1px] h-px bg-ink transition-transform duration-300",
                        isActive(item) ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>

                  {hasDropdown && (
                    <div
                      onMouseEnter={cancelClose}
                      onMouseLeave={scheduleClose}
                      className={cn(
                        "absolute left-1/2 top-full z-50 w-[310px] -translate-x-1/2 pt-3 transition-all duration-200",
                        openId === item.id ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
                      )}
                    >
                      <div className="max-h-[72vh] overflow-y-auto border border-line bg-cream p-5 shadow-[0_24px_60px_rgba(20,19,17,0.10)]">
                        <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
                          <span className="eyebrow-gold">{dict.categories}</span>
                          <Link
                            href={item.href}
                            onClick={() => setOpenId(null)}
                            className="inline-flex min-h-10 items-center text-[9px] uppercase tracking-[0.18em] text-muted hover:text-ink"
                          >
                            {dict.viewAll}
                          </Link>
                        </div>
                        <CategoryTree items={item.children} onNavigate={() => setOpenId(null)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-3 sm:gap-5">
            <LanguageSwitcher current={locale} available={availableLocales} />
            <Link
              href={`/${locale}/booking`}
              className="btn-primary hidden !px-4 !py-2.5 text-[10px] sm:inline-flex"
            >
              {bookLabel}
            </Link>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center border border-line lg:hidden"
              aria-label={dict.menu}
              aria-expanded={mobileOpen}
            >
              <Menu aria-hidden className="h-4 w-4"  />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[70] flex flex-col bg-cream lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={dict.menu}
        >
          <div className="flex h-[74px] items-center justify-between border-b border-line px-5">
            <Logo locale={locale} tagline={tagline} />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeMobile}
              className="flex h-10 w-10 items-center justify-center border border-line"
              aria-label={dict.close}
            >
              <X aria-hidden className="h-5 w-5"  />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8">
            <nav aria-label="Navigation mobile">
              <ul className="space-y-1">
                {items.map((item, index) => {
                  const hasDropdown = item.children.length > 0;
                  const expanded = mobileSection === item.id;
                  return (
                    <li key={item.id} className="border-b border-line/80">
                      <div className="flex items-center justify-between">
                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive(item) ? "page" : undefined}
                          className="flex flex-1 items-baseline gap-4 py-4 font-serif text-3xl text-ink"
                        >
                          <span className="text-[9px] font-sans uppercase tracking-[0.2em] text-champagne">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {item.label}
                        </Link>
                        {hasDropdown && (
                          <button
                            type="button"
                            onClick={() => setMobileSection(expanded ? null : item.id)}
                            aria-expanded={expanded}
                            aria-label={`${item.label} — ${dict.categories}`}
                            className="flex h-10 w-10 items-center justify-center text-muted"
                          >
                            <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}  />
                          </button>
                        )}
                      </div>
                      {hasDropdown && expanded && (
                        <div className="pb-4 pl-10">
                          <CategoryTree items={item.children} onNavigate={() => setMobileOpen(false)} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <Link
              href={`/${locale}/booking`}
              onClick={() => setMobileOpen(false)}
              className="btn-primary mt-8 w-full"
            >
              {bookLabel}
            </Link>

            <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
              <span className="eyebrow">{dict.language}</span>
              <LanguageSwitcher current={locale} available={availableLocales} />
            </div>

            <p className="mt-8 max-w-xs text-sm leading-relaxed text-muted">
              {locale === "fr"
                ? "Studio de photographie, vidéo et drone à Marrakech."
                : "Photography, video and drone studio in Marrakech."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
