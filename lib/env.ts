function normalizeUrl(value: string | undefined, fallback: string) {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  siteUrl: normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  authSecret: process.env.AUTH_SECRET ?? "development-only-insecure-secret",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
  mediaDriver: (process.env.MEDIA_DRIVER ?? "local").toLowerCase(),
  uploadDir: process.env.UPLOAD_DIR ?? "./public/uploads",
  publicUploadUrl: (process.env.PUBLIC_UPLOAD_URL ?? "/uploads").replace(/\/+$/, ""),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 512),
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    region: process.env.S3_REGION ?? "",
    bucket: process.env.S3_BUCKET ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    publicBaseUrl: (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/+$/, ""),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? "false") === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL ?? "",
  },
  whatsappApi: {
    enabled: (process.env.WHATSAPP_API_ENABLED ?? "false") === "true",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    version: process.env.WHATSAPP_API_VERSION ?? "v23.0",
  },
  backupDir: process.env.BACKUP_DIR ?? "./backups",
  backupRetentionDays: Number(process.env.BACKUP_RETENTION_DAYS ?? 14),
} as const;

export function assertEnvForProduction() {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
    missing.push("AUTH_SECRET (min 32 chars)");
  if (!process.env.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
  return missing;
}
