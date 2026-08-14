import sharp from "sharp";

const WHITE_THRESHOLD = 235;
const SCAN_WIDTH = 512;

/**
 * Deterministic framing: measure the head's pixel bounding box on the white
 * background and re-crop so the head always occupies the same fraction of the
 * frame, centered. Prompt-level composition hints are unreliable; this is not.
 */
export async function normalizeFraming(
  input: Buffer,
  headRatio = 0.68
): Promise<Buffer> {
  const meta = await sharp(input).flatten({ background: "#ffffff" }).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) return input;

  const scale = W / SCAN_WIDTH;
  const SH = Math.round(H / scale);
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .resize(SCAN_WIDTH, SH)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const cornerIdx = (2 * SCAN_WIDTH + 2) * ch;
  const bg = {
    r: data[cornerIdx],
    g: data[cornerIdx + 1],
    b: data[cornerIdx + 2],
  };
  let minX = SCAN_WIDTH;
  let minY = SH;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SCAN_WIDTH; x++) {
      const i = (y * SCAN_WIDTH + x) * ch;
      if (
        data[i] < WHITE_THRESHOLD ||
        data[i + 1] < WHITE_THRESHOLD ||
        data[i + 2] < WHITE_THRESHOLD
      ) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return input;

  const bx0 = minX * scale;
  const bx1 = maxX * scale;
  const by0 = minY * scale;
  const by1 = maxY * scale;
  const headSize = Math.max(by1 - by0, bx1 - bx0);
  const frame = Math.round(headSize / headRatio);
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;

  const pad = frame;
  const extended = await sharp(input)
    .flatten({ background: "#ffffff" })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: bg,
    })
    .toBuffer();

  // White-point correction: measure the background tint and scale it up to
  // pure white so every portrait ships on a true-white canvas.
  const gain = (v: number): number =>
    v > 0 ? Math.min(255 / v, 1.08) : 1;
  return sharp(extended)
    .extract({
      left: Math.round(pad + cx - frame / 2),
      top: Math.round(pad + cy - frame / 2),
      width: frame,
      height: frame,
    })
    .linear([gain(bg.r), gain(bg.g), gain(bg.b)], [0, 0, 0])
    .jpeg({ quality: 92 })
    .toBuffer();
}

/** True if the top/left/right edge has non-white content (content cut off). */
export async function topEdgeTouched(input: Buffer): Promise<boolean> {
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const dark = (idx: number): boolean =>
    data[idx] < 235 || data[idx + 1] < 235 || data[idx + 2] < 235;
  for (let x = 0; x < 64; x++) {
    if (dark(x * ch)) return true;
  }
  for (let y = 0; y < 64; y++) {
    if (dark(y * 64 * ch) || dark((y * 64 + 63) * ch)) return true;
  }
  return false;
}
