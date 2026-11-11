import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPNG(width, height, getPixelRGBA) {
  // Scanlines: height lines, each (1 filter byte + width * 4 bytes RGBA)
  const lineLength = 1 + width * 4;
  const rawData = Buffer.alloc(lineLength * height);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineLength;
    rawData[lineOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pixel = getPixelRGBA(x, y, width, height);
      const pixelOffset = lineOffset + 1 + x * 4;
      rawData[pixelOffset] = pixel[0];     // R
      rawData[pixelOffset + 1] = pixel[1]; // G
      rawData[pixelOffset + 2] = pixel[2]; // B
      rawData[pixelOffset + 3] = pixel[3]; // A
    }
  }

  const compressedIDAT = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // IHDR Chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace

  const ihdrChunk = Buffer.alloc(12 + 13);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCRC = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCRC, 21);

  // IDAT Chunk
  const idatChunk = Buffer.alloc(12 + compressedIDAT.length);
  idatChunk.writeUInt32BE(compressedIDAT.length, 0);
  idatChunk.write('IDAT', 4);
  compressedIDAT.copy(idatChunk, 8);
  const idatCRC = crc32(idatChunk.subarray(4, 8 + compressedIDAT.length));
  idatChunk.writeUInt32BE(idatCRC, 8 + compressedIDAT.length);

  // IEND Chunk
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4);
  const iendCRC = crc32(iendChunk.subarray(4, 8));
  iendChunk.writeUInt32BE(iendCRC, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderHarmoniaIcon(x, y, w, h, isMaskable) {
  const nx = x / w;
  const ny = y / h;

  // Maskable mode has safe margin, normal has squircle
  if (!isMaskable) {
    // Squircle distance from center
    const dx = Math.abs(nx - 0.5);
    const dy = Math.abs(ny - 0.5);
    // superellipse r^4
    const r = Math.pow(dx * 2, 4) + Math.pow(dy * 2, 4);
    if (r > 1.05) {
      return [0, 0, 0, 0]; // Transparent outside squircle
    }
  }

  // Background Gradient: Sky Blue (#0284c7) to Indigo (#4f46e5)
  const gradT = (nx + ny) * 0.5;
  const rBg = Math.round(2 + (79 - 2) * gradT);
  const gBg = Math.round(132 + (70 - 132) * gradT);
  const bBg = Math.round(199 + (229 - 199) * gradT);

  // Piano bounding box inside icon
  // Left: 0.15, Right: 0.85, Top: 0.24, Bottom: 0.76
  const pLeft = 0.15 * w;
  const pRight = 0.85 * w;
  const pTop = 0.24 * h;
  const pBottom = 0.76 * h;

  // Outside piano casing? Return background
  if (x < pLeft || x > pRight || y < pTop || y > pBottom) {
    return [rBg, gBg, bBg, 255];
  }

  // Inside casing borders (casing dark slate #090d16)
  const casingPad = 0.02 * w;
  if (x < pLeft + casingPad || x > pRight - casingPad || y < pTop + casingPad || y > pBottom - casingPad) {
    return [9, 13, 22, 255];
  }

  // Red felt strip at top of keys
  const feltHeight = 0.02 * h;
  if (y < pTop + casingPad + feltHeight) {
    return [220, 38, 38, 255]; // Red felt
  }

  // White keys area (7 keys)
  const keyAreaY = pTop + casingPad + feltHeight;
  const keyAreaH = pBottom - casingPad - keyAreaY;
  const keyAreaW = (pRight - casingPad) - (pLeft + casingPad);
  const whiteKeyW = keyAreaW / 7;

  const keyIndex = Math.floor((x - (pLeft + casingPad)) / whiteKeyW);
  const keyX = (x - (pLeft + casingPad)) % whiteKeyW;

  // Key separator line
  if (keyX < 1.5) {
    return [148, 163, 184, 255];
  }

  // Black keys (between 0-1, 1-2, 3-4, 4-5, 5-6)
  const blackKeyIndices = [0, 1, 3, 4, 5];
  const blackKeyW = whiteKeyW * 0.6;
  const blackKeyH = keyAreaH * 0.58;

  for (const bIdx of blackKeyIndices) {
    const bCenter = (pLeft + casingPad) + (bIdx + 1) * whiteKeyW;
    const bLeft = bCenter - blackKeyW * 0.5;
    const bRight = bCenter + blackKeyW * 0.5;

    if (x >= bLeft && x <= bRight && y <= keyAreaY + blackKeyH) {
      // Black key gradient / dark ebony
      const bRatio = (y - keyAreaY) / blackKeyH;
      const bColor = Math.round(40 * (1 - bRatio));
      return [bColor, bColor + 2, bColor + 8, 255];
    }
  }

  // Active Chord Dot Highlights on keys 0 (C: Amber), 2 (E: Sky), 4 (G: Indigo), 6 (B: Purple)
  const isChordKey = [0, 2, 4, 6].includes(keyIndex);
  if (isChordKey) {
    const dotCenterY = keyAreaY + keyAreaH * 0.78;
    const dotCenterX = (pLeft + casingPad) + (keyIndex + 0.5) * whiteKeyW;
    const distSq = Math.pow(x - dotCenterX, 2) + Math.pow(y - dotCenterY, 2);
    const dotRadius = whiteKeyW * 0.28;

    if (distSq <= Math.pow(dotRadius, 2)) {
      if (keyIndex === 0) return [234, 179, 8, 255]; // Amber
      if (keyIndex === 2) return [2, 132, 199, 255]; // Sky
      if (keyIndex === 4) return [99, 102, 241, 255]; // Indigo
      if (keyIndex === 6) return [139, 92, 246, 255]; // Purple
    }
  }

  // White key ivory gradient
  const keyYRatio = (y - keyAreaY) / keyAreaH;
  const keyTone = Math.round(255 - 20 * keyYRatio);
  return [keyTone, keyTone, keyTone - 5, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate pwa-192x192.png
console.log('Generating pwa-192x192.png...');
const png192 = createPNG(192, 192, (x, y, w, h) => renderHarmoniaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// 2. Generate pwa-512x512.png
console.log('Generating pwa-512x512.png...');
const png512 = createPNG(512, 512, (x, y, w, h) => renderHarmoniaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// 3. Generate pwa-maskable-512x512.png
console.log('Generating pwa-maskable-512x512.png...');
const pngMaskable512 = createPNG(512, 512, (x, y, w, h) => renderHarmoniaIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

// 4. Generate apple-touch-icon.png (180x180)
console.log('Generating apple-touch-icon.png...');
const pngApple180 = createPNG(180, 180, (x, y, w, h) => renderHarmoniaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple180);

// 5. Generate favicon-32x32.png and copy to favicon.ico
const png32 = createPNG(32, 32, (x, y, w, h) => renderHarmoniaIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png32);

console.log('All PWA icons generated successfully in /public!');
