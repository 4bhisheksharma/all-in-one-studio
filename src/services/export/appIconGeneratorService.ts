import { zipSync, strToU8 } from 'fflate';

export interface AppIconRenderOptions {
  paddingPercent: number; // 0 to 40
  backgroundColor: string; // hex or 'transparent'
  appName: string;
  generateRoundIcons: boolean;
}

export interface GeneratedIconResult {
  path: string;
  blob: Blob;
  width: number;
  height: number;
}

export const IOS_ICON_SPECS = [
  { idiom: 'iphone', size: '20x20', scale: '2x', pixels: 40, filename: 'Icon-App-20x20@2x.png' },
  { idiom: 'iphone', size: '20x20', scale: '3x', pixels: 60, filename: 'Icon-App-20x20@3x.png' },
  { idiom: 'iphone', size: '29x29', scale: '2x', pixels: 58, filename: 'Icon-App-29x29@2x.png' },
  { idiom: 'iphone', size: '29x29', scale: '3x', pixels: 87, filename: 'Icon-App-29x29@3x.png' },
  { idiom: 'iphone', size: '40x40', scale: '2x', pixels: 80, filename: 'Icon-App-40x40@2x.png' },
  { idiom: 'iphone', size: '40x40', scale: '3x', pixels: 120, filename: 'Icon-App-40x40@3x.png' },
  { idiom: 'iphone', size: '60x60', scale: '2x', pixels: 120, filename: 'Icon-App-60x60@2x.png' },
  { idiom: 'iphone', size: '60x60', scale: '3x', pixels: 180, filename: 'Icon-App-60x60@3x.png' },
  { idiom: 'ipad', size: '20x20', scale: '1x', pixels: 20, filename: 'Icon-App-20x20@1x.png' },
  { idiom: 'ipad', size: '20x20', scale: '2x', pixels: 40, filename: 'Icon-App-20x20@2x-ipad.png' },
  { idiom: 'ipad', size: '29x29', scale: '1x', pixels: 29, filename: 'Icon-App-29x29@1x.png' },
  { idiom: 'ipad', size: '29x29', scale: '2x', pixels: 58, filename: 'Icon-App-29x29@2x-ipad.png' },
  { idiom: 'ipad', size: '40x40', scale: '1x', pixels: 40, filename: 'Icon-App-40x40@1x.png' },
  { idiom: 'ipad', size: '40x40', scale: '2x', pixels: 80, filename: 'Icon-App-40x40@2x-ipad.png' },
  { idiom: 'ipad', size: '76x76', scale: '1x', pixels: 76, filename: 'Icon-App-76x76@1x.png' },
  { idiom: 'ipad', size: '76x76', scale: '2x', pixels: 152, filename: 'Icon-App-76x76@2x.png' },
  { idiom: 'ipad', size: '83.5x83.5', scale: '2x', pixels: 167, filename: 'Icon-App-83.5x83.5@2x.png' },
  { idiom: 'ios-marketing', size: '1024x1024', scale: '1x', pixels: 1024, filename: 'ItunesArtwork@2x.png' },
];

export const ANDROID_ICON_SPECS = [
  { folder: 'mipmap-mdpi', pixels: 48 },
  { folder: 'mipmap-hdpi', pixels: 72 },
  { folder: 'mipmap-xhdpi', pixels: 96 },
  { folder: 'mipmap-xxhdpi', pixels: 144 },
  { folder: 'mipmap-xxxhdpi', pixels: 192 },
];

export const WEB_ICON_SPECS = [
  { filename: 'favicon-16x16.png', pixels: 16 },
  { filename: 'favicon-32x32.png', pixels: 32 },
  { filename: 'favicon-48x48.png', pixels: 48 },
  { filename: 'apple-touch-icon.png', pixels: 180 },
  { filename: 'android-chrome-192x192.png', pixels: 192 },
  { filename: 'android-chrome-512x512.png', pixels: 512 },
];

