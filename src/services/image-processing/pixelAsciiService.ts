/**
 * Pixel Art & Retro ASCII Studio Engine
 * Client-side pixelation, palette quantization, Floyd-Steinberg dithering,
 * and ASCII text mapping with canvas terminal rendering.
 */

export type RetroPalette =
  | 'original'
  | 'gameboy'
  | 'cyberpunk'
  | 'pico8'
  | 'monochrome'
  | 'amber-crt'
  | 'matrix-green'
  | 'commodore64';

export interface PaletteColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export const PALETTES: Record<RetroPalette, { name: string; colors: PaletteColor[] }> = {
  original: {
    name: 'Original Sampled',
    colors: [],
  },
  gameboy: {
    name: 'Game Boy Classic',
    colors: [
      { r: 15, g: 56, b: 15, hex: '#0f380f' },
      { r: 48, g: 98, b: 48, hex: '#306230' },
      { r: 139, g: 172, b: 15, hex: '#8bac0f' },
      { r: 155, g: 188, b: 15, hex: '#9bbc0f' },
    ],
  },
  cyberpunk: {
    name: 'Cyberpunk Neon',
    colors: [
      { r: 5, g: 5, b: 26, hex: '#05051a' },
      { r: 121, g: 40, b: 202, hex: '#7928ca' },
      { r: 255, g: 0, b: 85, hex: '#ff0055' },
      { r: 0, g: 240, b: 255, hex: '#00f0ff' },
      { r: 255, g: 255, b: 255, hex: '#ffffff' },
    ],
  },
  pico8: {
    name: 'PICO-8 Fantasy 16',
    colors: [
      { r: 0, g: 0, b: 0, hex: '#000000' },
      { r: 29, g: 43, b: 83, hex: '#1d2b53' },
      { r: 126, g: 37, b: 83, hex: '#7e2553' },
      { r: 0, g: 135, b: 81, hex: '#008751' },
      { r: 171, g: 82, b: 54, hex: '#ab5236' },
      { r: 95, g: 87, b: 79, hex: '#5f574f' },
      { r: 194, g: 195, b: 199, hex: '#c2c3c7' },
      { r: 255, g: 241, b: 232, hex: '#fff1e8' },
      { r: 255, g: 0, b: 77, hex: '#ff004d' },
      { r: 255, g: 163, b: 0, hex: '#ffa300' },
      { r: 255, g: 236, b: 39, hex: '#ffec27' },
      { r: 0, g: 228, b: 54, hex: '#00e436' },
      { r: 41, g: 173, b: 255, hex: '#29adff' },
      { r: 131, g: 118, b: 156, hex: '#83769c' },
      { r: 255, g: 119, b: 168, hex: '#ff77a8' },
      { r: 255, g: 204, b: 170, hex: '#ffccaa' },
    ],
  },
  monochrome: {
    name: '1-Bit Monochrome',
    colors: [
      { r: 0, g: 0, b: 0, hex: '#000000' },
      { r: 255, g: 255, b: 255, hex: '#ffffff' },
    ],
  },
  'amber-crt': {
    name: 'Amber CRT Terminal',
    colors: [
      { r: 18, g: 10, b: 0, hex: '#120a00' },
      { r: 84, g: 46, b: 0, hex: '#542e00' },
      { r: 180, g: 100, b: 0, hex: '#b46400' },
      { r: 255, g: 176, b: 0, hex: '#ffb000' },
    ],
  },
  'matrix-green': {
    name: 'Matrix Phosphor',
    colors: [
      { r: 0, g: 17, b: 5, hex: '#001105' },
      { r: 0, g: 60, b: 20, hex: '#003c14' },
      { r: 0, g: 140, b: 50, hex: '#008c32' },
      { r: 0, g: 255, b: 100, hex: '#00ff64' },
    ],
  },
  commodore64: {
    name: 'Commodore 64',
    colors: [
      { r: 0, g: 0, b: 0, hex: '#000000' },
      { r: 255, g: 255, b: 255, hex: '#ffffff' },
      { r: 136, g: 0, b: 0, hex: '#880000' },
      { r: 170, g: 255, b: 238, hex: '#aaffee' },
      { r: 204, g: 68, b: 204, hex: '#cc44cc' },
      { r: 0, g: 204, b: 85, hex: '#00cc55' },
      { r: 0, g: 0, b: 170, hex: '#0000aa' },
      { r: 238, g: 238, b: 119, hex: '#eeee77' },
      { r: 221, g: 136, b: 85, hex: '#dd8855' },
      { r: 102, g: 68, b: 0, hex: '#664400' },
      { r: 255, g: 119, b: 119, hex: '#ff7777' },
      { r: 51, g: 51, b: 51, hex: '#333333' },
      { r: 119, g: 119, b: 119, hex: '#777777' },
      { r: 170, g: 255, b: 102, hex: '#aaff66' },
      { r: 0, g: 136, b: 255, hex: '#0088ff' },
      { r: 187, g: 187, b: 187, hex: '#bbbbbb' },
    ],
  },
};

