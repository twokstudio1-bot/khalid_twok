import type { Metadata } from "next";
import { categoryMetadata, renderCategoryPage } from "@/lib/service-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ locale, path }, search] = await Promise.all([params, searchParams]);
  return categoryMetadata("VIDEO", locale, path ?? [], search.preview);
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale, path }, search] = await Promise.all([params, searchParams]);
  return renderCategoryPage("VIDEO", locale, path ?? [], search);
}
