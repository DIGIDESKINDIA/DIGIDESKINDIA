import { readFile } from "node:fs/promises";
import sharp from "sharp";

const input = await readFile("public/images/right-hero.png");
const form = new FormData();
form.append("file", new Blob([input], { type: "image/png" }), "right-hero.png");
const response = await fetch("http://localhost:3000/api/image/remove-background", { method: "POST", body: form });
console.log("status", response.status, response.headers.get("content-type"));
const output = Buffer.from(await response.arrayBuffer());
if (!response.ok) {
  console.log(output.toString());
  process.exit(1);
}
const metadata = await sharp(output).metadata();
const raw = await sharp(output).raw().toBuffer();
const source = await sharp(input).ensureAlpha().raw().toBuffer();
let opaque = 0;
let transparent = 0;
let soft = 0;
let changed = 0;
let minAlpha = 255;
let maxAlpha = 0;
for (let index = 0; index < raw.length; index += 4) {
  const alpha = raw[index + 3];
  minAlpha = Math.min(minAlpha, alpha);
  maxAlpha = Math.max(maxAlpha, alpha);
  if (alpha === 0) transparent++;
  else if (alpha === 255) opaque++;
  else soft++;
  if (alpha >= 250 && (raw[index] !== source[index] || raw[index + 1] !== source[index + 1] || raw[index + 2] !== source[index + 2])) changed++;
}
if (metadata.channels !== 4 || metadata.hasAlpha !== true || metadata.isPalette === true || transparent === 0 || soft === 0 || changed !== 0) process.exit(1);
console.log({ bytes: output.length, width: metadata.width, height: metadata.height, channels: metadata.channels, hasAlpha: metadata.hasAlpha, opaque, transparent, soft, minAlpha, maxAlpha, changed });
