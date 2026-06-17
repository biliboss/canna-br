import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic-auth gate for the public app.cannabr.org deploy.
 *
 * - If AGENT_BASIC_AUTH_PASS is UNSET → allow everything (local/dev default).
 * - If SET → every request must carry a matching `Authorization: Basic` header,
 *   user = AGENT_BASIC_AUTH_USER (default "canna"), pass = AGENT_BASIC_AUTH_PASS.
 *
 * Exempt: /health (smoke + container HEALTHCHECK) and Next internals/static,
 * which are already excluded by the matcher below.
 *
 * Dependency-free: uses the Edge runtime's global atob().
 */
export function middleware(req: NextRequest) {
  const expectedPass = process.env.AGENT_BASIC_AUTH_PASS;

  // Gate disabled when no password configured (dev).
  if (!expectedPass) return NextResponse.next();

  const expectedUser = process.env.AGENT_BASIC_AUTH_USER || "canna";

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6).trim());
      const idx = decoded.indexOf(":");
      const user = idx >= 0 ? decoded.slice(0, idx) : decoded;
      const pass = idx >= 0 ? decoded.slice(idx + 1) : "";
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    } catch {
      // malformed base64 → fall through to 401
    }
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
