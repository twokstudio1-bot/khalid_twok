export type AdminMediaView = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  originalName: string;
  altFr: string | null;
  altEn: string | null;
  width: number | null;
  height: number | null;
};
