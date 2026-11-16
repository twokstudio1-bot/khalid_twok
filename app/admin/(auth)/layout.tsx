import Link from "next/link";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-charcoal text-cream lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="relative z-10">
          <Link href="/fr" className="inline-block">
            <span className="block font-serif text-3xl leading-none tracking-[0.08em]">TWOK</span>
            <span className="mt-2 block text-[9px] uppercase tracking-[0.4em] text-cream/50">Studio · Marrakech</span>
          </Link>
        </div>
        <div className="relative z-10 max-w-md">
          <p className="eyebrow-gold">Espace de gestion</p>
          <h2 className="mt-5 font-serif text-[clamp(3rem,5vw,5.2rem)] leading-[0.96]">
            Le studio,
            <br />
            en coulisses.
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream/55">
            Publiez, organisez et suivez l&apos;activité du studio depuis un espace unique. Les réservations restent en attente jusqu&agrave; validation.
          </p>
        </div>
        <div className="relative z-10 flex items-center justify-between text-[9px] uppercase tracking-[0.22em] text-cream/35">
          <span>Marrakech · Maroc</span>
          <span>Africa/Casablanca</span>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-32 top-1/4 h-[520px] w-[520px] border border-cream/10" />
        <div aria-hidden className="pointer-events-none absolute -right-10 top-1/3 h-[340px] w-[340px] border border-gold/20" />
      </div>

      <div className="flex min-h-screen flex-col">
        <div className="flex h-[74px] items-center justify-between border-b border-line px-5 sm:px-8 lg:justify-end">
          <Link href="/fr" className="font-serif text-xl tracking-[0.08em] text-ink lg:hidden">
            TWOK <span className="text-[9px] uppercase tracking-[0.3em] text-muted">Admin</span>
          </Link>
          <Link href="/fr" className="text-[10px] uppercase tracking-[0.16em] text-muted hover:text-ink">
            Retour au site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[430px]">{children}</div>
        </div>
        <div className="px-5 pb-6 text-center text-[9px] uppercase tracking-[0.18em] text-muted-light sm:px-8">
          Accès réservé · TWOK STUDIO
        </div>
      </div>
    </div>
  );
}
