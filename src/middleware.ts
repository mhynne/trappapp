import { NextRequest, NextResponse } from "next/server";

export const DEVICE_COOKIE = "trapp_device";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gir hver enhet en tilfeldig, anonym ID i en httpOnly-informasjonskapsel.
 * Dette er hele "innloggingen" – ingen navn, e-post eller passord.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(DEVICE_COOKIE)?.value;
  if (existing && UUID_RE.test(existing)) {
    return NextResponse.next();
  }

  const token = crypto.randomUUID();

  // Settes på forespørselen også, slik at siden som rendres nå ser den nye IDen.
  request.cookies.set(DEVICE_COOKIE, token);
  const response = NextResponse.next({ request });
  response.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|webmanifest|js)$).*)"],
};
