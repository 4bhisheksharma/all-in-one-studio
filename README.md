# Imago Studio

Imago Studio is a high-performance, local-first image processing workspace built for web browsers. It replaces fragmented single-purpose utilities with a unified desktop-grade suite that runs entirely on-device using WebAssembly, Web Workers, and the HTML5 Canvas API.

---

## Architectural Philosophy

> **Upload once. Organize once. Process anywhere. Reuse everywhere.**

Traditional web-based image tools require re-uploading files to remote servers for each separate operation (compressing, cropping, background segmentation, resizing). Imago runs entirely inside your client browser session:
- **Zero Cloud Latency:** Operations execute directly on your hardware via client-side workers.
- **Strict Privacy:** Zero telemetry, zero server uploads. Images never leave your local machine.
- **IndexedDB Persistence:** Asset binaries, thumbnail caches, draft states, and project hierarchies persist locally in browser storage.

---

## Core Capabilities

### 1. Smart Image Recipes
Define and execute deterministic image transformation pipelines across individual assets or bulk batches:
- Chain operations in sequence (e.g., Resize to 1200x1200 -> Add 16px rounded corners -> Convert to WebP -> Target size under 150 KB).
- Save custom recipe configurations or select from built-in presets (E-Commerce, Social Media, Web Performance, Watermark Proofing).
- Reusable across single files or collections with one action.

### 2. Batch Processing Queue
Automate bulk transformations across selected library assets:
- Non-destructive execution with per-item progress monitoring and error recovery.
- Configurable skip conditions (e.g., skip assets already within dimension limits or target file sizes).
- Route transformed outputs directly into targeted project directories.

### 3. Image Version History & Comparison
Maintain comprehensive audit trails of asset revisions:
- Linear transformation tracking (Original -> Resized -> Compressed -> Filtered).
- Interactive before/after split-slider for pixel-level visual comparison.
- Full revision restoration and branch creation.

### 4. Smart Asset Collections
Dynamic, rule-based views that automatically categorize workspace assets:
- **High Resolution:** Filters assets with dimensions >= 3840x2160 pixels.
- **Heavy Assets:** Automatically flags files exceeding 2 MB.
- **Format Profiles:** Dedicated filters for Transparent PNGs, WebP files, and aspect ratios (Portrait, Landscape, Square).
- Create custom dynamic filters based on tags, file size, or dimension thresholds.

### 5. Multi-Layer Studio Canvas
Freeform desktop composition workspace:
- Multi-layer management with reordering, visibility toggles, and opacity adjustments.
- Interactive bounding box transformations (freeform drag, corner resize, and rotation).
- Layer-specific filters, hue adjustments, and export to unified PNG/JPEG/WebP compositions.

### 6. App Asset & Icon Generator
Production-ready application icon generator supporting mobile and web standards:
- **Android:** Generates complete `mipmap-mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi` icon sets with optional adaptive icon foreground/background configurations.
- **iOS / Xcode:** Builds valid `AppIcon.appiconset` packages complete with compliant `Contents.json` manifests for modern iOS devices.
- **Web Favicons:** 16x16, 32x32, 48x48, 180x180 Apple Touch Icons, and 192x192 / 512x512 PWA manifests.
- Export all assets formatted in a single organized ZIP package.

### 7. Neural AI Background Remover
Client-side foreground segmentation:
- Neural network inference executed entirely on-device.
- Export with clean alpha transparency or substitute with solid colors and backdrop images.

### 8. Face & Sensitive Region Blur
Privacy protection with automatic and manual controls:
- Universal client-side face detection using skin-luminance morphology algorithms.
- Custom bounding box creation for license plates, identification numbers, and confidential documents.
- Variable gaussian blur and pixelation filters.

### 9. Precision Optimization Suite
- **Image Quality Inspector:** Side-by-side artifact inspection, structural similarity comparison, and real-time filesize benchmarking.
- **Compressor:** Target specific compression ratios or strict target byte sizes.
- **Resizer:** Aspect-locked scaling and standardized social dimensions.
- **Cropper:** Freeform cropping, rotation, flip, and aspect presets (1:1, 16:9, 4:3, 9:16).
- **Collage Maker:** Multi-slot responsive grid layouts with custom gap, padding, and corner radius settings.
- **Converter:** Fast batch conversions between WebP, PNG, and JPEG.
- **Utilities Suite:** EXIF metadata stripping, eyedropper color sampling, and automated palette extraction.

---

## User Interface & Design System

Imago features a clean, professional, non-distracting design system inspired by modern developer tooling:
- **Dual Theme Support:** Fully supports dark mode and white theme with automatic system preference detection.
- **Minimalist Aesthetic:** Subdued monochrome palettes, clean typography (`Plus Jakarta Sans`), and restrained borders.
- **Iconography:** Consistent SVG vector icons via Lucide Icons (zero emojis across the interface).
- **Responsive Layout:** Adaptive desktop sidebar, persistent mobile navigation bar, and gesture-friendly modal drawers.

---

## Technology Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4 (vanilla CSS variables for dynamic theme adaptation)
- **State Management:** Zustand
- **Local Database:** Dexie.js (IndexedDB wrapper)
- **Image Processing:** HTML5 Canvas API, OffscreenCanvas, Web Workers, `@imgly/background-removal`
- **Archive & Compression:** `fflate`
- **Icons:** `lucide-react`

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/4bhisheksharma/all-in-one-studio.git

# Navigate to workspace directory
cd all-in-one-studio

# Install dependencies
npm install
```

### Development Server

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
# Type check and build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## License

MIT License. Free for personal and commercial use.
