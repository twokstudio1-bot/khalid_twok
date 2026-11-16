"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Contact,
  ExternalLink,
  FileText,
  FolderTree,
  Home,
  Images,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Navigation,
  Quote,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { AdminSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logoutAdmin } from "@/app/admin/actions/auth";
import { cn } from "@/lib/utils";

type CountKey = "pendingBookings" | "newMessages" | "failedNotifications";

type NavItem = {
  href: string;
  label: string;
  permission: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: CountKey;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [
      { href: "/admin", label: "Tableau de bord", permission: PERMISSIONS.DASHBOARD_VIEW, icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "À traiter",
    items: [
      { href: "/admin/bookings", label: "Réservations", permission: PERMISSIONS.BOOKINGS_MANAGE, icon: CalendarDays, exact: true, badge: "pendingBookings" },
      { href: "/admin/bookings/calendar", label: "Calendrier", permission: PERMISSIONS.BOOKINGS_MANAGE, icon: CalendarDays },
      { href: "/admin/messages", label: "Messages", permission: PERMISSIONS.MESSAGES_MANAGE, icon: Mail, badge: "newMessages" },
      { href: "/admin/bookings/settings", label: "Disponibilités", permission: PERMISSIONS.BOOKINGS_MANAGE, icon: Clock3 },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/admin/pages", label: "Pages", permission: PERMISSIONS.PAGES_MANAGE, icon: FileText },
      { href: "/admin/projects", label: "Projets", permission: PERMISSIONS.PROJECTS_MANAGE, icon: Images },
      { href: "/admin/categories", label: "Catégories", permission: PERMISSIONS.CATEGORIES_MANAGE, icon: FolderTree },
      { href: "/admin/articles", label: "Journal", permission: PERMISSIONS.ARTICLES_MANAGE, icon: BookOpen },
      { href: "/admin/clients", label: "Clients", permission: PERMISSIONS.CLIENTS_MANAGE, icon: UsersRound },
      { href: "/admin/customers", label: "Clients CRM", permission: PERMISSIONS.CUSTOMERS_MANAGE, icon: Contact },
      { href: "/admin/testimonials", label: "Témoignages", permission: PERMISSIONS.TESTIMONIALS_MANAGE, icon: Quote },
      { href: "/admin/navigation", label: "Navigation", permission: PERMISSIONS.NAVIGATION_MANAGE, icon: Navigation },
      { href: "/admin/homepage", label: "Accueil", permission: PERMISSIONS.HOMEPAGE_MANAGE, icon: Home },
    ],
  },
  {
    label: "Médias",
    items: [
      { href: "/admin/media", label: "Médiathèque", permission: PERMISSIONS.MEDIA_MANAGE, icon: Images },
    ],
  },
  {
    label: "Site",
    items: [
      { href: "/admin/settings", label: "Réglages", permission: PERMISSIONS.SETTINGS_MANAGE, icon: Settings },
      { href: "/admin/seo", label: "SEO & redirections", permission: PERMISSIONS.SEO_MANAGE, icon: Search },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/admin/users", label: "Utilisateurs", permission: PERMISSIONS.USERS_MANAGE, icon: Users },
      { href: "/admin/roles", label: "Rôles & permissions", permission: PERMISSIONS.USERS_MANAGE, icon: ShieldCheck },
      { href: "/admin/audit", label: "Journal d'audit", permission: PERMISSIONS.AUDIT_VIEW, icon: BarChart3 },
      { href: "/admin/system", label: "Santé du système", permission: PERMISSIONS.SYSTEM_VIEW, icon: ServerCog, badge: "failedNotifications" },
    ],
  },
];

export type AdminNavCounts = Record<CountKey, number>;

function can(permissions: string[], permission: string) {
  return permissions.includes("*") || permissions.includes(permission);
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AdminFrame({
  session,
  counts,
  todayLabel,
  children,
}: {
  session: AdminSession;
  counts: AdminNavCounts;
  todayLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeDrawer() {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
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
  }, [open]);

  const visibleGroups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(session.permissions, item.permission)),
  })).filter((group) => group.items.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[74px] items-center justify-between border-b border-white/10 px-5">
        <Link href="/admin" className="block">
          <span className="block font-serif text-[1.35rem] leading-none tracking-[0.08em] text-cream">TWOK</span>
          <span className="mt-1 block text-[8px] uppercase tracking-[0.34em] text-cream/45">Studio · Admin</span>
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={closeDrawer}
          className="flex h-10 w-10 items-center justify-center border border-white/15 text-cream lg:hidden"
          aria-label="Fermer le menu"
        >
          <X aria-hidden className="h-4 w-4"  />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navigation administration">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-2 text-[8.5px] font-medium uppercase tracking-[0.24em] text-cream/35">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                const badge = item.badge ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-10 items-center gap-2.5 border-l-2 px-2.5 py-1.5 text-[12px] transition-colors",
                        active
                          ? "border-gold bg-white/10 text-cream"
                          : "border-transparent text-cream/65 hover:border-white/25 hover:bg-white/5 hover:text-cream",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-gold" : "opacity-70")} aria-hidden />
                      <span className="truncate">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cn(
                            "ml-auto inline-flex min-w-5 items-center justify-center border px-1.5 py-0.5 text-[8.5px] font-medium tabular-nums",
                            item.badge === "failedNotifications"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                              : "border-gold/40 bg-gold/10 text-gold-soft",
                          )}
                          aria-label={`${badge} élément(s) à traiter`}
                        >
                          {badge}
                        </span>
                      )}
                      {active && badge === 0 && <ChevronRight aria-hidden className="ml-auto h-3 w-3 text-gold"  />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/40 bg-white/5 font-serif text-sm text-gold">
            {session.user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] text-cream">{session.user.name}</p>
            <p className="truncate text-[9.5px] uppercase tracking-[0.14em] text-cream/40">
              {session.roles.length ? session.roles.join(" · ") : "Administrateur"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Link href="/fr" target="_blank" className="inline-flex min-h-10 items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-cream/50 hover:text-cream">
            Voir le site <ExternalLink aria-hidden className="h-3 w-3"  />
          </Link>
          <form action={logoutAdmin} className="ml-auto">
            <button type="submit" className="inline-flex min-h-10 items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-cream/50 hover:text-cream">
              <LogOut aria-hidden className="h-3 w-3"  /> Quitter
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone">
      <a href="#admin-main" className="admin-skip-link">Aller au contenu</a>

      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] bg-charcoal lg:block">{sidebar}</aside>

      {open && (
        <div ref={drawerRef} className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" aria-label="Fermer" onClick={closeDrawer} className="absolute inset-0 bg-ink/45" />
          <aside aria-label="Menu administration" className="relative h-full w-[280px] max-w-[85vw] bg-charcoal">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-40 flex h-[74px] items-center justify-between gap-4 border-b border-line bg-stone/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-10 w-10 items-center justify-center border border-line bg-white lg:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={open}
            >
              <Menu aria-hidden className="h-4 w-4"  />
            </button>
            <div className="hidden sm:block">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Espace de gestion</p>
              <p className="font-serif text-lg leading-tight text-ink">TWOK STUDIO</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <p className="hidden text-[9.5px] uppercase tracking-[0.14em] text-muted md:block">{todayLabel}</p>
            <Link href="/fr/booking" target="_blank" className="hidden min-h-10 items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink xl:inline-flex">
              Réservation publique <ExternalLink aria-hidden className="h-3 w-3"  />
            </Link>
            <Link href="/admin/settings" className="flex h-10 w-10 items-center justify-center border border-line bg-white text-muted hover:text-ink" aria-label="Réglages">
              <Settings className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <span className="hidden h-10 w-10 items-center justify-center border border-line bg-white font-serif text-sm text-ink sm:flex">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <main id="admin-main" tabIndex={-1} className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
