import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logAudit } from "@/lib/audit";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const VIDEO_MIMES = new Set(["video/mp4", "video/webm"]);

export function detectMime(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return "image/png";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  const brand = buffer.toString("ascii", 4, 12);
  if (brand.startsWith("ftyp") && /avif|avis/.test(brand)) return "image/avif";
  if (brand.startsWith("ftyp") && /isom|mp4|avc1|iso2|mmp4/.test(brand)) return "video/mp4";
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3)
    return "video/webm";
  return null;
}

export function extensionForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    default:
      return "bin";
  }
}

function storageClient() {
  if (!env.s3.endpoint || !env.s3.bucket || !env.s3.accessKeyId || !env.s3.secretAccessKey)
    return null;
  return new S3Client({
    region: env.s3.region || "auto",
    endpoint: env.s3.endpoint,
    forcePathStyle: env.s3.forcePathStyle,
    credentials: {
      accessKeyId: env.s3.accessKeyId,
      secretAccessKey: env.s3.secretAccessKey,
    },
  });
}

async function putObject(key: string, body: Buffer, contentType: string) {
  const client = storageClient();
  if (!client) throw new Error("S3 storage is selected but is not fully configured.");
  await client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = env.s3.publicBaseUrl || `${env.s3.endpoint.replace(/\/+$/, "")}/${env.s3.bucket}`;
  return `${base}/${key}`;
}

export type UploadResult =
  | { ok: true; media: Awaited<ReturnType<typeof prisma.media.create>> }
  | { ok: false; error: string };

