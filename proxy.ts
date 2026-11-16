import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = new Set(["fr", "en"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/") {
    const cookieLocale = request.cookies.get("TWOK_LOCALE")?.value;
    const locale = cookieLocale && locales.has(cookieLocale) ? cookieLocale : "fr";
    return NextResponse.redirect(new URL(`/${locale}${search}`, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-search", search);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const localeMatch = pathname.match(/^\/(fr|en)(\/|$)/);
  if (localeMatch) {
    response.cookies.set("TWOK_LOCALE", localeMatch[1], {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|brand-icon.png|seed|uploads|robots.txt|sitemap.xml).*)",
  ],
};
