export type CollectionFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_not_null';

export type CollectionFilterField =
  | 'mimeType'
  | 'currentSize'
  | 'originalSize'
  | 'width'
  | 'height'
  | 'variantType'
  | 'originalAssetId'
  | 'isFavorite'
  | 'hasTransparency'
  | 'tags';

export interface SmartCollectionRule {
  id: string;
  field: CollectionFilterField;
  operator: CollectionFilterOperator;
  value: string | number | boolean;
}

export interface SmartCollection {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  isBuiltIn?: boolean;
  matchType: 'all' | 'any';
  rules: SmartCollectionRule[];
  createdAt: number;
  updatedAt: number;
}