export const appIconGeneratorService = {
  /**
   * Render an image onto a square canvas with padding, background, and optional circle clipping.
   */
  async renderSquareIcon(
    sourceImg: HTMLImageElement,
    size: number,
    options: AppIconRenderOptions,
    isCircle = false
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context failed');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (isCircle) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    }

    // Fill background color if specified
    if (options.backgroundColor && options.backgroundColor !== 'transparent') {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, size, size);
    }

    const pad = (options.paddingPercent / 100) * size;
    const targetDim = size - pad * 2;

    // Draw source image centered maintaining aspect ratio
    const srcW = sourceImg.naturalWidth;
    const srcH = sourceImg.naturalHeight;
    const scale = Math.min(targetDim / srcW, targetDim / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const dx = (size - drawW) / 2;
    const dy = (size - drawH) / 2;

    ctx.drawImage(sourceImg, dx, dy, drawW, drawH);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas blob generation failed'));
      }, 'image/png');
    });
  },

  /**
   * Generates the entire bundle of Android, iOS, and Web assets as a structured ZIP file.
   */
  async generateAssetBundleZip(
    sourceBlob: Blob,
    options: AppIconRenderOptions,
    onProgress?: (percent: number, currentItem: string) => void
  ): Promise<Blob> {
    const img = new Image();
    const url = URL.createObjectURL(sourceBlob);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to parse input image'));
      img.src = url;
    });

    const zipData: Record<string, Uint8Array> = {};
    let step = 0;
    const totalSteps =
      IOS_ICON_SPECS.length +
      ANDROID_ICON_SPECS.length * (options.generateRoundIcons ? 2 : 1) +
      1 + // play store
      WEB_ICON_SPECS.length;

    const notify = (name: string) => {
      step++;
      if (onProgress) {
        onProgress(Math.round((step / totalSteps) * 100), name);
      }
    };

    // 1. iOS AppIcon.appiconset
    for (const spec of IOS_ICON_SPECS) {
      notify(`iOS ${spec.filename}`);
      const blob = await this.renderSquareIcon(img, spec.pixels, options, false);
      const buffer = await blob.arrayBuffer();
      zipData[`ios/AppIcon.appiconset/${spec.filename}`] = new Uint8Array(buffer);
    }

    // Xcode Contents.json
    const contentsJson = {
      images: IOS_ICON_SPECS.map((spec) => ({
        size: spec.size,
        idiom: spec.idiom,
        filename: spec.filename,
        scale: spec.scale,
      })),
      info: {
        version: 1,
        author: 'xcode',
      },
    };
    zipData['ios/AppIcon.appiconset/Contents.json'] = strToU8(
      JSON.stringify(contentsJson, null, 2)
    );

    // 2. Android Launcher Icons
    for (const spec of ANDROID_ICON_SPECS) {
      notify(`Android ${spec.folder}/ic_launcher.png`);
      const squareBlob = await this.renderSquareIcon(img, spec.pixels, options, false);
      zipData[`android/res/${spec.folder}/ic_launcher.png`] = new Uint8Array(
        await squareBlob.arrayBuffer()
      );

      if (options.generateRoundIcons) {
        notify(`Android ${spec.folder}/ic_launcher_round.png`);
        const roundBlob = await this.renderSquareIcon(img, spec.pixels, options, true);
        zipData[`android/res/${spec.folder}/ic_launcher_round.png`] = new Uint8Array(
          await roundBlob.arrayBuffer()
        );
      }
    }

    // Android Google Play Store icon (512x512)
    notify('Android playstore-icon.png');
    const playStoreBlob = await this.renderSquareIcon(img, 512, options, false);
    zipData['android/playstore-icon.png'] = new Uint8Array(
      await playStoreBlob.arrayBuffer()
    );

    // 3. Web & PWA
    for (const spec of WEB_ICON_SPECS) {
      notify(`Web ${spec.filename}`);
      const webBlob = await this.renderSquareIcon(img, spec.pixels, options, false);
      zipData[`web/${spec.filename}`] = new Uint8Array(await webBlob.arrayBuffer());
    }

    // Web manifest (site.webmanifest)
    const manifest = {
      name: options.appName || 'My Application',
      short_name: options.appName || 'App',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
      theme_color: options.backgroundColor || '#000000',
      background_color: options.backgroundColor || '#000000',
      display: 'standalone',
    };
    zipData['web/site.webmanifest'] = strToU8(JSON.stringify(manifest, null, 2));

    // HTML head tags snippet
    const htmlSnippet = `<!-- Favicons & App Icons generated by Imago Studio -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="${options.backgroundColor || '#000000'}">
`;
    zipData['web/html_head_tags.html'] = strToU8(htmlSnippet);

    URL.revokeObjectURL(url);

    // Generate ZIP
    const zipped = zipSync(zipData, { level: 6 });
    return new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
  },
};
