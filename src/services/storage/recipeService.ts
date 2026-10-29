import { db } from './db';
import { ImageRecipe } from '@/features/recipes/types';

export const STARTER_RECIPES: ImageRecipe[] = [
  {
    id: 'starter-product-image',
    name: 'Website Product Image',
    description: '1200×1200 fit, 16px rounded corners, WebP conversion, and compressed under 150 KB for instant e-commerce store loading.',
    category: 'ecommerce',
    icon: '🛍️',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: 'step-1',
        type: 'resize',
        name: 'Resize to 1200 × 1200',
        enabled: true,
        params: { mode: 'fit', width: 1200, height: 1200 },
      },
      {
        id: 'step-2',
        type: 'corners',
        name: 'Add 16px Rounded Corners',
        enabled: true,
        params: { radius: 16, isCircular: false },
      },
      {
        id: 'step-3',
        type: 'format',
        name: 'Convert to WebP',
        enabled: true,
        params: { format: 'image/webp', quality: 0.85 },
      },
      {
        id: 'step-4',
        type: 'compress',
        name: 'Target Size: 150 KB',
        enabled: true,
        params: { targetKB: 150 },
      },
    ],
  },
  {
    id: 'starter-social-square',
    name: 'Social Media Square Post',
    description: '1080×1080 square format with gentle contrast enhancement and WebP/JPEG encoding for Instagram and LinkedIn.',
    category: 'social',
    icon: '📱',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: 'step-1',
        type: 'resize',
        name: 'Resize to 1080 × 1080 (Square)',
        enabled: true,
        params: { mode: 'fill', width: 1080, height: 1080 },
      },
      {
        id: 'step-2',
        type: 'filter',
        name: 'Vivid Tone Boost',
        enabled: true,
        params: { brightness: 104, contrast: 108, saturation: 108, blur: 0, grayscale: false, sepia: false },
      },
      {
        id: 'step-3',
        type: 'format',
        name: 'Convert to WebP',
        enabled: true,
        params: { format: 'image/webp', quality: 0.9 },
      },
    ],
  },
  {
    id: 'starter-web-optimizer',
    name: 'Web Performance Fast Loader',
    description: 'Scale down huge camera photos to max 1920px width and compress to WebP under 200 KB.',
    category: 'web',
    icon: '⚡',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: 'step-1',
        type: 'resize',
        name: 'Scale Max 1920 × 1080',
        enabled: true,
        params: { mode: 'fit', width: 1920, height: 1080 },
      },
      {
        id: 'step-2',
        type: 'format',
        name: 'Convert to WebP',
        enabled: true,
        params: { format: 'image/webp', quality: 0.8 },
      },
      {
        id: 'step-3',
        type: 'compress',
        name: 'Compress under 200 KB',
        enabled: true,
        params: { targetKB: 200 },
      },
    ],
  },
  {
    id: 'starter-circular-avatar',
    name: 'Circular Profile Avatar',
    description: 'Crop and mask to a 500×500 round circle with transparent background for profile pictures.',
    category: 'social',
    icon: '👤',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: 'step-1',
        type: 'resize',
        name: 'Resize to 500 × 500',
        enabled: true,
        params: { mode: 'fill', width: 500, height: 500 },
      },
      {
        id: 'step-2',
        type: 'corners',
        name: 'Circular Mask',
        enabled: true,
        params: { radius: 250, isCircular: true },
      },
      {
        id: 'step-3',
        type: 'format',
        name: 'Save as PNG (Alpha Transparency)',
        enabled: true,
        params: { format: 'image/png', quality: 1.0 },
      },
    ],
  },
  {
    id: 'starter-watermark-proof',
    name: 'Client Watermarked Proof',
    description: 'Scale down and apply a diagonal/centered "SAMPLE PROOF" watermark to protect client review photos.',
    category: 'branding',
    icon: '🛡️',
    isBuiltIn: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: 'step-1',
        type: 'resize',
        name: 'Scale to 1600 × 1200 Max',
        enabled: true,
        params: { mode: 'fit', width: 1600, height: 1200 },
      },
      {
        id: 'step-2',
        type: 'watermark',
        name: 'Center Proof Watermark',
        enabled: true,
        params: { text: 'SAMPLE PROOF', position: 'center', opacity: 0.35, fontSize: 36, color: '#ffffff' },
      },
      {
        id: 'step-3',
        type: 'format',
        name: 'Export as JPEG (Quality 75%)',
        enabled: true,
        params: { format: 'image/jpeg', quality: 0.75 },
      },
    ],
  },
];

export const recipeService = {
  /**
   * Retrieves all recipes, seeding defaults if empty.
   */
  async getRecipes(): Promise<ImageRecipe[]> {
    try {
      const records = await db.recipes.toArray();
      if (records.length === 0) {
        // Seed starters
        await db.recipes.bulkAdd(STARTER_RECIPES);
        return STARTER_RECIPES;
      }
      return records;
    } catch {
      return STARTER_RECIPES;
    }
  },

  /**
   * Get a recipe by ID.
   */
  async getRecipeById(id: string): Promise<ImageRecipe | null> {
    const r = await db.recipes.get(id);
    return r || null;
  },

  /**
   * Create or update a recipe.
   */
  async saveRecipe(recipe: ImageRecipe): Promise<void> {
    const updated = {
      ...recipe,
      updatedAt: Date.now(),
    };
    await db.recipes.put(updated);
  },

  /**
   * Delete a recipe.
   */
  async deleteRecipe(id: string): Promise<void> {
    await db.recipes.delete(id);
  },

  /**
   * Duplicate a recipe.
   */
  async duplicateRecipe(id: string): Promise<ImageRecipe | null> {
    const orig = await this.getRecipeById(id);
    if (!orig) return null;

    const cloned: ImageRecipe = {
      ...orig,
      id: crypto.randomUUID(),
      name: `${orig.name} (Copy)`,
      isBuiltIn: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.recipes.add(cloned);
    return cloned;
  },
};
