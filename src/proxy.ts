import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { normalizeReferralCode, REFERRAL_COOKIE } from "@/lib/referral-code";
import { safeNext } from "@/lib/urls";

// Routes that require an authenticated session. Fine-grained authorization
// (membership, roles, platform admin) is enforced again server-side.
const PROTECTED_PREFIXES = ["/c", "/onboarding", "/cuenta", "/admin"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  // Referral links (?ref=MC-XXXX): remember the code for 30 days so it survives sign-in.
  // Invalid codes are silently ignored.
  const ref = normalizeReferralCode(request.nextUrl.searchParams.get("ref"));
  if (ref) {
    response.cookies.set(REFERRAL_COOKIE, ref, { maxAge: 30 * 86_400, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  }

  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && pathname === "/login") {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Skip static assets, images and webhooks.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|offline|icons/|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
