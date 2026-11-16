import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export function MaintenanceScreen({
  locale,
  companyName,
  message,
}: {
  locale: "fr" | "en";
  companyName: string;
  message?: string | null;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      <div className="container-editorial flex flex-1 flex-col justify-between py-10">
        <Logo locale={locale} tagline="Marrakech" />
        <div className="max-w-[820px] py-20">
          <p className="eyebrow-gold">Maintenance</p>
          <h1 className="mt-6 font-serif text-[clamp(3rem,8vw,7rem)] leading-[0.94] text-ink">
            {locale === "fr" ? "Le site revient\n très bientôt." : "We will be back\n very soon."}
          </h1>
          <p className="mt-7 max-w-lg text-sm leading-relaxed text-muted">
            {message ||
              (locale === "fr"
                ? "Nous effectuons une mise à jour. Merci de votre patience."
                : "We are carrying out an update. Thank you for your patience.")}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={`/${locale}`} className="btn-outline">
              {locale === "fr" ? "Réessayer" : "Try again"}
            </Link>
          </div>
        </div>
        <p className="text-[9px] uppercase tracking-[0.24em] text-muted">© {new Date().getFullYear()} {companyName}</p>
      </div>
    </main>
  );
}
