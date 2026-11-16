import "server-only";
import { getAdminSession } from "@/lib/auth";

export async function isPreviewRequested(value: string | string[] | undefined) {
  return value === "1" || (Array.isArray(value) && value.includes("1"));
}

export async function canPreview(value: string | string[] | undefined) {
  if (!(await isPreviewRequested(value))) return false;
  return Boolean(await getAdminSession());
}
