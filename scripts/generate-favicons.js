import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG Definition for Bold Blue Omega (Ω) Symbol
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Rich Royal / Electric Blue Gradient -->
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#2563eb" />
      <stop offset="100%" stop-color="#1d4ed8" />
    </linearGradient>

    <!-- High-Contrast Soft Outer Shadow for contrast on Light and Dark backgrounds -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#1d4ed8" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Centered Bold Blue Omega (Ω) Symbol -->
  <path d="M 80 379 H 176 A 136 136 0 1 1 336 379 H 432"
        fill="none"
        stroke="url(#blueGrad)"
        stroke-width="80"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#shadow)" />
</svg>`;

// Helper function to build a valid binary ICO file containing multiple PNG images
function createIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (dirEntrySize * numImages);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);

    entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Size of image data
    entry.writeUInt32LE(offset, 12); // Offset of image data

    dirEntries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

async function main() {
  const publicDir = path.resolve('public');
  
  // 1. Write favicon.svg
  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf8');
  console.log('Saved favicon.svg');

  // 2. Generate PNG sizes
  const sizes = [16, 32, 48, 96, 180, 192, 512];
  const pngBuffers = {};

  for (const size of sizes) {
    pngBuffers[size] = await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toBuffer();
  }

  // 3. Save standard PNG files
  fs.writeFileSync(path.join(publicDir, 'favicon-96x96.png'), pngBuffers[96]);
  console.log('Saved favicon-96x96.png');

  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngBuffers[180]);
  console.log('Saved apple-touch-icon.png');

  fs.writeFileSync(path.join(publicDir, 'favicon-48x48.png'), pngBuffers[48]);
  console.log('Saved favicon-48x48.png');

  fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), pngBuffers[192]);
  console.log('Saved android-chrome-192x192.png');

  fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), pngBuffers[512]);
  console.log('Saved android-chrome-512x512.png');

  // 4. Generate multi-resolution ICO file (16, 32, 48)
  const icoBuffer = createIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]], [16, 32, 48]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Saved favicon.ico');

  console.log('All favicon assets successfully generated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
