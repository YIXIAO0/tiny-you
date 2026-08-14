import { NextRequest, NextResponse } from "next/server";
import {
  DEAGE_PROMPT,
  FACE_CLEANUP_PROMPT,
  TOP_REPAIR_PROMPT,
  ExtractedFeatures,
  buildGenerationPrompt,
  extractFeatures,
  generateAvatar,
  pickFunStyle,
} from "@/lib/pipeline";
import { normalizeFraming, topEdgeTouched } from "@/lib/normalize";
import { applyWatermark } from "@/lib/watermark";
import { stashDownload } from "@/lib/downloads";

export const maxDuration = 300;

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

    const showsTeeth = /露齿|大笑|露出牙|咧嘴/.test(features.expression.type);
    const fun = pickFunStyle(showsTeeth, features.basic.gender);
    const prompt = buildGenerationPrompt(
      features,
      Boolean(body.imageDataUrl),
      fun
    );

    // Two-pass i2i: dedicated de-aging transform first, then styling/accessories.
    // A single-purpose instruction beats one overloaded prompt on compliance.
    let sourceImage = body.imageDataUrl;
    if (sourceImage) {
      sourceImage = await generateAvatar(DEAGE_PROMPT, sourceImage);
    }
    let rawUrl = await generateAvatar(prompt, sourceImage);
    // Bearded/stubbled source photos leak shadows through i2i — run a
    // surgical cleanup pass only when the extraction flagged facial hair.
    if (body.imageDataUrl && features.facial_hair?.includes("有")) {
      rawUrl = await generateAvatar(FACE_CLEANUP_PROMPT, rawUrl);
    }

    let imgRes = await fetch(rawUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image (${imgRes.status})`);
    }
    let imgBuf = Buffer.from(await imgRes.arrayBuffer());
    // If content got cut off at a canvas edge, repair (up to 2 attempts).
    for (let attempt = 0; attempt < 2 && (await topEdgeTouched(imgBuf)); attempt++) {
      rawUrl = await generateAvatar(TOP_REPAIR_PROMPT, rawUrl);
      imgRes = await fetch(rawUrl);
      if (!imgRes.ok) break;
      imgBuf = Buffer.from(await imgRes.arrayBuffer());
    }
    const normalized = await normalizeFraming(imgBuf);
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
