import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic-auth gate for the public app.cannabr.org deploy.
 *
 * Accepts credentials in two forms (checked in order):
 *   1. Authorization: Basic <base64> header  (standard browser prompt)
 *   2. ?_u=<user>&_p=<pass> query params     (deep-link / programmatic access)
 *      Strip params from the forwarded URL so they don't reach the app.
 *
 * Gate disabled when AGENT_BASIC_AUTH_PASS is unset (local/dev default).
 * Exempt: /health and Next internals (excluded by matcher below).
 */
export function middleware(req: NextRequest) {
  const expectedPass = process.env.AGENT_BASIC_AUTH_PASS;

  if (!expectedPass) return NextResponse.next();

  const expectedUser = process.env.AGENT_BASIC_AUTH_USER || "canna";

  function authed(user: string, pass: string) {
    return user === expectedUser && pass === expectedPass;
  }

  // 1. Standard Basic auth header.
  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6).trim());
      const idx = decoded.indexOf(":");
      const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
      const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
      if (authed(user, pass)) return NextResponse.next();
    } catch {
      // malformed base64 → fall through
    }
  }

  // 2. Query-param auth: ?_u=<user>&_p=<pass>
  //    Strip params from URL so they never reach the app.
  const url = req.nextUrl.clone();
  const qUser = url.searchParams.get("_u") ?? "";
  const qPass = url.searchParams.get("_p") ?? "";
  if (qUser || qPass) {
    if (authed(qUser, qPass)) {
      url.searchParams.delete("_u");
      url.searchParams.delete("_p");
      return NextResponse.redirect(url);
    }
    // Wrong creds via query → 401 (no browser prompt to avoid loop).
    return new NextResponse("Authentication required", { status: 401 });
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="canna"' },
  });
}

export const config = {
  // Run on every path EXCEPT /health, Next internals, static assets and favicon.
  matcher: ["/((?!health|_next/static|_next/image|favicon.ico).*)"],
};
