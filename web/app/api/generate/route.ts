import { NextRequest, NextResponse } from "next/server";
import {
  ExtractedFeatures,
  buildGenerationPrompt,
  extractFeatures,
  generateAvatar,
} from "@/lib/pipeline";
import { normalizeFraming } from "@/lib/normalize";
import { applyWatermark } from "@/lib/watermark";
import { stashDownload } from "@/lib/downloads";

export const maxDuration = 120;

interface GenerateRequest {
  imageDataUrl?: string;
  features?: ExtractedFeatures;
}

export async function POST(req: NextRequest) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    let features = body.features;
    if (!features) {
      if (!body.imageDataUrl) {
        return NextResponse.json(
          { error: "imageDataUrl is required" },
          { status: 400 }
        );
      }
      if (body.imageDataUrl.length > 12_000_000) {
        return NextResponse.json(
          { error: "Image too large (max ~8MB)" },
          { status: 413 }
        );
      }
      features = await extractFeatures(body.imageDataUrl);
    }

    const prompt = buildGenerationPrompt(features, Boolean(body.imageDataUrl));
    const rawUrl = await generateAvatar(prompt, body.imageDataUrl);

    const imgRes = await fetch(rawUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image (${imgRes.status})`);
    }
    const normalized = await normalizeFraming(
      Buffer.from(await imgRes.arrayBuffer())
    );
    const watermarked = await applyWatermark(normalized);
    const downloadToken = stashDownload(normalized);

    console.log("[generate] prompt:", prompt);

    return NextResponse.json({
      previewUrl: `data:image/jpeg;base64,${watermarked.toString("base64")}`,
      downloadToken,
    });
  } catch (err) {
    // Full details stay in server logs only — clients get a generic message.
    console.error("[generate] pipeline failed:", err);
    const internal = err instanceof Error ? err.message : "Unknown error";
    const notReady = internal.startsWith("VISION_MODEL_NOT_CONFIGURED");
    return NextResponse.json(
      {
        error: notReady
          ? "The service is temporarily unavailable. Please check back soon — we're on it."
          : "Something went wrong while creating your portrait. Please try again.",
      },
      { status: notReady ? 503 : 502 }
    );
  }
}
