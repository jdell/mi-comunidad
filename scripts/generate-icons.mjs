// Generates PWA icons from the logo SVG. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const svg = (padding = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-padding} ${-padding} ${32 + padding * 2} ${32 + padding * 2}">
<rect x="${-padding}" y="${-padding}" width="${32 + padding * 2}" height="${32 + padding * 2}" fill="#c2623f"/>
<rect width="32" height="32" rx="${padding ? 0 : 9}" fill="#c2623f"/>
<path d="M8 24V13.5L16 8l8 5.5V24h-5v-6h-6v6z" fill="#fbf7f0"/>
<circle cx="16" cy="13.5" r="1.6" fill="#c2623f"/></svg>`;

writeFileSync("public/icons/icon.svg", svg());
for (const size of [192, 512]) {
  await sharp(Buffer.from(svg())).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
  await sharp(Buffer.from(svg(6))).resize(size, size).png().toFile(`public/icons/maskable-${size}.png`);
}
await sharp(Buffer.from(svg())).resize(180, 180).png().toFile("src/app/apple-icon.png");
writeFileSync("src/app/icon.svg", svg());
console.log("icons generated");
