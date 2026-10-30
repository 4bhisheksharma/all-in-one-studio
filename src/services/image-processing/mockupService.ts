/**
 * Device Frame & Browser Mockup Engine
 * Pure client-side HTML5 canvas renderer that wraps screenshots and graphics in
 * sleek browser chrome, mobile frames, and realistic device bezels with mesh gradient backdrops.
 */

export type MockupFrameStyle =
  | 'browser-dark'
  | 'browser-light'
  | 'browser-minimal'
  | 'phone-modern'
  | 'phone-frame'
  | 'laptop-modern'
  | 'glass-card';

export type MockupAspectRatio =
  | 'auto'
  | '16:9'
  | '1:1'
  | '4:3'
  | 'twitter' // 1200x675
  | 'product-hunt'; // 1270x760

export type MockupBackground =
  | 'gradient-sunset'
  | 'gradient-indigo'
  | 'gradient-cyber'
  | 'gradient-emerald'
  | 'gradient-slate'
  | 'mesh-purple'
  | 'solid-dark'
  | 'solid-light'
  | 'transparent';

export type MockupShadow = 'none' | 'subtle' | 'elevated' | 'dramatic';

export interface MockupOptions {
  frameStyle: MockupFrameStyle;
  aspectRatio: MockupAspectRatio;
  background: MockupBackground;
  customBackgroundColor?: string;
  padding: number; // 0, 32, 64, 96
  shadow: MockupShadow;
  cornerRadius: number; // 0, 8, 16, 24
  browserUrl: string;
  scale: number; // 1 or 2 for retina
}

export const MOCKUP_PRESETS = [
  {
    id: 'product-launch',
    name: 'Product Hunt Launch',
    options: {
      frameStyle: 'browser-dark' as MockupFrameStyle,
      aspectRatio: 'product-hunt' as MockupAspectRatio,
      background: 'gradient-indigo' as MockupBackground,
      padding: 64,
      shadow: 'dramatic' as MockupShadow,
      cornerRadius: 16,
      browserUrl: 'app.myproduct.com',
      scale: 1,
    },
  },
  {
    id: 'twitter-card',
    name: 'Social Showcase',
    options: {
      frameStyle: 'browser-light' as MockupFrameStyle,
      aspectRatio: 'twitter' as MockupAspectRatio,
      background: 'gradient-sunset' as MockupBackground,
      padding: 56,
      shadow: 'elevated' as MockupShadow,
      cornerRadius: 14,
      browserUrl: 'studio.allinone.app',
      scale: 1,
    },
  },
  {
    id: 'minimal-slate',
    name: 'Clean Minimalist',
    options: {
      frameStyle: 'browser-minimal' as MockupFrameStyle,
      aspectRatio: '16:9' as MockupAspectRatio,
      background: 'gradient-slate' as MockupBackground,
      padding: 48,
      shadow: 'subtle' as MockupShadow,
      cornerRadius: 12,
      browserUrl: 'localhost:5173',
      scale: 1,
    },
  },
  {
    id: 'mobile-app',
    name: 'Mobile App Showcase',
    options: {
      frameStyle: 'phone-modern' as MockupFrameStyle,
      aspectRatio: '1:1' as MockupAspectRatio,
      background: 'gradient-cyber' as MockupBackground,
      padding: 64,
      shadow: 'dramatic' as MockupShadow,
      cornerRadius: 36,
      browserUrl: '',
      scale: 1,
    },
  },
];

