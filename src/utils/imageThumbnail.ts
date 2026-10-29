export interface ImageMeta {
  width: number;
  height: number;
  thumbnailBlob: Blob;
}

/**
 * Extracts natural image dimensions and renders a lightweight max 240px thumbnail blob.
 */
export async function generateThumbnail(blob: Blob, maxDim = 240): Promise<ImageMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        // Calculate aspect ratio downscale
        let thumbW = width;
        let thumbH = height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            thumbW = maxDim;
            thumbH = Math.round((height * maxDim) / width);
          } else {
            thumbH = maxDim;
            thumbW = Math.round((width * maxDim) / height);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, thumbW);
        canvas.height = Math.max(1, thumbH);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // High quality thumbnail downscale
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, thumbW, thumbH);

        // Convert to WebP thumbnail (fallback to JPEG/PNG if unsupported)
        canvas.toBlob(
          (thumbBlob) => {
            URL.revokeObjectURL(url);
            if (thumbBlob) {
              resolve({
                width,
                height,
                thumbnailBlob: thumbBlob,
              });
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/webp',
          0.85
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to decode image format'));
    };

    img.src = url;
  });
}