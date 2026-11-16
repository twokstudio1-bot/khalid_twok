import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPanel } from "@/components/admin/Fields";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateTime } from "@/lib/admin";
import { cn } from "@/lib/utils";
import packageInfo from "@/package.json";

export const metadata: Metadata = { title: "Santé du système" };
export const dynamic = "force-dynamic";

type ServiceTone = "ok" | "warn" | "fail" | "off" | "unknown";

const TONES: Record<ServiceTone, { dot: string; text: string }> = {
  ok: { dot: "bg-emerald-600", text: "text-emerald-900" },
  warn: { dot: "bg-amber-500", text: "text-amber-900" },
  fail: { dot: "bg-red-600", text: "text-red-900" },
  off: { dot: "bg-stone-400", text: "text-muted" },
  unknown: { dot: "bg-stone-400", text: "text-muted" },
};

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  DASHBOARD: "Tableau de bord",
};

function ServiceState({ tone, label }: { tone: ServiceTone; label: string }) {
  const style = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[11px]", style.text)}>
      <span className={cn("h-1.5 w-1.5 shrink-0", style.dot)} aria-hidden />
      {label}
    </span>
  );
}

export default async function SystemPage() {
  await requirePermission(PERMISSIONS.SYSTEM_VIEW);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    users,
    media,
    projects,
    articles,
    bookings,
    messages,
    customers,
    categories,
    pages,
    notificationGroups,
    recentNotifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.media.count({ where: { deletedAt: null } }),
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.article.count({ where: { deletedAt: null } }),
    prisma.booking.count(),
    prisma.contactMessage.count(),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.category.count({ where: { deletedAt: null } }),
    prisma.page.count({ where: { deletedAt: null } }),
    prisma.bookingNotification.groupBy({
      by: ["status"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { _all: true },
    }),
    prisma.bookingNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        channel: true,
        template: true,
        status: true,
        recipient: true,
        error: true,
        sentAt: true,
        createdAt: true,
      },
    }),
  ]);

  const notificationCounts = new Map(
    notificationGroups.map((group) => [group.status, group._count._all]),
  );
  const sentCount = notificationCounts.get("SENT") ?? 0;
  const failedCount = notificationCounts.get("FAILED") ?? 0;
  const skippedCount = notificationCounts.get("SKIPPED") ?? 0;
  const pendingCount = notificationCounts.get("PENDING") ?? 0;
  const incidentCount = failedCount + skippedCount;

  const smtpReady = Boolean(env.smtp.host && env.smtp.from);
  const s3Ready = Boolean(
    env.s3.bucket &&
      env.s3.accessKeyId &&
      env.s3.secretAccessKey &&
      (env.s3.endpoint || env.s3.region),
  );
  const whatsappReady = Boolean(
    env.whatsappApi.enabled && env.whatsappApi.phoneNumberId && env.whatsappApi.accessToken,
  );
  const secretReady = Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
  const publicUrlReady = Boolean(process.env.NEXT_PUBLIC_SITE_URL);

  const services: {
    id?: string;
    name: string;
    tone: ServiceTone;
    label: string;
    detail: string;
  }[] = [
    {
      name: "Base de données",
      tone: "ok",
      label: "Connectée",
      detail: "PostgreSQL via Prisma. Les requêtes de cette page ont été exécutées avec succès.",
    },
    {
      id: "storage",
      name: "Stockage médias",
      tone:
        env.mediaDriver === "s3"
          ? s3Ready
            ? "ok"
            : "fail"
          : env.isProduction
            ? "warn"
            : "off",
      label:
        env.mediaDriver === "s3"
          ? s3Ready
            ? "S3 configuré, non testé"
            : "Configuration S3 incomplète"
          : env.isProduction
            ? "Stockage local en production"
            : "Stockage local",
      detail:
        env.mediaDriver === "s3"
          ? `Bucket : ${env.s3.bucket || "non renseigné"} · endpoint : ${env.s3.endpoint || "région AWS"}`
          : `Dossier : ${env.uploadDir} · URL publique : ${env.publicUploadUrl}`,
    },
    {
      name: "SMTP",
      tone: smtpReady ? "ok" : "off",
      label: smtpReady ? "Configuré, non testé" : "Non configuré",
      detail: smtpReady
        ? `Expéditeur : ${env.smtp.from} · notification admin : ${env.smtp.adminEmail ? "configurée" : "non configurée"}. Aucun envoi de test n'est effectué depuis cette page.`
        : "Les notifications e-mail sont enregistrées avec le statut SKIPPED. Aucun envoi réel n'est tenté.",
    },
    {
      name: "WhatsApp Cloud API",
      tone: whatsappReady ? "ok" : env.whatsappApi.enabled ? "fail" : "off",
      label: whatsappReady
        ? "Configurée, non testée"
        : env.whatsappApi.enabled
          ? "Configuration incomplète"
          : "Désactivée",
      detail: env.whatsappApi.enabled
        ? whatsappReady
          ? "Identifiants présents. Aucun message de test n'est envoyé depuis cette page."
          : "WHATSAPP_API_ENABLED est actif, mais l'identifiant de numéro ou le jeton d'accès manque."
        : "Les notifications WhatsApp sont marquées SKIPPED tant que l'API n'est pas activée.",
    },
    {
      name: "Sauvegardes",
      tone: "unknown",
      label: "Non vérifié",
      detail: `Dossier : ${env.backupDir} · rétention : ${env.backupRetentionDays} jours. Aucune exécution de sauvegarde n'est contrôlée depuis cette page.`,
    },
    {
      name: "Sécurité de session",
      tone: secretReady ? "ok" : "fail",
      label: secretReady ? "Secret configuré" : "Secret absent ou trop court",
      detail: secretReady
        ? "AUTH_SECRET est défini et mesure au moins 32 caractères. Sa valeur n'est jamais affichée."
        : "Définissez AUTH_SECRET avec au moins 32 caractères avant toute mise en production.",
    },
    {
      name: "URL publique",
      tone: publicUrlReady ? "ok" : env.isProduction ? "fail" : "warn",
      label: publicUrlReady ? "Configurée" : "Valeur par défaut",
      detail: `URL utilisée : ${env.siteUrl}. ${publicUrlReady ? "" : "Définissez NEXT_PUBLIC_SITE_URL pour le sitemap, les métadonnées et les liens absolus."}`.trim(),
    },
  ];

  const counts = [
    ["Utilisateurs", users],
    ["Médias", media],
    ["Projets", projects],
    ["Articles", articles],
    ["Réservations", bookings],
    ["Messages", messages],
    ["Clients CRM", customers],
    ["Catégories", categories],
    ["Pages", pages],
  ] as const;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Système"
        title="Santé du système."
        description="État réel des services, configuration active et journal des notifications. Les services non testés sont signalés comme tels : aucun état n'est présenté comme un succès sans preuve."
      />

      <section aria-label="Résumé des notifications" className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white px-4 py-3.5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Envoyées · 7 jours</p>
          <p className="mt-1 font-serif text-3xl leading-none text-ink">{sentCount}</p>
        </div>
        <div className="bg-white px-4 py-3.5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Échecs · 7 jours</p>
          <p className="mt-1 font-serif text-3xl leading-none text-ink">{failedCount}</p>
        </div>
        <div className="bg-white px-4 py-3.5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Ignorées · 7 jours</p>
          <p className="mt-1 font-serif text-3xl leading-none text-ink">{skippedCount}</p>
        </div>
        <div className="bg-white px-4 py-3.5">
          <p className="text-[9px] uppercase tracking-[0.16em] text-muted">En attente · 7 jours</p>
          <p className="mt-1 font-serif text-3xl leading-none text-ink">{pendingCount}</p>
        </div>
      </section>

      {incidentCount > 0 && (
        <AdminNotice
          tone="warning"
          title={`${incidentCount} notification${incidentCount > 1 ? "s" : ""} en échec ou ignorée${incidentCount > 1 ? "s" : ""} sur les 7 derniers jours.`}
        >
          Consultez le journal ci-dessous. Un envoi ignoré correspond à un canal non configuré ou à un destinataire
          absent, jamais à un succès.
        </AdminNotice>
      )}

      <AdminPanel
        title="Matrice des services"
        description="Chaque ligne décrit un service réellement configuré ou son absence."
        className="mb-6"
      >
        <div className="admin-table-wrap">
          <table className="admin-table min-w-[720px]">
            <caption className="sr-only">État des services du système</caption>
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">État</th>
                <th scope="col">Détail</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.name} id={service.id} className="scroll-mt-24">
                  <td data-label="Service" className="font-medium text-ink">
                    {service.name}
                  </td>
                  <td data-label="État">
                    <ServiceState tone={service.tone} label={service.label} />
                  </td>
                  <td data-label="Détail" className="text-[11.5px] leading-relaxed text-muted">
                    {service.detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel
          id="notifications"
          className="scroll-mt-24"
          title="Journal des notifications"
          description="15 dernières tentatives, tous canaux confondus. Le statut affiché est celui enregistré en base."
          actions={
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge value="SENT" />
              <StatusBadge value="FAILED" />
              <StatusBadge value="SKIPPED" />
            </div>
          }
        >
          {recentNotifications.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table min-w-[760px]">
                <caption className="sr-only">Journal des notifications</caption>
                <thead>
                  <tr>
                    <th scope="col">Statut</th>
                    <th scope="col">Canal</th>
                    <th scope="col">Modèle</th>
                    <th scope="col">Destinataire</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentNotifications.map((notification) => (
                    <tr key={notification.id}>
                      <td data-label="Statut">
                        <StatusBadge value={notification.status} />
                      </td>
                      <td data-label="Canal" className="text-ink">
                        {CHANNEL_LABELS[notification.channel] ?? notification.channel}
                      </td>
                      <td data-label="Modèle" className="font-mono text-[10.5px] text-muted">
                        {notification.template}
                      </td>
                      <td data-label="Destinataire" className="break-all text-[10.5px] text-muted">
                        {notification.recipient ?? "—"}
                      </td>
                      <td data-label="Date" className="text-[10.5px] text-muted">
                        {formatDateTime(notification.sentAt ?? notification.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[12px] text-muted">
              Aucune notification enregistrée. Ce journal reste vide tant qu&apos;aucun envoi n&apos;a été tenté.
            </p>
          )}
        </AdminPanel>

        <div className="space-y-6">
          <AdminPanel title="Comptes de données">
            <dl className="divide-y divide-line/70">
              {counts.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2 text-[12.5px]">
                  <dt className="text-ink">{label}</dt>
                  <dd className="font-mono text-muted">{value}</dd>
                </div>
              ))}
            </dl>
          </AdminPanel>

          <AdminPanel title="Environnement">
            <dl className="divide-y divide-line/70 text-[12px]">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Version applicative</dt>
                <dd className="font-mono text-ink">{packageInfo.version}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Node.js</dt>
                <dd className="font-mono text-ink">{process.version}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Environnement</dt>
                <dd className="text-ink">{env.isProduction ? "Production" : "Développement"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Stockage média</dt>
                <dd className="text-ink">{env.mediaDriver === "s3" ? "S3" : "Local"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Upload maximum</dt>
                <dd className="text-ink">{env.maxUploadMb} Mo</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted">Fuseau d&apos;affichage</dt>
                <dd className="text-ink">Africa/Casablanca</dd>
              </div>
            </dl>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
