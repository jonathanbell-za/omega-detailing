import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

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
  const sourceImagePath = path.join(publicDir, 'omega-logo-source.png');

  if (!fs.existsSync(sourceImagePath)) {
    throw new Error(`Source image not found at ${sourceImagePath}`);
  }

  // 1. Trim excess white margin from the source logo image
  const trimmedBuffer = await sharp(sourceImagePath)
    .trim()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedBuffer).metadata();
  const tWidth = trimmedMeta.width;
  const tHeight = trimmedMeta.height;

  // Target canvas size (512x512)
  const canvasSize = 512;
  // Fit trimmed logo horizontally with padding (440px wide)
  const targetLogoWidth = 440;
  const targetLogoHeight = Math.round((tHeight / tWidth) * targetLogoWidth);

  const resizedLogo = await sharp(trimmedBuffer)
    .resize(targetLogoWidth, targetLogoHeight, { fit: 'contain' })
    .toBuffer();

  // Create a 512x512 high-resolution master square image with crisp white background
  // White background ensures high contrast and clarity on both light and dark browser tabs
  const masterBuffer = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
  .composite([
    {
      input: resizedLogo,
      top: Math.round((canvasSize - targetLogoHeight) / 2),
      left: Math.round((canvasSize - targetLogoWidth) / 2)
    }
  ])
  .png()
  .toBuffer();

  // 2. Generate PNG sizes
  const sizes = [16, 32, 48, 96, 180, 192, 512];
  const pngBuffers = {};

  for (const size of sizes) {
    pngBuffers[size] = await sharp(masterBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
  }

  // 3. Save standard PNG files in public/
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

  // Convert master image into base64 PNG data URL to embed in favicon.svg for crisp SVG preview
  const base64Png = masterBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <image width="512" height="512" href="data:image/png;base64,${base64Png}" />
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');
  console.log('Saved favicon.svg');

  // 4. Generate multi-resolution ICO file (16, 32, 48)
  const icoBuffer = createIco([pngBuffers[16], pngBuffers[32], pngBuffers[48]], [16, 32, 48]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Saved favicon.ico');

  console.log('All favicon assets successfully generated from uploaded logo photo!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
