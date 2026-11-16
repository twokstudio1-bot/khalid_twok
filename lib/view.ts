export type MediaView = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  posterUrl: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  altFr: string | null;
  altEn: string | null;
  captionFr: string | null;
  captionEn: string | null;
  originalName: string;
};

export type CategoryNavItem = {
  id: string;
  name: string;
  href: string;
  children: CategoryNavItem[];
};

export type NavItemView = {
  id: string;
  label: string;
  href: string;
  target: string;
  openInNewTab: boolean;
  children: CategoryNavItem[];
};

export type PhoneView = {
  id: string;
  label: string;
  number: string;
  isPrimary: boolean;
  whatsappEnabled: boolean;
};

export type SocialView = {
  id: string;
  platform: string;
  url: string;
  username: string | null;
  icon: string | null;
};
