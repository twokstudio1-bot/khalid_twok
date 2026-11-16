import type { Metadata } from "next";
import { headers } from "next/headers";
import { Playfair_Display, Space_Grotesk } from "next/font/google";
import { getSeoSettings, getSiteSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sans = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let seo = null;
  let site = null;
  try {
    [seo, site] = await Promise.all([getSeoSettings(), getSiteSettings()]);
  } catch {
    // Database may be unavailable during image builds; fall back to brand defaults.
  }
  const title = seo?.siteTitleFr ?? "TWOK STUDIO — Photographie, vidéo & drone à Marrakech";
  const description =
    seo?.descriptionFr ??
    "Studio de photographie, vidéo et drone à Marrakech. Images de marque, hôtellerie, immobilier, corporate et contenus éditoriaux.";
  return {
    metadataBase: new URL(absoluteUrl("/")),
    title: {
      default: title,
      template: seo?.titleTemplate ?? "%s · TWOK STUDIO",
    },
    description,
    applicationName: site?.companyName ?? "TWOK STUDIO",
    authors: [{ name: site?.companyName ?? "TWOK STUDIO" }],
    icons: { icon: "/brand-icon.png", apple: "/brand-icon.png" },
    openGraph: {
      type: "website",
      siteName: site?.companyName ?? "TWOK STUDIO",
      title,
      description,
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/fr";
  const locale = pathname.split("/")[1] === "en" ? "en" : "fr";

  return (
    <html lang={locale} className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full bg-cream text-ink antialiased">{children}</body>
    </html>
  );
}