export const ASCII_RAMPS: Record<string, { label: string; chars: string }> = {
  standard: { label: 'Standard Density', chars: '@%#*+=-:. ' },
  blocks: { label: 'Block Shade', chars: '█▓▒░ ' },
  minimal: { label: 'Minimalist', chars: '#O+-. ' },
  binary: { label: 'Binary Code', chars: '10 ' },
  hacker: { label: 'Terminal Code', chars: '@01#*+=~-:. ' },
};

export interface PixelArtOptions {
  pixelSize: number; // 2, 4, 6, 8, 12, 16, 24, 32
  palette: RetroPalette;
  dither: boolean;
  sharpBorders: boolean;
}

export interface AsciiArtOptions {
  columns: number; // 40, 80, 100, 120, 160
  ramp: string; // standard, blocks, etc.
  invert: boolean;
  colorMode: 'monochrome' | 'color';
}

export const pixelAsciiService = {
  /**
   * Find nearest color in a given palette by Euclidean distance.
   */
  findNearestColor(r: number, g: number, b: number, palette: PaletteColor[]): PaletteColor {
    let minDistance = Infinity;
    let nearest = palette[0];

    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      // Weighted color distance for human perception
      const dr = r - p.r;
      const dg = g - p.g;
      const db = b - p.b;
      const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;

      if (dist < minDistance) {
        minDistance = dist;
        nearest = p;
      }
    }
    return nearest;
  },

  /**
   * Render Pixel Art from image source.
   */
  async renderPixelArt(
    img: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
    options: PixelArtOptions
  ): Promise<HTMLCanvasElement> {
    const { pixelSize, palette, dither, sharpBorders } = options;

    const srcW = img.width;
    const srcH = img.height;

    // Small canvas to downsample
    const downW = Math.max(1, Math.floor(srcW / pixelSize));
    const downH = Math.max(1, Math.floor(srcH / pixelSize));

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = downW;
    smallCanvas.height = downH;
    const smallCtx = smallCanvas.getContext('2d', { willReadFrequently: true });
    if (!smallCtx) throw new Error('Failed to get small canvas context');

    smallCtx.drawImage(img, 0, 0, downW, downH);
    const imgData = smallCtx.getImageData(0, 0, downW, downH);
    const data = imgData.data;

    const paletteColors = PALETTES[palette]?.colors || [];
    const hasPalette = palette !== 'original' && paletteColors.length > 0;

    // Palette quantization & Floyd-Steinberg dithering
    if (hasPalette) {
      if (dither) {
        // Floyd-Steinberg error diffusion
        for (let y = 0; y < downH; y++) {
          for (let x = 0; x < downW; x++) {
            const idx = (y * downW + x) * 4;
            const oldR = data[idx];
            const oldG = data[idx + 1];
            const oldB = data[idx + 2];

            const nearest = this.findNearestColor(oldR, oldG, oldB, paletteColors);
            data[idx] = nearest.r;
            data[idx + 1] = nearest.g;
            data[idx + 2] = nearest.b;

            const errR = oldR - nearest.r;
            const errG = oldG - nearest.g;
            const errB = oldB - nearest.b;

            const distribute = (nx: number, ny: number, factor: number) => {
              if (nx >= 0 && nx < downW && ny >= 0 && ny < downH) {
                const nIdx = (ny * downW + nx) * 4;
                data[nIdx] = Math.min(255, Math.max(0, data[nIdx] + (errR * factor) / 16));
                data[nIdx + 1] = Math.min(255, Math.max(0, data[nIdx + 1] + (errG * factor) / 16));
                data[nIdx + 2] = Math.min(255, Math.max(0, data[nIdx + 2] + (errB * factor) / 16));
              }
            };

            distribute(x + 1, y, 7);
            distribute(x - 1, y + 1, 3);
            distribute(x, y + 1, 5);
            distribute(x + 1, y + 1, 1);
          }
        }
      } else {
        // Direct nearest color without dithering
        for (let i = 0; i < data.length; i += 4) {
          const nearest = this.findNearestColor(data[i], data[i + 1], data[i + 2], paletteColors);
          data[i] = nearest.r;
          data[i + 1] = nearest.g;
          data[i + 2] = nearest.b;
        }
      }
      smallCtx.putImageData(imgData, 0, 0);
    }

    // Upscale smallCanvas back onto crisp pixel canvas with smoothing disabled
    const outCanvas = document.createElement('canvas');
    outCanvas.width = downW * pixelSize;
    outCanvas.height = downH * pixelSize;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('Failed to get out canvas context');

    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(smallCanvas, 0, 0, outCanvas.width, outCanvas.height);

    // Optional pixel grid overlay
    if (sharpBorders && pixelSize >= 6) {
      outCtx.save();
      outCtx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      outCtx.lineWidth = 1;
      for (let x = 0; x <= outCanvas.width; x += pixelSize) {
        outCtx.beginPath();
        outCtx.moveTo(x, 0);
        outCtx.lineTo(x, outCanvas.height);
        outCtx.stroke();
      }
      for (let y = 0; y <= outCanvas.height; y += pixelSize) {
        outCtx.beginPath();
        outCtx.moveTo(0, y);
        outCtx.lineTo(outCanvas.width, y);
        outCtx.stroke();
      }
      outCtx.restore();
    }

    return outCanvas;
  },

  /**
   * Generate raw ASCII text and metadata from image source.
   */
  generateAsciiText(
    img: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
    options: AsciiArtOptions
  ): { text: string; lines: string[]; width: number; height: number; colors: string[][] } {
    const { columns, ramp, invert } = options;
    const rampChars = ASCII_RAMPS[ramp]?.chars || ASCII_RAMPS.standard.chars;
    const rampLen = rampChars.length;

    // Character aspect ratio compensation (fonts are taller than wide, approx 0.5 ratio)
    const charAspect = 0.52;
    const targetW = columns;
    const targetH = Math.max(1, Math.round((img.height / img.width) * columns * charAspect));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    const lines: string[] = [];
    const colorMatrix: string[][] = [];

    for (let y = 0; y < targetH; y++) {
      let line = '';
      const lineColors: string[] = [];

      for (let x = 0; x < targetW; x++) {
        const idx = (y * targetW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3] / 255;

        // Relative luminance
        let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        lum *= a; // Handle transparent areas

        if (invert) {
          lum = 1 - lum;
        }

        const charIdx = Math.min(rampLen - 1, Math.floor(lum * rampLen));
        const char = rampChars[charIdx] || ' ';
        line += char;

        lineColors.push(`rgb(${r},${g},${b})`);
      }

      lines.push(line);
      colorMatrix.push(lineColors);
    }

    return {
      text: lines.join('\n'),
      lines,
      width: targetW,
      height: targetH,
      colors: colorMatrix,
    };
  },

  /**
   * Render ASCII text to an image canvas with dark terminal background.
   */
  renderAsciiToCanvas(
    asciiData: { lines: string[]; width: number; height: number; colors: string[][] },
    options: { colorMode: 'monochrome' | 'color'; fontSize?: number }
  ): HTMLCanvasElement {
    const fontSize = options.fontSize || 12;
    const lineHeight = fontSize * 1.15;
    const charWidth = fontSize * 0.6;

    const pad = 24;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(asciiData.width * charWidth + pad * 2);
    canvas.height = Math.round(asciiData.height * lineHeight + pad * 2);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Terminal dark background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px "SF Mono", Monaco, Consolas, "Liberation Mono", monospace`;
    ctx.textBaseline = 'top';

    const isColor = options.colorMode === 'color';

    for (let row = 0; row < asciiData.lines.length; row++) {
      const line = asciiData.lines[row];
      const y = pad + row * lineHeight;

      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        if (char === ' ') continue;

        const x = pad + col * charWidth;
        if (isColor) {
          ctx.fillStyle = asciiData.colors[row]?.[col] || '#22c55e';
        } else {
          ctx.fillStyle = '#22c55e'; // classic phosphor green
        }
        ctx.fillText(char, x, y);
      }
    }

    return canvas;
  },
};
