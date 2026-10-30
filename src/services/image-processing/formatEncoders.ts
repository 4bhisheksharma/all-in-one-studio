/**
 * Format Encoders for Advanced Image Formats
 * 100% Client-side encoding for AVIF, Multi-resolution ICO, PDF Document, 32-bit BMP, and SVG.
 */

export interface FormatOption {
  id: string;
  mimeType: string;
  extension: string;
  label: string;
  badge: string;
  description: string;
  supportsQuality: boolean;
  defaultQuality?: number;
}

export const SUPPORTED_TARGET_FORMATS: FormatOption[] = [
  {
    id: 'webp',
    mimeType: 'image/webp',
    extension: '.webp',
    label: 'WebP',
    badge: 'Modern Web',
    description: 'Outstanding compression efficiency with full alpha transparency support.',
    supportsQuality: true,
    defaultQuality: 85,
  },
  {
    id: 'avif',
    mimeType: 'image/avif',
    extension: '.avif',
    label: 'AVIF',
    badge: 'Next-Gen',
    description: 'Next-generation image coding with superior compression compared to WebP and JPEG.',
    supportsQuality: true,
    defaultQuality: 80,
  },
  {
    id: 'jpeg',
    mimeType: 'image/jpeg',
    extension: '.jpg',
    label: 'JPEG',
    badge: 'Universal',
    description: 'Universally compatible lossy standard for photography and general display.',
    supportsQuality: true,
    defaultQuality: 85,
  },
  {
    id: 'png',
    mimeType: 'image/png',
    extension: '.png',
    label: 'PNG',
    badge: 'Lossless',
    description: 'Uncompressed lossless raster format preserving crisp lines and full alpha channel.',
    supportsQuality: false,
  },
  {
    id: 'ico',
    mimeType: 'image/x-icon',
    extension: '.ico',
    label: 'ICO (Favicon)',
    badge: 'Multi-Res',
    description: 'Windows & Web Favicon bundle containing 16x16, 32x32, 48x48, and 64x64 sub-icons.',
    supportsQuality: false,
  },
  {
    id: 'pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    label: 'PDF Document',
    badge: 'Document',
    description: 'Standard PDF document containing single or multi-page paginated visual layouts.',
    supportsQuality: true,
    defaultQuality: 90,
  },
  {
    id: 'bmp',
    mimeType: 'image/bmp',
    extension: '.bmp',
    label: 'BMP (Bitmap)',
    badge: 'Legacy',
    description: 'Raw uncompressed 32-bit Windows bitmap preserving direct pixel values.',
    supportsQuality: false,
  },
];

let cachedAvifSupport: boolean | null = null;

/**
 * Checks if the browser's HTMLCanvasElement can export to AVIF.
 */
export async function checkAvifSupport(): Promise<boolean> {
  if (cachedAvifSupport !== null) return cachedAvifSupport;
  if (typeof document === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/avif')
    );
    cachedAvifSupport = blob !== null && blob.type === 'image/avif';
  } catch {
    cachedAvifSupport = false;
  }
  return cachedAvifSupport;
}

/**
 * Loads a Blob into an HTMLImageElement asynchronously.
 */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image data'));
    };
    img.src = url;
  });
}

/**
 * Renders a scaled version of an image onto a canvas.
 */
function renderResizedCanvas(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * Converts a canvas to a PNG Uint8Array.
 */
function canvasToPngBuffer(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to encode PNG for ICO sub-icon'));
        return;
      }
      blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, 'image/png');
  });
}

/**
 * Encodes an image into a multi-resolution .ico icon file (16x16, 32x32, 48x48, 64x64).
 */
