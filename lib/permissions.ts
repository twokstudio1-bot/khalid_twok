export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  PAGES_MANAGE: "content.pages",
  CATEGORIES_MANAGE: "content.categories",
  PROJECTS_MANAGE: "content.projects",
  ARTICLES_MANAGE: "content.articles",
  CLIENTS_MANAGE: "content.clients",
  NAVIGATION_MANAGE: "content.navigation",
  TESTIMONIALS_MANAGE: "content.testimonials",
  MEDIA_MANAGE: "media.manage",
  HOMEPAGE_MANAGE: "homepage.manage",
  BOOKINGS_MANAGE: "bookings.manage",
  MESSAGES_MANAGE: "messages.manage",
  CUSTOMERS_MANAGE: "customers.manage",
  SETTINGS_MANAGE: "settings.manage",
  SEO_MANAGE: "seo.manage",
  USERS_MANAGE: "users.manage",
  AUDIT_VIEW: "audit.view",
  SYSTEM_VIEW: "system.view",
  ALL: "*",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_CATALOG: { key: string; label: string; group: string }[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, label: "Voir le tableau de bord", group: "Général" },
  { key: PERMISSIONS.PAGES_MANAGE, label: "Gérer les pages", group: "Contenu" },
  { key: PERMISSIONS.CATEGORIES_MANAGE, label: "Gérer les catégories", group: "Contenu" },
  { key: PERMISSIONS.PROJECTS_MANAGE, label: "Gérer les projets", group: "Contenu" },
  { key: PERMISSIONS.ARTICLES_MANAGE, label: "Gérer le blog", group: "Contenu" },
  { key: PERMISSIONS.CLIENTS_MANAGE, label: "Gérer les clients", group: "Contenu" },
  { key: PERMISSIONS.NAVIGATION_MANAGE, label: "Gérer la navigation", group: "Contenu" },
  { key: PERMISSIONS.TESTIMONIALS_MANAGE, label: "Gérer les témoignages", group: "Contenu" },
  { key: PERMISSIONS.MEDIA_MANAGE, label: "Gérer la médiathèque", group: "Médias" },
  { key: PERMISSIONS.HOMEPAGE_MANAGE, label: "Gérer la page d'accueil", group: "Médias" },
  { key: PERMISSIONS.BOOKINGS_MANAGE, label: "Gérer les réservations", group: "Activité" },
  { key: PERMISSIONS.MESSAGES_MANAGE, label: "Gérer les messages", group: "Activité" },
  { key: PERMISSIONS.CUSTOMERS_MANAGE, label: "Gérer les clients CRM", group: "Activité" },
  { key: PERMISSIONS.SETTINGS_MANAGE, label: "Gérer les réglages du site", group: "Site" },
  { key: PERMISSIONS.SEO_MANAGE, label: "Gérer le SEO", group: "Site" },
  { key: PERMISSIONS.USERS_MANAGE, label: "Gérer les utilisateurs", group: "Système" },
  { key: PERMISSIONS.AUDIT_VIEW, label: "Consulter le journal d'audit", group: "Système" },
  { key: PERMISSIONS.ALL, label: "Accès complet (toutes les permissions)", group: "Système" },
];
export const ROLE_PRESETS: Record<
  string,
  { name: string; description: string; permissions: string[] }
> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Accès complet à toutes les fonctionnalités du système.",
    permissions: [PERMISSIONS.ALL],
  },
  ADMIN: {
    name: "Administrateur",
    description:
      "Gestion du contenu, des médias, des réservations, des messages et des réglages du site.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PAGES_MANAGE,
      PERMISSIONS.CATEGORIES_MANAGE,
      PERMISSIONS.PROJECTS_MANAGE,
      PERMISSIONS.ARTICLES_MANAGE,
      PERMISSIONS.CLIENTS_MANAGE,
      PERMISSIONS.NAVIGATION_MANAGE,
      PERMISSIONS.TESTIMONIALS_MANAGE,
      PERMISSIONS.MEDIA_MANAGE,
      PERMISSIONS.HOMEPAGE_MANAGE,
      PERMISSIONS.BOOKINGS_MANAGE,
      PERMISSIONS.MESSAGES_MANAGE,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.SETTINGS_MANAGE,
      PERMISSIONS.SEO_MANAGE,
      PERMISSIONS.AUDIT_VIEW,
      PERMISSIONS.SYSTEM_VIEW,
    ],
  },
  EDITOR: {
    name: "Éditeur",
    description:
      "Gestion des pages, catégories, projets, articles, clients et médias assignés.",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PAGES_MANAGE,
      PERMISSIONS.CATEGORIES_MANAGE,
      PERMISSIONS.PROJECTS_MANAGE,
      PERMISSIONS.ARTICLES_MANAGE,
      PERMISSIONS.CLIENTS_MANAGE,
      PERMISSIONS.MEDIA_MANAGE,
    ],
  },
};

export function permissionsForRole(roleKey: string): string[] {
  return ROLE_PRESETS[roleKey]?.permissions ?? [];
}
