import { NextResponse } from "next/server";

// Liveness probe. MUST stay outside the basic-auth gate (see middleware.ts)
// so the container HEALTHCHECK and deploy smoke can hit it unauthenticated.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, app: "canna-agent" }, { status: 200 });
}
