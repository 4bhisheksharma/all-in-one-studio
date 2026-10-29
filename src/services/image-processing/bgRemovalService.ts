import { removeBackground, type Config } from '@imgly/background-removal';

export interface BgRemovalProgress {
  stage: string;
  percent: number;
}

export class BgRemovalService {
  /**
   * High-accuracy client-side AI background removal using @imgly/background-removal
   */
  async removeBackgroundAI(
    imageSource: Blob | string,
    onProgress?: (progress: BgRemovalProgress) => void
  ): Promise<Blob> {
    const config: Config = {
      progress: (key: string, current: number, total: number) => {
        let stage = 'Processing image...';
        if (key.includes('fetch')) {
          stage = 'Loading AI segmentation model...';
        } else if (key.includes('compute')) {
          stage = 'Computing foreground matte...';
        }

        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 50;
        if (onProgress) {
          onProgress({ stage, percent });
        }
      },
      output: {
        format: 'image/png',
        quality: 1,
      },
    };

    return await removeBackground(imageSource, config);
  }

  /**
   * Fast chroma / color-key background removal on canvas
   */
  async removeBackgroundChroma(
    img: HTMLImageElement,
    keyColor: { r: number; g: number; b: number },
    tolerance: number,
    feather: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const tolThreshold = tolerance * 2.5;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const dist = Math.sqrt(
        (r - keyColor.r) ** 2 +
        (g - keyColor.g) ** 2 +
        (b - keyColor.b) ** 2
      );

      if (dist < tolThreshold) {
        if (feather > 0 && dist > tolThreshold - feather * 10) {
          const factor = (dist - (tolThreshold - feather * 10)) / (feather * 10);
          data[i + 3] = Math.round(255 * factor);
        } else {
          data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create transparent PNG blob'));
      }, 'image/png');
    });
  }
}

export const bgRemovalService = new BgRemovalService();
