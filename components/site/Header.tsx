import type { NavItemView } from "@/lib/view";
import type { Dictionary } from "@/lib/i18n";
import { HeaderNav } from "@/components/site/HeaderNav";

export function Header({
  locale,
  dict,
  items,
  availableLocales,
}: {
  locale: "fr" | "en";
  dict: Dictionary;
  items: NavItemView[];
  availableLocales: string[];
}) {
  return (
    <HeaderNav
      locale={locale}
      dict={dict}
      items={items}
      availableLocales={availableLocales}
      bookLabel={dict.bookNow}
      tagline={locale === "fr" ? "Marrakech" : "Marrakech"}
    />
  );
}