export const mockupService = {
  /**
   * Render mockup composite to canvas.
   */
  async renderMockup(
    imageSource: HTMLImageElement | ImageBitmap | HTMLCanvasElement,
    options: MockupOptions
  ): Promise<HTMLCanvasElement> {
    const scale = options.scale || 1;
    const padding = options.padding * scale;
    const cornerRadius = options.cornerRadius * scale;

    const imgWidth = imageSource.width;
    const imgHeight = imageSource.height;

    // Header dimensions based on frame style
    let headerHeight = 0;
    let frameTopBezel = 0;
    let frameBottomBezel = 0;
    let frameSideBezel = 0;

    if (options.frameStyle === 'browser-dark' || options.frameStyle === 'browser-light') {
      headerHeight = 44 * scale;
    } else if (options.frameStyle === 'browser-minimal') {
      headerHeight = 32 * scale;
    } else if (options.frameStyle === 'phone-modern') {
      headerHeight = 36 * scale; // Dynamic island area
      frameTopBezel = 14 * scale;
      frameBottomBezel = 18 * scale;
      frameSideBezel = 14 * scale;
    } else if (options.frameStyle === 'laptop-modern') {
      headerHeight = 32 * scale;
      frameTopBezel = 16 * scale;
      frameBottomBezel = 22 * scale;
      frameSideBezel = 16 * scale;
    }

    // Inside frame dimensions
    const innerContentWidth = imgWidth;
    const innerContentHeight = imgHeight;

    const frameWidth = innerContentWidth + frameSideBezel * 2;
    const frameHeight = innerContentHeight + headerHeight + frameTopBezel + frameBottomBezel;

    // Calculate canvas size based on aspect ratio
    let targetCanvasWidth = frameWidth + padding * 2;
    let targetCanvasHeight = frameHeight + padding * 2;

    if (options.aspectRatio === '16:9') {
      const ratio = 16 / 9;
      if (targetCanvasWidth / targetCanvasHeight < ratio) {
        targetCanvasWidth = targetCanvasHeight * ratio;
      } else {
        targetCanvasHeight = targetCanvasWidth / ratio;
      }
    } else if (options.aspectRatio === '1:1') {
      const side = Math.max(targetCanvasWidth, targetCanvasHeight);
      targetCanvasWidth = side;
      targetCanvasHeight = side;
    } else if (options.aspectRatio === '4:3') {
      const ratio = 4 / 3;
      if (targetCanvasWidth / targetCanvasHeight < ratio) {
        targetCanvasWidth = targetCanvasHeight * ratio;
      } else {
        targetCanvasHeight = targetCanvasWidth / ratio;
      }
    } else if (options.aspectRatio === 'twitter') {
      // 1200 x 675
      const baseW = 1200 * scale;
      const baseH = 675 * scale;
      targetCanvasWidth = baseW;
      targetCanvasHeight = baseH;
      // We will adjust device render scale later if needed
    } else if (options.aspectRatio === 'product-hunt') {
      // 1270 x 760
      targetCanvasWidth = 1270 * scale;
      targetCanvasHeight = 760 * scale;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(targetCanvasWidth);
    canvas.height = Math.round(targetCanvasHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Backdrop Background
    this.drawBackground(ctx, canvas.width, canvas.height, options);

    // Calculate device placement (centered in canvas)
    let renderFrameW = frameWidth;
    let renderFrameH = frameHeight;

    // Auto-fit if device exceeds canvas boundaries
    const maxAvailableW = canvas.width - padding * 2;
    const maxAvailableH = canvas.height - padding * 2;

    const fitScale = Math.min(1, maxAvailableW / renderFrameW, maxAvailableH / renderFrameH);
    renderFrameW *= fitScale;
    renderFrameH *= fitScale;

    const frameX = (canvas.width - renderFrameW) / 2;
    const frameY = (canvas.height - renderFrameH) / 2;

    // 2. Draw Drop Shadow
    if (options.shadow !== 'none') {
      this.drawShadow(ctx, frameX, frameY, renderFrameW, renderFrameH, cornerRadius * fitScale, options.shadow);
    }

    // 3. Draw Device Frame Chrome & Image Content
    ctx.save();
    this.drawRoundedRect(ctx, frameX, frameY, renderFrameW, renderFrameH, cornerRadius * fitScale);
    ctx.clip();

    const isDarkBrowser = options.frameStyle === 'browser-dark';
    const isLightBrowser = options.frameStyle === 'browser-light';
    const isMinimalBrowser = options.frameStyle === 'browser-minimal';

    // Frame background fill
    if (isDarkBrowser) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(frameX, frameY, renderFrameW, renderFrameH);
    } else if (isLightBrowser || isMinimalBrowser) {
      ctx.fillStyle = '#f4f4f5';
      ctx.fillRect(frameX, frameY, renderFrameW, renderFrameH);
    } else if (options.frameStyle === 'phone-modern') {
      ctx.fillStyle = '#09090b';
      ctx.fillRect(frameX, frameY, renderFrameW, renderFrameH);
    } else if (options.frameStyle === 'laptop-modern') {
      ctx.fillStyle = '#1c1c1f';
      ctx.fillRect(frameX, frameY, renderFrameW, renderFrameH);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(frameX, frameY, renderFrameW, renderFrameH);
    }

    // Header / Window bar rendering
    const actualHeaderH = headerHeight * fitScale;
    const actualSideBezel = frameSideBezel * fitScale;
    const actualTopBezel = frameTopBezel * fitScale;
    const actualBottomBezel = frameBottomBezel * fitScale;

    if (isDarkBrowser || isLightBrowser || isMinimalBrowser) {
      this.drawBrowserHeader(
        ctx,
        frameX,
        frameY,
        renderFrameW,
        actualHeaderH,
        isDarkBrowser,
        isMinimalBrowser,
        options.browserUrl,
        scale * fitScale
      );
    } else if (options.frameStyle === 'phone-modern') {
      this.drawPhoneDynamicIsland(ctx, frameX, frameY, renderFrameW, actualHeaderH, scale * fitScale);
    }

    // Draw the main image inside the frame body
    const contentX = frameX + actualSideBezel;
    const contentY = frameY + actualHeaderH + actualTopBezel;
    const contentW = renderFrameW - actualSideBezel * 2;
    const contentH = renderFrameH - actualHeaderH - actualTopBezel - actualBottomBezel;

    ctx.drawImage(imageSource, contentX, contentY, contentW, contentH);

    ctx.restore();

    // 4. Subtle Outer Border / Stroke for crisp edge
    ctx.save();
    this.drawRoundedRect(ctx, frameX, frameY, renderFrameW, renderFrameH, cornerRadius * fitScale);
    ctx.lineWidth = Math.max(1, 1 * scale);
    if (isDarkBrowser || options.frameStyle === 'phone-modern' || options.frameStyle === 'laptop-modern') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    } else {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    }
    ctx.stroke();
    ctx.restore();

    return canvas;
  },

  /**
   * Draw browser top header with traffic light buttons and address bar.
   */
  drawBrowserHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isDark: boolean,
    isMinimal: boolean,
    url: string,
    scale: number
  ) {
    ctx.save();
    ctx.fillStyle = isDark ? '#27272a' : '#e4e4e7';
    ctx.fillRect(x, y, w, h);

    // Bottom hairline separator
    ctx.fillStyle = isDark ? '#3f3f46' : '#d4d4d8';
    ctx.fillRect(x, y + h - 1, w, 1);

    // Traffic light dots
    const dotRadius = Math.max(3, 5 * scale);
    const startX = x + 14 * scale;
    const dotY = y + h / 2;
    const dotSpacing = 14 * scale;

    const colors = ['#ef4444', '#eab308', '#22c55e']; // red, yellow, green
    colors.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Address Bar (if not minimal and url provided or default)
    if (!isMinimal && w > 240 * scale) {
      const urlBarW = Math.min(w * 0.5, 360 * scale);
      const urlBarH = h * 0.62;
      const urlBarX = x + (w - urlBarW) / 2;
      const urlBarY = y + (h - urlBarH) / 2;

      this.drawRoundedRect(ctx, urlBarX, urlBarY, urlBarW, urlBarH, 6 * scale);
      ctx.fillStyle = isDark ? '#18181b' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = isDark ? '#3f3f46' : '#d4d4d8';
      ctx.stroke();

      // Lock icon & URL text
      const fontSize = Math.max(9, Math.round(11 * scale));
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';

      const displayUrl = url.trim() || 'all-in-one-studio.app';
      ctx.fillText(displayUrl, urlBarX + urlBarW / 2, urlBarY + urlBarH / 2 + 0.5);
    }

    ctx.restore();
  },

  /**
   * Draw Dynamic Island pill for modern mobile frames.
   */
  drawPhoneDynamicIsland(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number
  ) {
    ctx.save();
    const pillW = Math.min(w * 0.35, 110 * scale);
    const pillH = Math.min(h * 0.65, 24 * scale);
    const pillX = x + (w - pillW) / 2;
    const pillY = y + 8 * scale;

    this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Subtle camera lens dot
    ctx.beginPath();
    ctx.arc(pillX + pillW - 14 * scale, pillY + pillH / 2, 3.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#1c1c1e';
    ctx.fill();
    ctx.restore();
  },

  /**
   * Draw canvas background gradient or solid color.
   */
  drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    options: MockupOptions
  ) {
    if (options.background === 'transparent') {
      ctx.clearRect(0, 0, w, h);
      return;
    }

    if (options.background === 'solid-dark') {
      ctx.fillStyle = options.customBackgroundColor || '#09090b';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (options.background === 'solid-light') {
      ctx.fillStyle = options.customBackgroundColor || '#f4f4f5';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, w, h);

    switch (options.background) {
      case 'gradient-sunset':
        grad.addColorStop(0, '#ff7e5f');
        grad.addColorStop(0.5, '#feb47b');
        grad.addColorStop(1, '#ff6a88');
        break;
      case 'gradient-indigo':
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(0.5, '#312e81');
        grad.addColorStop(1, '#0f172a');
        break;
      case 'gradient-cyber':
        grad.addColorStop(0, '#090a0f');
        grad.addColorStop(0.5, '#1a103c');
        grad.addColorStop(1, '#061727');
        break;
      case 'gradient-emerald':
        grad.addColorStop(0, '#064e3b');
        grad.addColorStop(0.5, '#047857');
        grad.addColorStop(1, '#0f172a');
        break;
      case 'gradient-slate':
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        break;
      case 'mesh-purple':
      default:
        grad.addColorStop(0, '#2e0854');
        grad.addColorStop(0.4, '#180b2b');
        grad.addColorStop(1, '#0b0c10');
        break;
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  },

  /**
   * Draw smooth multi-layered drop shadow.
   */
  drawShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
    shadowType: MockupShadow
  ) {
    ctx.save();
    let blur = 24;
    let offsetY = 12;
    let alpha = 0.25;

    if (shadowType === 'subtle') {
      blur = 16;
      offsetY = 6;
      alpha = 0.15;
    } else if (shadowType === 'elevated') {
      blur = 36;
      offsetY = 18;
      alpha = 0.35;
    } else if (shadowType === 'dramatic') {
      blur = 60;
      offsetY = 30;
      alpha = 0.45;
    }

    ctx.shadowColor = `rgba(0, 0, 0, ${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    ctx.shadowOffsetX = 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();
  },

  /**
   * Helper to draw rounded rectangle path.
   */
  drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },
};
