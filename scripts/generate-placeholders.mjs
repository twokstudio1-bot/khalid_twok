#!/usr/bin/env node
/**
 * Generates abstract, non-representational editorial placeholders used by seed data.
 * They are intentionally not photographs and carry no client content. Replace them
 * with real TWOK STUDIO media from the CMS.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(process.cwd(), "public/seed");
await mkdir(outDir, { recursive: true });

const palettes = [
  ["#f3ede3", "#c9ad7c", "#2c2925", "#8a7551"],
  ["#e8e2d6", "#a9967a", "#1d1c1a", "#d8c9ae"],
  ["#dcd5c7", "#b08968", "#26221d", "#efe6d6"],
  ["#f1ece4", "#8d9a8f", "#242a26", "#c8bda8"],
  ["#ece6dc", "#c4a484", "#33302a", "#a88c68"],
  ["#e2ddd3", "#9d8c74", "#1f1e1b", "#cbb99b"],
];

function composition(index, width, height) {
  const [bg, warm, dark, mid] = palettes[index % palettes.length];
  const seed = index + 3;
  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${mid}" stop-opacity="0.75"/>
    </linearGradient>
    <radialGradient id="orb" cx="${30 + (seed * 7) % 40}%" cy="${35 + (seed * 5) % 30}%" r="55%">
      <stop offset="0%" stop-color="${warm}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${warm}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${warm}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="shadow" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${dark}" stop-opacity="0.38"/>
      <stop offset="60%" stop-color="${dark}" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="${dark}" stop-opacity="0.22"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="${width / 28}"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#base)"/>
  <rect width="100%" height="100%" fill="url(#orb)"/>
  <ellipse cx="${width * (0.62 + (index % 3) * 0.04)}" cy="${height * 0.38}" rx="${width * 0.3}" ry="${height * 0.42}" fill="${warm}" opacity="0.22" filter="url(#soft)"/>
  <g opacity="0.5" stroke="${dark}" stroke-width="1.5" fill="none">
    <circle cx="${width * 0.26}" cy="${height * 0.68}" r="${Math.min(width, height) * (0.16 + (index % 4) * 0.02)}"/>
    <circle cx="${width * 0.26}" cy="${height * 0.68}" r="${Math.min(width, height) * (0.24 + (index % 4) * 0.02)}"/>
  </g>
  <rect x="${width * 0.52}" y="0" width="${width * 0.48}" height="100%" fill="url(#shadow)"/>
  <rect x="${width * 0.08}" y="${height * 0.12}" width="${width * 0.005}" height="${height * 0.34}" fill="${dark}" opacity="0.5"/>
  <rect x="${width * 0.08}" y="${height * 0.12}" width="${width * 0.18}" height="1" fill="${dark}" opacity="0.35"/>
  <text x="${width * 0.08}" y="${height * 0.5}" font-family="Georgia, serif" font-size="${Math.round(height * 0.024)}" letter-spacing="${height * 0.008}" fill="${dark}" opacity="0.55">TWOK STUDIO — ${String(index + 1).padStart(2, "0")}</text>
  <rect width="100%" height="100%" filter="url(#grain)" opacity="0.055" style="mix-blend-mode:multiply"/>
</svg>`;
  return Buffer.from(svg);
}

const definitions = [
  { name: "seed-hero", w: 2400, h: 1500, index: 1 },
  { name: "seed-intro", w: 1600, h: 2000, index: 2 },
  { name: "seed-corporate", w: 1800, h: 1200, index: 0 },
  { name: "seed-wedding", w: 1600, h: 1100, index: 4 },
  { name: "seed-medical", w: 1600, h: 1100, index: 3 },
  { name: "seed-event", w: 1800, h: 1200, index: 2 },
  { name: "seed-realestate", w: 1600, h: 2000, index: 5 },
  { name: "seed-portrait", w: 1400, h: 1800, index: 1 },
  { name: "seed-hospitality", w: 1800, h: 1200, index: 4 },
  { name: "seed-food", w: 1500, h: 1500, index: 3 },
  { name: "seed-product", w: 1500, h: 1500, index: 0 },
  { name: "seed-fashion", w: 1400, h: 1900, index: 5 },
  { name: "seed-commercial", w: 1800, h: 1200, index: 2 },
  { name: "seed-film", w: 1920, h: 1080, index: 5 },
  { name: "seed-drone", w: 1920, h: 1280, index: 3 },
  { name: "seed-studio", w: 1600, h: 1100, index: 1 },
  { name: "seed-blog-1", w: 1600, h: 1100, index: 0 },
  { name: "seed-blog-2", w: 1600, h: 1100, index: 4 },
  { name: "seed-blog-3", w: 1600, h: 1100, index: 2 },
  { name: "seed-bts", w: 1600, h: 1200, index: 5 },
];

const manifest = [];
for (const def of definitions) {
  const file = `${def.name}.jpg`;
  const target = path.join(outDir, file);
  const info = await sharp(composition(def.index, def.w, def.h))
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(target);
  manifest.push({
    file,
    width: info.width,
    height: info.height,
    sizeBytes: info.size,
    url: `/seed/${file}`,
  });
}

await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.length} placeholder images in public/seed`);

// Brand icon (typographic T, no invented logo)
const iconSvg = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
<rect width="512" height="512" fill="#141311"/>
<text x="256" y="345" text-anchor="middle" font-family="Georgia, serif" font-size="310" fill="#c9ad7c">T</text>
<rect x="96" y="400" width="320" height="1" fill="#c9ad7c" opacity="0.5"/>
</svg>`);
await sharp(iconSvg).png().toFile(path.resolve(process.cwd(), "public/brand-icon.png"));
console.log("Brand icon generated");
