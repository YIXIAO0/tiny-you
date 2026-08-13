import sharp from "sharp";

const WHITE_THRESHOLD = 235;
const SCAN_WIDTH = 512;

export async function normalizeFraming(input, headRatio = 0.52) {
  const flat = sharp(input).flatten({ background: "#ffffff" });
  const meta = await flat.metadata();
  const W = meta.width;
  const H = meta.height;

  const scale = W / SCAN_WIDTH;
  const SH = Math.round(H / scale);
  const { data, info } = await sharp(input)
    .flatten({ background: "#ffffff" })
    .resize(SCAN_WIDTH, SH)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  let minX = SCAN_WIDTH, minY = SH, maxX = 0, maxY = 0;
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
  if (maxX <= minX || maxY <= minY) return sharp(input).jpeg().toBuffer();

  const bx0 = minX * scale, bx1 = maxX * scale;
  const by0 = minY * scale, by1 = maxY * scale;
  const headW = bx1 - bx0;
  const headH = by1 - by0;
  const frame = Math.round(Math.max(headH, headW) / headRatio);
  const cx = (bx0 + bx1) / 2;
  const cy = (by0 + by1) / 2;

  const pad = frame;
  const left = Math.round(pad + cx - frame / 2);
  const top = Math.round(pad + cy - frame / 2);

  const extended = await sharp(input)
    .flatten({ background: "#ffffff" })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: "#ffffff" })
    .toBuffer();

  return sharp(extended)
    .extract({ left, top, width: frame, height: frame })
    .jpeg({ quality: 92 })
    .toBuffer();
}

const [, , inPath, outPath, ratioArg] = process.argv;
if (inPath && outPath) {
  const ratio = ratioArg ? Number(ratioArg) : 0.52;
  const out = await normalizeFraming(inPath, ratio);
  await sharp(out).toFile(outPath);
  console.log(`normalized ${inPath} -> ${outPath} (head ${ratio * 100}%)`);
}