export async function encodeIcoBundle(
  blob: Blob,
  sizes: number[] = [16, 32, 48, 64]
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(blob);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  const pngBuffers: Uint8Array[] = [];
  for (const s of sizes) {
    const canvas = renderResizedCanvas(img, s, s);
    const buf = await canvasToPngBuffer(canvas);
    pngBuffers.push(buf);
  }

  // ICO header: 6 bytes
  // 0-1: Reserved (0)
  // 2-3: Image type (1 = ICO)
  // 4-5: Number of images (uint16 LE)
  const header = new Uint8Array(6);
  const headerView = new DataView(header.buffer);
  headerView.setUint16(0, 0, true);
  headerView.setUint16(2, 1, true);
  headerView.setUint16(4, pngBuffers.length, true);

  // Each directory entry: 16 bytes
  const dirSize = 16 * pngBuffers.length;
  const dir = new Uint8Array(dirSize);
  const dirView = new DataView(dir.buffer);

  let currentOffset = 6 + dirSize;
  const totalLength = 6 + dirSize + pngBuffers.reduce((acc, b) => acc + b.length, 0);
  const finalFile = new Uint8Array(totalLength);
  finalFile.set(header, 0);

  for (let i = 0; i < pngBuffers.length; i++) {
    const size = sizes[i];
    const data = pngBuffers[i];
    const entryOffset = i * 16;

    dirView.setUint8(entryOffset + 0, size >= 256 ? 0 : size); // Width
    dirView.setUint8(entryOffset + 1, size >= 256 ? 0 : size); // Height
    dirView.setUint8(entryOffset + 2, 0); // Color palette count (0 for 32bpp)
    dirView.setUint8(entryOffset + 3, 0); // Reserved
    dirView.setUint16(entryOffset + 4, 1, true); // Color planes
    dirView.setUint16(entryOffset + 6, 32, true); // Bits per pixel
    dirView.setUint32(entryOffset + 8, data.length, true); // Size of PNG data
    dirView.setUint32(entryOffset + 12, currentOffset, true); // File offset

    // Copy PNG bytes into destination
    finalFile.set(data, currentOffset);
    currentOffset += data.length;
  }

  // Copy directory entries into destination
  finalFile.set(dir, 6);

  const outBlob = new Blob([finalFile as unknown as BlobPart], { type: 'image/x-icon' });
  return { blob: outBlob, width: naturalW, height: naturalH };
}

/**
 * Encodes an image into a 32-bit uncompressed BMP with alpha channel.
 */
export async function encodeBmp(
  blob: Blob
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(blob);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = imageData.data;

  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const pixelDataSize = width * height * 4;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  // BITMAPFILEHEADER (14 bytes)
  uint8[0] = 0x42; // 'B'
  uint8[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true); // Reserved
  view.setUint32(10, fileHeaderSize + infoHeaderSize, true); // Pixel offset

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true); // Positive = bottom-up
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 32, true); // 32 bits per pixel (BGRA)
  view.setUint32(30, 0, true); // BI_RGB (uncompressed)
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true); // 72 DPI (2835 ppm)
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Write pixel data in bottom-up BGRA order
  let destOffset = fileHeaderSize + infoHeaderSize;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      uint8[destOffset++] = rgba[srcIdx + 2]; // Blue
      uint8[destOffset++] = rgba[srcIdx + 1]; // Green
      uint8[destOffset++] = rgba[srcIdx]; // Red
      uint8[destOffset++] = rgba[srcIdx + 3]; // Alpha
    }
  }

  const outBlob = new Blob([buffer], { type: 'image/bmp' });
  return { blob: outBlob, width, height };
}

/**
 * Encodes an image into a standard PDF (1.4) document with embedded JPEG stream.
 */
export async function encodeSingleImagePdf(
  blob: Blob,
  quality = 0.92
): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await loadImage(blob);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Render to canvas with white background (PDF images are RGB)
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0);

  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!jpegBlob) throw new Error('Failed to encode image frame for PDF');

  const jpegBuffer = new Uint8Array(await jpegBlob.arrayBuffer());

  const pdfBytes = buildPdf([
    {
      data: jpegBuffer,
      width,
      height,
    },
  ]);

  const outBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return { blob: outBlob, width, height };
}

