import { ImageAsset } from '@/types';
import { SmartCollection, SmartCollectionRule } from '@/types/smartCollection';
import { db } from './db';

export const BUILT_IN_COLLECTIONS: SmartCollection[] = [
  {
    id: 'built-in-png-over-2mb',
    name: 'All PNGs over 2 MB',
    description: 'Large lossless PNG assets exceeding 2 MB in storage size',
    color: 'emerald',
    icon: 'FileImage',
    isBuiltIn: true,
    matchType: 'all',
    rules: [
      {
        id: 'r1',
        field: 'mimeType',
        operator: 'equals',
        value: 'image/png',
      },
      {
        id: 'r2',
        field: 'currentSize',
        operator: 'greater_than',
        value: 2097152, // 2 MB
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'built-in-uncompressed-originals',
    name: 'Uncompressed Originals',
    description: 'Master root assets that have not undergone variant processing',
    color: 'lime',
    icon: 'Sparkles',
    isBuiltIn: true,
    matchType: 'all',
    rules: [
      {
        id: 'r1',
        field: 'variantType',
        operator: 'is_null',
        value: '',
      },
      {
        id: 'r2',
        field: 'originalAssetId',
        operator: 'is_null',
        value: '',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'built-in-no-transparency',
    name: 'Images without Transparency',
    description: 'Opaque image assets (standard JPEG formats)',
    color: 'amber',
    icon: 'Layers',
    isBuiltIn: true,
    matchType: 'all',
    rules: [
      {
        id: 'r1',
        field: 'mimeType',
        operator: 'equals',
        value: 'image/jpeg',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'built-in-high-res-4k',
    name: 'High-Res 4K+ Masters',
    description: 'Ultra-high resolution assets at or above 3840×2160 pixels',
    color: 'cyan',
    icon: 'Maximize2',
    isBuiltIn: true,
    matchType: 'any',
    rules: [
      {
        id: 'r1',
        field: 'width',
        operator: 'greater_than',
        value: 3839,
      },
      {
        id: 'r2',
        field: 'height',
        operator: 'greater_than',
        value: 2159,
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'built-in-web-optimized',
    name: 'Web Optimized Formats',
    description: 'Modern WebP and AVIF assets ready for distribution',
    color: 'purple',
    icon: 'Globe',
    isBuiltIn: true,
    matchType: 'any',
    rules: [
      {
        id: 'r1',
        field: 'mimeType',
        operator: 'equals',
        value: 'image/webp',
      },
      {
        id: 'r2',
        field: 'mimeType',
        operator: 'equals',
        value: 'image/avif',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
];

export const smartCollectionService = {
  /**
   * Evaluate whether an asset satisfies an individual rule.
   */
  evaluateRule(asset: ImageAsset, rule: SmartCollectionRule): boolean {
    const { field, operator, value } = rule;

    let assetVal: any = (asset as any)[field];

    switch (operator) {
      case 'is_null':
        return assetVal === null || assetVal === undefined || assetVal === '';
      case 'is_not_null':
        return assetVal !== null && assetVal !== undefined && assetVal !== '';
      case 'equals':
        return String(assetVal).toLowerCase() === String(value).toLowerCase();
      case 'not_equals':
        return String(assetVal).toLowerCase() !== String(value).toLowerCase();
      case 'greater_than':
        return Number(assetVal) > Number(value);
      case 'less_than':
        return Number(assetVal) < Number(value);
      case 'contains':
        if (Array.isArray(assetVal)) {
          return assetVal.some((v) => String(v).toLowerCase().includes(String(value).toLowerCase()));
        }
        return String(assetVal).toLowerCase().includes(String(value).toLowerCase());
      case 'is_true':
        return Boolean(assetVal) === true;
      case 'is_false':
        return Boolean(assetVal) === false;
      default:
        return true;
    }
  },

  /**
   * Evaluate whether an asset matches an entire smart collection.
   */
  evaluateAsset(asset: ImageAsset, collection: SmartCollection): boolean {
    if (!collection.rules || collection.rules.length === 0) return true;

    if (collection.matchType === 'any') {
      return collection.rules.some((rule) => this.evaluateRule(asset, rule));
    }
    return collection.rules.every((rule) => this.evaluateRule(asset, rule));
  },

  /**
   * Dynamically filters a list of assets against a smart collection.
   */
  filterAssets(assets: ImageAsset[], collection: SmartCollection): ImageAsset[] {
    return assets.filter((asset) => !asset.isTrash && this.evaluateAsset(asset, collection));
  },

  /**
   * Fetch all collections (Built-in + Custom created in IndexedDB).
   */
  async getAllCollections(): Promise<SmartCollection[]> {
    try {
      const custom = await db.smartCollections.toArray();
      return [...BUILT_IN_COLLECTIONS, ...custom];
    } catch {
      return BUILT_IN_COLLECTIONS;
    }
  },

  /**
   * Create or update a custom smart collection.
   */
  async saveCollection(collection: SmartCollection): Promise<void> {
    await db.smartCollections.put(collection);
  },

  /**
   * Remove a custom smart collection.
   */
  async deleteCollection(id: string): Promise<void> {
    await db.smartCollections.delete(id);
  },
};
