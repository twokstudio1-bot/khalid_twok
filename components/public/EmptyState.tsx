import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function EmptyState({
  title,
  text,
  href,
  linkLabel,
  light = false,
}: {
  title: string;
  text: string;
  href?: string;
  linkLabel?: string;
  light?: boolean;
}) {
  return (
    <div className={`border p-10 text-center sm:p-16 ${light ? "border-cream/15 bg-white/[0.03]" : "border-line bg-white"}`}>
      <p className={`font-serif text-3xl ${light ? "text-cream" : "text-ink"}`}>{title}</p>
      <p className={`mx-auto mt-4 max-w-md text-sm leading-relaxed ${light ? "text-cream/55" : "text-muted"}`}>{text}</p>
      {href && linkLabel && (
        <Link href={href} className="link-line mt-7 text-champagne">
          {linkLabel}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