/**
 * Encodes multiple image blobs into a multi-page PDF document.
 */
export async function encodeMultiPagePdf(
  blobs: Blob[],
  quality = 0.9
): Promise<{ blob: Blob; pageCount: number }> {
  const pages: { data: Uint8Array; width: number; height: number }[] = [];

  for (const b of blobs) {
    const img = await loadImage(b);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    const jpegBlob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, 'image/jpeg', quality)
    );
    if (!jpegBlob) continue;

    const buf = new Uint8Array(await jpegBlob.arrayBuffer());
    pages.push({ data: buf, width, height });
  }

  if (pages.length === 0) {
    throw new Error('No valid pages could be encoded for PDF');
  }

  const pdfBytes = buildPdf(pages);
  const outBlob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  return { blob: outBlob, pageCount: pages.length };
}

/**
 * Core PDF 1.4 byte builder for embedding JPEG image streams.
 */
function buildPdf(
  pages: { data: Uint8Array; width: number; height: number }[]
): Uint8Array {
  const objects: { num: number; buffer: Uint8Array }[] = [];
  const pageObjNums: number[] = [];
  const numPages = pages.length;

  // Obj 1: Catalog, Obj 2: Pages container
  // We'll fill objects[0] and objects[1] at the end.
  objects.push({ num: 1, buffer: new Uint8Array(0) });
  objects.push({ num: 2, buffer: new Uint8Array(0) });

  for (let i = 0; i < numPages; i++) {
    const { data, width, height } = pages[i];
    const imageObjNum = objects.length + 1;
    const contentObjNum = objects.length + 2;
    const pageObjNum = objects.length + 3;

    // 1. Image XObject
    const imgHeader = new TextEncoder().encode(
      `${imageObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`
    );
    const imgFooter = new TextEncoder().encode('\nendstream\nendobj\n');
    const imgBuffer = new Uint8Array(imgHeader.length + data.length + imgFooter.length);
    imgBuffer.set(imgHeader, 0);
    imgBuffer.set(data, imgHeader.length);
    imgBuffer.set(imgFooter, imgHeader.length + data.length);
    objects.push({ num: imageObjNum, buffer: imgBuffer });

    // 2. Page Content Stream (scaling image to fit page dimension)
    const streamContent = `q\n${width} 0 0 ${height} 0 0 cm\n/Im${i + 1} Do\nQ\n`;
    const streamBytes = new TextEncoder().encode(streamContent);
    const contentText = `${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}endstream\nendobj\n`;
    objects.push({
      num: contentObjNum,
      buffer: new TextEncoder().encode(contentText),
    });

    // 3. Page Object
    const pageText = `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im${i + 1} ${imageObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`;
    objects.push({
      num: pageObjNum,
      buffer: new TextEncoder().encode(pageText),
    });

    pageObjNums.push(pageObjNum);
  }

  // Populate Obj 1 & 2
  const catalogText = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const pagesText = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${numPages} >>\nendobj\n`;
  objects[0] = { num: 1, buffer: new TextEncoder().encode(catalogText) };
  objects[1] = { num: 2, buffer: new TextEncoder().encode(pagesText) };

  // Calculate byte offsets and compile final PDF stream
  const header = new TextEncoder().encode('%PDF-1.4\n');
  const bodyChunks: Uint8Array[] = [header];
  const offsets: number[] = [];
  let curOffset = header.length;

  for (let i = 0; i < objects.length; i++) {
    offsets.push(curOffset);
    bodyChunks.push(objects[i].buffer);
    curOffset += objects[i].buffer.length;
  }

  const startxref = curOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  bodyChunks.push(new TextEncoder().encode(xref + trailer));

  // Merge into single Uint8Array
  const totalLength = bodyChunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of bodyChunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }

  return out;
}
