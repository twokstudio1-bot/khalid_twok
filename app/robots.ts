import type { MetadataRoute } from "next";
import { getSeoSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let extra: string | null = null;
  try {
    extra = (await getSeoSettings())?.robotsExtra ?? null;
  } catch {
    extra = null;
  }
  const extraRules = extra
    ? extra
        .split(/\r?\n/)
        .map((line) => {
          const match = line.match(/^\s*(Disallow|Allow):\s*(\S+)\s*$/i);
          if (!match) return null;
          return { [match[1].toLowerCase() === "disallow" ? "disallow" : "allow"]: match[2] };
        })
        .filter((entry): entry is Record<string, string> => Boolean(entry))
    : [];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
        ...(extraRules.length ? Object.assign({}, ...extraRules) : {}),
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
