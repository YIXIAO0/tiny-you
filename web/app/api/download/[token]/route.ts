import { NextRequest, NextResponse } from "next/server";
import { takeDownload } from "@/lib/downloads";

// TODO(payments): gate this behind a completed Lemon Squeezy / Paddle checkout
// before launch. Until then the endpoint exists for end-to-end testing only.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const buf = takeDownload(token);
  if (!buf) {
    return NextResponse.json(
      { error: "This download has expired. Portraits are erased after 10 minutes — please generate again." },
      { status: 410 }
    );
  }
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'attachment; filename="tiny-you-portrait.jpg"',
      "Cache-Control": "no-store",
    },
  });
}
