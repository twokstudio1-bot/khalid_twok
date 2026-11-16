import { Mail, MapPin, Phone, Clock3 } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import type { PhoneView } from "@/lib/view";
import { phoneHref } from "@/lib/utils";

export function ContactDetails({
  locale,
  phones,
  email,
  address,
  hours,
}: {
  locale: AppLocale;
  phones: PhoneView[];
  email: string | null;
  address: string | null;
  hours: string | null;
}) {
  return (
    <div className="space-y-6">
      {phones.length > 0 && (
        <div className="border-b border-line pb-5">
          <p className="eyebrow mb-3 flex items-center gap-2"><Phone aria-hidden className="h-3 w-3 text-champagne"  />{locale === "fr" ? "Téléphone" : "Phone"}</p>
          <ul className="space-y-2">
            {phones.map((phone) => (
              <li key={phone.id}>
                <a href={phoneHref(phone.number)} className="inline-flex min-h-10 items-center font-serif text-xl text-ink hover:text-champagne">
                  {phone.number}
                </a>
                <span className="ml-2 text-[9px] uppercase tracking-[0.15em] text-muted">{phone.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {email && (
        <div className="border-b border-line pb-5">
          <p className="eyebrow mb-3 flex items-center gap-2"><Mail aria-hidden className="h-3 w-3 text-champagne"  />E-mail</p>
          <a href={`mailto:${email}`} className="inline-flex min-h-10 items-center font-serif text-xl text-ink hover:text-champagne">{email}</a>
        </div>
      )}
      {address && (
        <div className="border-b border-line pb-5">
          <p className="eyebrow mb-3 flex items-center gap-2"><MapPin aria-hidden className="h-3 w-3 text-champagne"  />{locale === "fr" ? "Adresse" : "Address"}</p>
          <p className="text-sm leading-relaxed text-ink">{address}</p>
        </div>
      )}
      {hours && (
        <div>
          <p className="eyebrow mb-3 flex items-center gap-2"><Clock3 aria-hidden className="h-3 w-3 text-champagne"  />{locale === "fr" ? "Horaires" : "Hours"}</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{hours}</p>
        </div>
      )}
      {!phones.length && !email && !address && !hours && (
        <p className="text-sm leading-relaxed text-muted">
          {locale === "fr"
            ? "Les coordonnées seront publiées prochainement. En attendant, utilisez le formulaire ci-dessous."
            : "Contact details will be published shortly. In the meantime, please use the form below."}
        </p>
      )}
    </div>
  );
}
