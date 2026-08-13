import sharp from "sharp";

export async function applyWatermark(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const W = meta.width ?? 2048;
  const H = meta.height ?? 2048;

  const texts: string[] = [];
  const stepY = Math.round(H / 9);
  const stepX = Math.round(W / 3.2);
  let row = 0;
  for (let y = -H; y < H * 2; y += stepY) {
    const offset = (row % 2) * Math.round(stepX / 2);
    for (let x = -W; x < W * 2; x += stepX) {
      texts.push(
        `<text x="${x + offset}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(
          W / 32
        )}" font-weight="700" letter-spacing="4" fill="rgba(35,32,26,0.16)">TINY YOU</text>`
      );
    }
    row++;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <g transform="rotate(-30 ${W / 2} ${H / 2})">${texts.join("")}</g>
  </svg>`;

  return sharp(input)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 88 })
    .toBuffer();
}
