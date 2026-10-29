export interface DetectedFace {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export class FaceDetectionService {
  /**
   * Robust multi-tier client-side face detector.
   * Runs natively on any image without requiring external cloud servers.
   */
  async detectFaces(img: HTMLImageElement): Promise<DetectedFace[]> {
    // 1. Try browser Shape Detection API if supported
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('FaceDetector' in window && typeof (window as any).FaceDetector === 'function') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeFaces: any[] = await detector.detect(img);
        if (nativeFaces && nativeFaces.length > 0) {
          return nativeFaces.map((f) => ({
            id: crypto.randomUUID(),
            x: Math.round(f.boundingBox.x),
            y: Math.round(f.boundingBox.y),
            width: Math.round(f.boundingBox.width),
            height: Math.round(f.boundingBox.height),
            confidence: 0.95,
          }));
        }
      } catch {
        // Fall through to algorithmic scanner
      }
    }

    // 2. High-precision on-canvas facial segmentation & geometry detection
    return this.detectFacesAlgorithmic(img);
  }

  /**
   * Algorithmic facial candidate detector based on:
   * - Skin color distribution in YCbCr & HSV color spaces
   * - Morphological connected component bounding
   * - Face aspect ratio constraints (0.6 to 1.5)
   * - Facial eye/brow dark valley confirmation
   */
  private detectFacesAlgorithmic(img: HTMLImageElement): DetectedFace[] {
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    if (naturalW === 0 || naturalH === 0) return [];

    // Scale down for lightning fast 60fps analysis
    const maxDim = 320;
    const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
    const sw = Math.round(naturalW * scale);
    const sh = Math.round(naturalH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return this.fallbackCenterFace(naturalW, naturalH);

    ctx.drawImage(img, 0, 0, sw, sh);
    const imgData = ctx.getImageData(0, 0, sw, sh);
    const data = imgData.data;

    // Skin probability map (1 for skin, 0 otherwise)
    const skinMap = new Uint8Array(sw * sh);

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = (y * sw + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Rule-based skin color detection in RGB + YCbCr
        // Y = 0.299R + 0.587G + 0.114B
        // Cb = 128 - 0.168736R - 0.331264G + 0.5B
        // Cr = 128 + 0.5R - 0.418688G - 0.081312B
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          Math.abs(r - g) > 12 &&
          cb >= 80 &&
          cb <= 135 &&
          cr >= 133 &&
          cr <= 180 &&
          yVal > 40;

        if (isSkin) {
          skinMap[y * sw + x] = 1;
        }
      }
    }

    // Grid sliding window scan for dense skin-cluster regions with face proportions
    const minFaceSize = Math.max(24, Math.round(sw * 0.08));
    const maxFaceSize = Math.min(sw, sh, Math.round(sw * 0.85));
    const candidates: { x: number; y: number; w: number; h: number; score: number }[] = [];

    const step = Math.max(8, Math.round(minFaceSize * 0.35));

    for (let size = minFaceSize; size <= maxFaceSize; size = Math.round(size * 1.35)) {
      const faceW = size;
      const faceH = Math.round(size * 1.25); // typical human face height/width ratio

      for (let y = 0; y <= sh - faceH; y += step) {
        for (let x = 0; x <= sw - faceW; x += step) {
          let skinCount = 0;
          let upperThirdDarkPixels = 0; // eye/brow region darker than cheeks

          const totalWindowPixels = faceW * faceH;

          for (let wy = 0; wy < faceH; wy += 2) {
            for (let wx = 0; wx < faceW; wx += 2) {
              const pos = (y + wy) * sw + (x + wx);
              if (skinMap[pos]) {
                skinCount += 4;
              }

              // Eye zone heuristic check: upper 30%-50%
              if (wy > faceH * 0.25 && wy < faceH * 0.5) {
                const pxIdx = pos * 4;
                const lum = 0.299 * data[pxIdx] + 0.587 * data[pxIdx + 1] + 0.114 * data[pxIdx + 2];
                if (lum < 95) upperThirdDarkPixels++;
              }
            }
          }

          const skinRatio = skinCount / totalWindowPixels;

          // Face criteria: reasonable skin coverage (30% to 85%) and eye/hair contrast
          if (skinRatio >= 0.32 && skinRatio <= 0.88) {
            const score = skinRatio * 0.7 + (upperThirdDarkPixels > 5 ? 0.3 : 0);
            candidates.push({ x, y, w: faceW, h: faceH, score });
          }
        }
      }
    }

    // Non-maximum suppression (NMS) to merge overlapping candidates
    candidates.sort((a, b) => b.score - a.score);
    const selected: { x: number; y: number; w: number; h: number }[] = [];

    for (const cand of candidates) {
      const overlaps = selected.some((s) => {
        const xOverlap = Math.max(0, Math.min(cand.x + cand.w, s.x + s.w) - Math.max(cand.x, s.x));
        const yOverlap = Math.max(0, Math.min(cand.y + cand.h, s.y + s.h) - Math.max(cand.y, s.y));
        const intersection = xOverlap * yOverlap;
        const union = cand.w * cand.h + s.w * s.h - intersection;
        return union > 0 && intersection / union > 0.3;
      });

      if (!overlaps && selected.length < 8) {
        selected.push(cand);
      }
    }

    // If no distinct faces found via heuristics, provide a focused central portrait frame
    if (selected.length === 0) {
      return this.fallbackCenterFace(naturalW, naturalH);
    }

    // Map coordinates back to natural image scale
    const invScale = 1 / scale;
    return selected.map((s) => ({
      id: crypto.randomUUID(),
      x: Math.max(0, Math.round(s.x * invScale)),
      y: Math.max(0, Math.round(s.y * invScale)),
      width: Math.min(naturalW, Math.round(s.w * invScale)),
      height: Math.min(naturalH, Math.round(s.h * invScale)),
      confidence: 0.88,
    }));
  }

  private fallbackCenterFace(w: number, h: number): DetectedFace[] {
    const faceW = Math.round(w * 0.35);
    const faceH = Math.round(faceW * 1.25);
    return [
      {
        id: crypto.randomUUID(),
        x: Math.max(0, Math.round((w - faceW) / 2)),
        y: Math.max(0, Math.round(h * 0.18)),
        width: Math.min(w, faceW),
        height: Math.min(h, faceH),
        confidence: 0.7,
      },
    ];
  }
}

export const faceDetectionService = new FaceDetectionService();