export async function saveUploadedFile(
  file: File,
  uploadedById: string | null,
  meta: { folder?: string; altFr?: string; altEn?: string } = {},
): Promise<UploadResult> {
  const maxBytes = env.maxUploadMb * 1024 * 1024;
  if (!file || file.size === 0) return { ok: false, error: "Fichier vide." };
  if (file.size > maxBytes) {
    return { ok: false, error: `Fichier trop volumineux (maximum ${env.maxUploadMb} Mo).` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectMime(buffer);
  if (!detected) return { ok: false, error: "Format non reconnu. Formats acceptés : JPEG, PNG, WebP, AVIF, MP4, WebM." };

  const isImage = IMAGE_MIMES.has(detected);
  const isVideo = VIDEO_MIMES.has(detected);
  if (!isImage && !isVideo) return { ok: false, error: "Type de fichier non autorisé." };

  const ext = extensionForMime(detected);
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const key = `${folder}/${randomUUID()}.${ext}`;
  let width: number | null = null;
  let height: number | null = null;
  let thumbBuffer: Buffer | null = null;
  let url: string;
  let thumbnailUrl: string | null = null;

  if (isImage) {
    try {
      const image = sharp(buffer, { failOn: "error" });
      const metadata = await image.metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;
      if (!width || !height) return { ok: false, error: "Image invalide." };
      if (width * height > 120_000_000) return { ok: false, error: "Dimensions d'image trop grandes." };
      thumbBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      return { ok: false, error: "Le fichier image est corrompu ou illisible." };
    }
  }

  if (env.mediaDriver === "s3") {
    try {
      url = await putObject(key, buffer, detected);
      if (thumbBuffer) {
        thumbnailUrl = await putObject(`${key.replace(/\.[^.]+$/, "")}-thumb.webp`, thumbBuffer, "image/webp");
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Échec de l'envoi S3." };
    }
  } else {
    const root = path.resolve(process.cwd(), env.uploadDir);
    const target = path.join(root, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    if (thumbBuffer) {
      const thumbTarget = path.join(root, key.replace(/\.[^.]+$/, "") + "-thumb.webp");
      await writeFile(thumbTarget, thumbBuffer);
      thumbnailUrl = `${env.publicUploadUrl}/${key.replace(/\.[^.]+$/, "")}-thumb.webp`;
    }
    url = `${env.publicUploadUrl}/${key}`;
  }

  const media = await prisma.media.create({
    data: {
      kind: isImage ? "IMAGE" : "VIDEO",
      storageKey: key,
      url,
      thumbnailUrl,
      mimeType: detected,
      originalName: file.name.slice(0, 255),
      sizeBytes: file.size,
      width,
      height,
      folder: meta.folder || folder,
      altFr: meta.altFr || file.name.replace(/\.[^.]+$/, "").slice(0, 250),
      altEn: meta.altEn || meta.altFr || file.name.replace(/\.[^.]+$/, "").slice(0, 250),
      uploadedById,
    },
  });

  await logAudit({
    actorId: uploadedById,
    action: "media.upload",
    entityType: "Media",
    entityId: media.id,
    summary: `Média importé : ${media.originalName}`,
  });

  return { ok: true, media };
}

export async function deleteMedia(id: string, actorId: string | null) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media || media.deletedAt) return { ok: false, error: "Média introuvable." };

  const usage = await prisma.mediaReference.count({ where: { mediaId: id } });
  const directUsage = await Promise.all([
    prisma.category.count({ where: { coverMediaId: id } }),
    prisma.project.count({ where: { coverMediaId: id } }),
    prisma.article.count({ where: { coverMediaId: id } }),
    prisma.client.count({ where: { logoMediaId: id } }),
    prisma.page.count({ where: { coverMediaId: id } }),
    prisma.pageTranslation.count({ where: { seoImageId: id } }),
    prisma.projectTranslation.count({ where: { seoImageId: id } }),
    prisma.articleTranslation.count({ where: { seoImageId: id } }),
    prisma.siteSetting.count({ where: { OR: [{ logoMediaId: id }, { logoLightMediaId: id }, { faviconMediaId: id }] } }),
    prisma.seoSetting.count({ where: { defaultOgMediaId: id } }),
    prisma.homepageSetting.count({ where: { ogImageId: id } }),
    prisma.testimonial.count({ where: { photoId: id } }),
    prisma.mediaCollection.count({ where: { coverMediaId: id } }),
    prisma.mediaCollectionItem.count({ where: { mediaId: id } }),
    prisma.projectMedia.count({ where: { mediaId: id } }),
  ]);
  const used = usage + directUsage.reduce((sum, count) => sum + count, 0);
  if (used > 0) {
    return {
      ok: false,
      error: `Ce média est utilisé par ${used} contenu(s). Retirez-le avant de le supprimer.`,
    };
  }

  if (env.mediaDriver !== "s3") {
    const root = path.resolve(process.cwd(), env.uploadDir);
    for (const key of [media.storageKey, media.storageKey.replace(/\.[^.]+$/, "") + "-thumb.webp"]) {
      await unlink(path.join(root, key)).catch(() => undefined);
    }
  }

  await prisma.media.delete({ where: { id } });
  await logAudit({
    actorId,
    action: "media.delete",
    entityType: "Media",
    entityId: id,
    summary: `Média supprimé : ${media.originalName}`,
  });
  return { ok: true };
}

export async function syncMediaReferences(
  tx: Prisma.TransactionClient,
  entityType: string,
  entityId: string,
  mediaIds: (string | null | undefined)[],
) {
  const ids = Array.from(new Set(mediaIds.filter((value): value is string => Boolean(value))));
  await tx.mediaReference.deleteMany({ where: { entityType, entityId } });
  if (ids.length) {
    await tx.mediaReference.createMany({
      data: ids.map((mediaId) => ({ mediaId, entityType, entityId })),
      skipDuplicates: true,
    });
  }
}

export function extractVideoEmbed(url: string | null | undefined): { provider: "youtube" | "vimeo"; embed: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(parsed.hostname)) {
      const id =
        parsed.hostname.includes("youtu.be")
          ? parsed.pathname.slice(1).split("/")[0]
          : parsed.searchParams.get("v") ?? parsed.pathname.split("/").filter(Boolean).pop();
      if (id && /^[A-Za-z0-9_-]{6,20}$/.test(id)) {
        return { provider: "youtube", embed: `https://www.youtube-nocookie.com/embed/${id}` };
      }
    }
    if (/(^|\.)vimeo\.com$/.test(parsed.hostname)) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) {
        return { provider: "vimeo", embed: `https://player.vimeo.com/video/${id}` };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isVideoMedia(media: { kind: string }) {
  return media.kind === "VIDEO";
}
