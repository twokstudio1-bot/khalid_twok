import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  CalendarDays,
  ExternalLink,
  Mail,
  ShieldAlert,
} from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDate, formatDateTime } from "@/lib/admin";
import { getContactSettings, getMapSettings, getPhones, getSiteSettings } from "@/lib/settings";
import { env } from "@/lib/env";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const dynamic = "force-dynamic";

type Metric = {
  label: string;
  value: number;
  href: string;
  note: string;
};

function moroccoToday() {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${date}T00:00:00.000Z`);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (!hasPermission(session, PERMISSIONS.DASHBOARD_VIEW)) redirect("/admin/forbidden");

  const canBookings = hasPermission(session, PERMISSIONS.BOOKINGS_MANAGE);
  const canMessages = hasPermission(session, PERMISSIONS.MESSAGES_MANAGE);
  const canPages = hasPermission(session, PERMISSIONS.PAGES_MANAGE);
  const canProjects = hasPermission(session, PERMISSIONS.PROJECTS_MANAGE);
  const canArticles = hasPermission(session, PERMISSIONS.ARTICLES_MANAGE);
  const canMedia = hasPermission(session, PERMISSIONS.MEDIA_MANAGE);
  const canCustomers = hasPermission(session, PERMISSIONS.CUSTOMERS_MANAGE);
  const canSettings = hasPermission(session, PERMISSIONS.SETTINGS_MANAGE);
  const canSeo = hasPermission(session, PERMISSIONS.SEO_MANAGE);
  const canSystem = hasPermission(session, PERMISSIONS.SYSTEM_VIEW);
  const canAudit = hasPermission(session, PERMISSIONS.AUDIT_VIEW);
  const canUsers = hasPermission(session, PERMISSIONS.USERS_MANAGE);

  const today = moroccoToday();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    pendingCount,
    oldestPending,
    upcomingCount,
    newMessageCount,
    latestMessage,
    publishedPages,
    draftPages,
    projectCount,
    articleCount,
    mediaCount,
    customerCount,
    recentBookings,
    recentMessages,
    recentAudit,
    notificationIssues,
    notificationSample,
    site,
    contact,
    map,
    phones,
  ] = await Promise.all([
    canBookings ? prisma.booking.count({ where: { status: "PENDING" } }) : Promise.resolve(null),
    canBookings
      ? prisma.booking.findFirst({
          where: { status: "PENDING" },
          orderBy: [{ preferredDate: "asc" }, { createdAt: "asc" }],
          select: { id: true, reference: true, fullName: true, preferredDate: true, createdAt: true },
        })
      : Promise.resolve(null),
    canBookings
      ? prisma.booking.count({
          where: {
            status: { in: ["CONFIRMED", "RESCHEDULED"] },
            preferredDate: { gte: today },
          },
        })
      : Promise.resolve(null),
    canMessages ? prisma.contactMessage.count({ where: { status: "NEW" } }) : Promise.resolve(null),
    canMessages
      ? prisma.contactMessage.findFirst({
          where: { status: "NEW" },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, createdAt: true },
        })
      : Promise.resolve(null),
    canPages ? prisma.page.count({ where: { status: "PUBLISHED", deletedAt: null } }) : Promise.resolve(null),
    canPages ? prisma.page.count({ where: { status: "DRAFT", deletedAt: null } }) : Promise.resolve(null),
    canProjects ? prisma.project.count({ where: { deletedAt: null } }) : Promise.resolve(null),
    canArticles
      ? prisma.article.count({ where: { status: "PUBLISHED", deletedAt: null } })
      : Promise.resolve(null),
    canMedia ? prisma.media.count({ where: { deletedAt: null } }) : Promise.resolve(null),
    canCustomers ? prisma.customer.count({ where: { deletedAt: null } }) : Promise.resolve(null),
    canBookings
      ? prisma.booking.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, reference: true, fullName: true, status: true, preferredDate: true, preferredTime: true },
        })
      : Promise.resolve([]),
    canMessages
      ? prisma.contactMessage.findMany({
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { id: true, name: true, email: true, status: true, createdAt: true, message: true },
        })
      : Promise.resolve([]),
    canAudit
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 6,
          include: { actor: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
    canSystem
      ? prisma.bookingNotification.count({
          where: { status: { in: ["FAILED", "SKIPPED"] }, createdAt: { gte: sevenDaysAgo } },
        })
      : Promise.resolve(null),
    canSystem
      ? prisma.bookingNotification.findMany({
          where: { status: { in: ["FAILED", "SKIPPED"] }, createdAt: { gte: sevenDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, channel: true, template: true, status: true, error: true, createdAt: true },
        })
      : Promise.resolve([]),
    canSettings ? getSiteSettings() : Promise.resolve(null),
    canSettings ? getContactSettings() : Promise.resolve(null),
    canSettings ? getMapSettings() : Promise.resolve(null),
    canSettings ? getPhones() : Promise.resolve([]),
  ]);

  const metrics: Metric[] = [];
  if (canPages && publishedPages !== null) {
    metrics.push({
      label: "Pages publiées",
      value: publishedPages,
      href: "/admin/pages?status=PUBLISHED",
      note: draftPages ? `${draftPages} brouillon${draftPages > 1 ? "s" : ""}` : "Aucun brouillon",
    });
  }
  if (canProjects && projectCount !== null) {
    metrics.push({ label: "Projets", value: projectCount, href: "/admin/projects", note: "Portfolio actif" });
  }
  if (canArticles && articleCount !== null) {
    metrics.push({ label: "Articles publiés", value: articleCount, href: "/admin/articles?status=PUBLISHED", note: "Journal" });
  }
  if (canMedia && mediaCount !== null) {
    metrics.push({ label: "Médias", value: mediaCount, href: "/admin/media", note: "Bibliothèque" });
  }
  if (canCustomers && customerCount !== null) {
    metrics.push({ label: "Clients CRM", value: customerCount, href: "/admin/customers", note: "Fiches actives" });
  }

  const warnings: { title: string; detail: string; href: string; action: string }[] = [];
  if (canSettings) {
    if (!env.smtp.host) {
      warnings.push({
        title: "SMTP non configuré",
        detail: "Les notifications e-mail sont enregistrées comme SKIPPED. Aucun envoi réel n'est effectué.",
        href: "/admin/system",
        action: "Voir le système",
      });
    }
    if (!site?.whatsappEnabled || !site.whatsappNumber) {
      warnings.push({
        title: "WhatsApp clic-à-discuter désactivé",
        detail: "Le bouton reste masqué sur le site tant qu'un numéro réel n'est pas renseigné.",
        href: "/admin/settings#whatsapp",
        action: "Configurer",
      });
    }
    if (!map?.embedUrl) {
      warnings.push({
        title: "Carte intégrée non configurée",
        detail: "Renseignez une URL d'intégration pour afficher la carte sur la page contact.",
        href: "/admin/settings#map",
        action: "Configurer la carte",
      });
    }
    if (!contact?.email && phones.length === 0) {
      warnings.push({
        title: "Aucune coordonnée directe publiée",
        detail: "E-mail et téléphone restent masqués tant qu'aucune donnée réelle n'est renseignée.",
        href: "/admin/settings#contact",
        action: "Renseigner",
      });
    }
    if (site?.maintenanceMode) {
      warnings.push({
        title: "Mode maintenance actif",
        detail: "Le public voit la page de maintenance. Les administrateurs connectés conservent l'accès.",
        href: "/admin/settings#site",
        action: "Gérer",
      });
    }
    if (env.isProduction && env.mediaDriver !== "s3") {
      warnings.push({
        title: "Médias stockés en local",
        detail: "En production, un stockage S3 est recommandé pour la persistance des fichiers.",
        href: "/admin/system#storage",
        action: "Vérifier le stockage",
      });
    }
  }

  const quickLinks: { label: string; href: string; note: string }[] = [];
  if (canPages) quickLinks.push({ label: "Pages", href: "/admin/pages", note: "Structure éditoriale" });
  if (canProjects) quickLinks.push({ label: "Projets", href: "/admin/projects", note: "Portfolio" });
  if (canArticles) quickLinks.push({ label: "Journal", href: "/admin/articles", note: "Articles & taxonomies" });
  if (canMedia) quickLinks.push({ label: "Médiathèque", href: "/admin/media", note: "Images & vidéos" });
  if (canBookings) quickLinks.push({ label: "Réservations", href: "/admin/bookings", note: "Demandes & agenda" });
  if (canMessages) quickLinks.push({ label: "Messages", href: "/admin/messages", note: "Formulaire de contact" });
  if (canSettings) quickLinks.push({ label: "Réglages", href: "/admin/settings", note: "Site, contact, carte" });
  if (canSeo) quickLinks.push({ label: "SEO", href: "/admin/seo", note: "Métadonnées & redirections" });
  if (canUsers) quickLinks.push({ label: "Utilisateurs", href: "/admin/users", note: "Comptes & rôles" });
  if (canSystem) quickLinks.push({ label: "Système", href: "/admin/system", note: "Services & sauvegardes" });

  const firstName = session.user.name.trim().split(/\s+/)[0] || "studio";
  const dateLabel = capitalize(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Africa/Casablanca",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date()),
  );

  const pendingDetail = oldestPending
    ? `La plus ancienne : ${formatDate(oldestPending.preferredDate)}`
    : "Aucune demande en attente.";
  const messageDetail = latestMessage
    ? `Le plus ancien non traité : ${latestMessage.name}, ${formatDate(latestMessage.createdAt)}`
    : "Aucun message non traité.";

  const hasPriorities = canBookings || canMessages || canSystem;

  return (
    <div>
      <AdminPageHeader
        eyebrow={`Tableau de bord · ${dateLabel}`}
        title={`Bonjour, ${firstName}.`}
        description="Vue d'ensemble de l'activité et des contenus. Les demandes restent en attente jusqu'à votre confirmation : aucun créneau n'est bloqué automatiquement."
        actions={
          <>
            {canBookings && (
              <Link href="/admin/bookings?status=PENDING" className="admin-btn">
                Réservations <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link href="/fr" target="_blank" rel="noreferrer" className="admin-btn-ghost">
              Site public <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </>
        }
      />

      {hasPriorities && (
        <section aria-labelledby="priorities-heading" className="mb-7">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="priorities-heading" className="eyebrow-gold">
              À traiter
            </h2>
            <p className="text-[10px] text-muted">Les compteurs reflètent l&apos;état réel de la base.</p>
          </div>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
            {canBookings && (
              <Link
                href="/admin/bookings?status=PENDING"
                className="group relative flex min-h-[190px] flex-col justify-between bg-charcoal p-5 text-cream transition-colors hover:bg-graphite sm:col-span-2 xl:col-span-1"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[9.5px] uppercase tracking-[0.2em] text-gold">Réservations</p>
                  <CalendarDays aria-hidden className="h-4 w-4 text-gold/70"  />
                </div>
                <div className="mt-6">
                  <p className="font-serif text-[3.4rem] leading-none">{pendingCount ?? 0}</p>
                  <p className="mt-2 text-[12px] text-cream/70">
                    {pendingCount === 1 ? "demande attend votre décision" : "demandes attendent votre décision"}
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4 border-t border-cream/10 pt-3">
                  <p className="text-[10px] leading-relaxed text-cream/45">{pendingDetail}</p>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-gold transition-colors group-hover:text-cream">
                    Traiter <ArrowUpRight aria-hidden className="inline h-3 w-3"  />
                  </span>
                </div>
              </Link>
            )}

            {canMessages && (
              <Link
                href="/admin/messages?status=NEW"
                className="group flex min-h-[190px] flex-col justify-between bg-white p-5 transition-colors hover:bg-cream"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Messages</p>
                  <Mail aria-hidden className="h-4 w-4 text-champagne"  />
                </div>
                <div className="mt-6">
                  <p className="font-serif text-[3.4rem] leading-none text-ink">{newMessageCount ?? 0}</p>
                  <p className="mt-2 text-[12px] text-muted">
                    {newMessageCount === 1 ? "message non traité" : "messages non traités"}
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-3">
                  <p className="text-[10px] leading-relaxed text-muted-light">{messageDetail}</p>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-ink">
                    Ouvrir <ArrowUpRight aria-hidden className="inline h-3 w-3"  />
                  </span>
                </div>
              </Link>
            )}

            {canSystem && (
              <Link
                href="/admin/system#notifications"
                className="group flex min-h-[190px] flex-col justify-between bg-white p-5 transition-colors hover:bg-cream"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[9.5px] uppercase tracking-[0.2em] text-muted">Notifications</p>
                  <BellRing aria-hidden className="h-4 w-4 text-champagne"  />
                </div>
                <div className="mt-6">
                  <p className="font-serif text-[3.4rem] leading-none text-ink">{notificationIssues ?? 0}</p>
                  <p className="mt-2 text-[12px] text-muted">
                    {notificationIssues === 1 ? "échec ou envoi ignoré sur 7 jours" : "échecs ou envois ignorés sur 7 jours"}
                  </p>
                </div>
                <div className="mt-5 flex items-end justify-between gap-4 border-t border-line pt-3">
                  <p className="text-[10px] leading-relaxed text-muted-light">
                    {notificationSample.length
                      ? `Dernier : ${notificationSample[0].channel.toLowerCase()} · ${notificationSample[0].template}`
                      : "Aucun incident enregistré sur la période."}
                  </p>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-muted transition-colors group-hover:text-ink">
                    Vérifier <ArrowUpRight aria-hidden className="inline h-3 w-3"  />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {metrics.length > 0 && (
        <section aria-labelledby="metrics-heading" className="mb-7">
          <h2 id="metrics-heading" className="sr-only">
            Indicateurs
          </h2>
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => (
              <Link key={metric.label} href={metric.href} className="group bg-white p-4 transition-colors hover:bg-cream">
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                <p className="mt-2 font-serif text-4xl leading-none text-ink">{metric.value}</p>
                <p className="mt-2 text-[10px] text-muted-light transition-colors group-hover:text-muted">{metric.note}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {canBookings && upcomingCount !== null && (
        <section aria-labelledby="upcoming-heading" className="mb-7 border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <h2 id="upcoming-heading" className="font-serif text-2xl leading-tight text-ink">
                Prochains rendez-vous
              </h2>
              <p className="mt-1 text-[11.5px] text-muted">
                {upcomingCount} réservation{upcomingCount > 1 ? "s" : ""} confirmée{upcomingCount > 1 ? "s" : ""} à partir d&apos;aujourd&apos;hui.
              </p>
            </div>
            <Link href="/admin/bookings/calendar" className="admin-btn-ghost">
              Ouvrir l&apos;agenda <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {warnings.length > 0 && (
        <div className="mb-7 grid gap-3 lg:grid-cols-2">
          {warnings.slice(0, 4).map((warning) => (
            <AdminNotice
              key={warning.title}
              tone="warning"
              title={warning.title}
              actionHref={warning.href}
              actionLabel={warning.action}
            >
              {warning.detail}
            </AdminNotice>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          {canBookings && (
            <section className="admin-card" aria-labelledby="recent-bookings-heading">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="recent-bookings-heading" className="font-serif text-2xl leading-tight text-ink">
                  Dernières réservations
                </h2>
                <Link href="/admin/bookings" className="link-quiet">
                  Tout voir <ArrowUpRight aria-hidden className="h-3 w-3"  />
                </Link>
              </div>
              {recentBookings.length ? (
                <ul className="divide-y divide-line">
                  {recentBookings.map((booking) => (
                    <li key={booking.id}>
                      <Link
                        href={`/admin/bookings/${booking.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-ink">{booking.fullName}</p>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {booking.reference} · {formatDate(booking.preferredDate)} · {booking.preferredTime}
                          </p>
                        </div>
                        <StatusBadge value={booking.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-[13px] text-muted">Aucune réservation enregistrée pour le moment.</p>
              )}
            </section>
          )}

          {canMessages && (
            <section className="admin-card" aria-labelledby="recent-messages-heading">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="recent-messages-heading" className="font-serif text-2xl leading-tight text-ink">
                  Messages récents
                </h2>
                <Link href="/admin/messages" className="link-quiet">
                  Tout voir <ArrowUpRight aria-hidden className="h-3 w-3"  />
                </Link>
              </div>
              {recentMessages.length ? (
                <ul className="divide-y divide-line">
                  {recentMessages.map((message) => (
                    <li key={message.id}>
                      <Link
                        href={`/admin/messages/${message.id}`}
                        className="block px-5 py-3.5 transition-colors hover:bg-cream/60"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-[13px] text-ink">{message.name}</p>
                          <StatusBadge value={message.status} />
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11.5px] text-muted">{message.message}</p>
                        <p className="mt-1 text-[10px] text-muted-light">
                          {message.email} · {formatDateTime(message.createdAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-[13px] text-muted">Aucun message reçu pour le moment.</p>
              )}
            </section>
          )}

          {canAudit && (
            <section className="admin-card" aria-labelledby="audit-heading">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="audit-heading" className="font-serif text-2xl leading-tight text-ink">
                  Activité récente
                </h2>
                <Link href="/admin/audit" className="link-quiet">
                  Journal <ArrowUpRight aria-hidden className="h-3 w-3"  />
                </Link>
              </div>
              {recentAudit.length ? (
                <ul className="divide-y divide-line">
                  {recentAudit.map((entry) => (
                    <li key={entry.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] text-ink">{entry.summary}</p>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {entry.actor?.name ?? "Système"} · {entry.action}
                          </p>
                        </div>
                        <span className="shrink-0 text-[9.5px] text-muted-light">{formatDateTime(entry.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-8 text-[13px] text-muted">Aucune activité enregistrée.</p>
              )}
            </section>
          )}
        </div>

        <div className="space-y-5">
          {canSystem && (
            <section className="admin-card" aria-labelledby="system-heading">
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="system-heading" className="font-serif text-2xl leading-tight text-ink">
                  Services
                </h2>
                <Link href="/admin/system" className="link-quiet">
                  Détails <ArrowUpRight aria-hidden className="h-3 w-3"  />
                </Link>
              </div>
              <dl className="divide-y divide-line text-[12px]">
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-muted">Base de données</dt>
                  <dd className="text-emerald-800">Connectée</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-muted">SMTP</dt>
                  <dd className={env.smtp.host ? "text-ink" : "text-amber-800"}>
                    {env.smtp.host ? "Configuré, non testé" : "Non configuré · SKIPPED"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-muted">WhatsApp API</dt>
                  <dd className={env.whatsappApi.enabled ? "text-ink" : "text-amber-800"}>
                    {env.whatsappApi.enabled ? "Activée" : "Désactivée"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-muted">Stockage médias</dt>
                  <dd className="text-ink">{env.mediaDriver === "s3" ? "S3" : "Local"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-3">
                  <dt className="text-muted">Incidents notifications (7 j)</dt>
                  <dd className={notificationIssues ? "text-amber-800" : "text-ink"}>{notificationIssues ?? 0}</dd>
                </div>
              </dl>
              {notificationSample.length > 0 && (
                <div className="border-t border-line bg-stone/40 px-5 py-3">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Dernier incident</p>
                  {notificationSample.slice(0, 1).map((notification) => (
                    <div key={notification.id} className="mt-1.5">
                      <div className="flex items-center gap-2">
                        <StatusBadge value={notification.status} />
                        <span className="text-[10px] text-muted">
                          {notification.channel.toLowerCase()} · {notification.template} · {formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                      {notification.error && (
                        <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">{notification.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {canBookings && (
            <section className="border border-line bg-charcoal p-5 text-cream" aria-labelledby="rule-heading">
              <ShieldAlert aria-hidden className="h-4 w-4 text-gold"  />
              <h2 id="rule-heading" className="mt-3 font-serif text-2xl leading-tight">
                Règle de confirmation
              </h2>
              <p className="mt-2 text-[11.5px] leading-relaxed text-cream/60">
                Toute demande publique entre en statut « En attente ». Aucun créneau n&apos;est bloqué avant votre
                confirmation, et les conflits sont vérifiés dans une transaction verrouillée.
              </p>
              <Link
                href="/admin/bookings?status=PENDING"
                className="mt-4 inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.16em] text-gold transition-colors hover:text-cream"
              >
                Traiter les demandes <ArrowUpRight aria-hidden className="h-3 w-3"  />
              </Link>
            </section>
          )}

          {quickLinks.length > 0 && (
            <section className="admin-card" aria-labelledby="quick-links-heading">
              <h2 id="quick-links-heading" className="border-b border-line px-5 py-4 font-serif text-2xl leading-tight text-ink">
                Accès rapides
              </h2>
              <ul className="divide-y divide-line">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center justify-between gap-4 px-5 py-2.5 transition-colors hover:bg-cream/60"
                    >
                      <span className="text-[12px] text-ink">{link.label}</span>
                      <span className="flex items-center gap-2 text-[9.5px] text-muted-light">
                        {link.note}
                        <ArrowUpRight aria-hidden className="h-3 w-3 transition-colors group-hover:text-champagne"  />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
