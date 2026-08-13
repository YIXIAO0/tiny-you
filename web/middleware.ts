import { NextRequest, NextResponse } from "next/server";

// Beta gate: HTTP Basic Auth, enabled only when SITE_PASSWORD is set.
// Local dev (no SITE_PASSWORD in .env.local) stays open.
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const supplied = decoded.split(":").slice(1).join(":");
      if (supplied === password) return NextResponse.next();
    } catch {
      // fall through to 401
    }
  }

  return new NextResponse("Tiny You is in private beta.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Tiny You beta"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
