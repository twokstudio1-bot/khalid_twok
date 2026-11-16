import type { Metadata } from "next";
import { renderServiceLanding, serviceLandingMetadata } from "@/lib/service-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return serviceLandingMetadata("PHOTO", locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return renderServiceLanding("PHOTO", locale);
}
