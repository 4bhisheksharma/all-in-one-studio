/**
 * Bulk Renamer Service
 * Pattern evaluation, case transformation, token substitution, and collision detection.
 */

export interface RenameRule {
  pattern: string; // e.g. "{name}_{index}"
  startIndex: number;
  padding: number; // e.g. 2 -> "01", 3 -> "001"
  search: string;
  replace: string;
  useRegex: boolean;
  prefix: string;
  suffix: string;
  spaceHandling: 'keep' | 'hyphen' | 'underscore' | 'remove';
  caseTransform: 'none' | 'lowercase' | 'uppercase' | 'title' | 'kebab' | 'snake' | 'camel';
}

export interface RenamePreviewItem {
  id: string;
  originalName: string;
  newName: string;
  extension: string;
  width: number;
  height: number;
  isDuplicate: boolean;
  changed: boolean;
}

export function toCase(str: string, transform: RenameRule['caseTransform']): string {
  if (transform === 'none') return str;

  // Split into words by spaces, hyphens, underscores, or camelCase boundaries
  const words = str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  switch (transform) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'title':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'kebab':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'snake':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'camel':
      return words
        .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
    default:
      return str;
  }
}

export const renamerService = {
  /**
   * Generates new filenames for a list of items according to specified rename rules.
   */
  generateNewNames(
    items: { id: string; filename: string; width: number; height: number; createdAt?: number }[],
    rules: RenameRule
  ): RenamePreviewItem[] {
    const previews: RenamePreviewItem[] = [];
    const usedNames = new Set<string>();

    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const extIdx = item.filename.lastIndexOf('.');
      const rawBase = extIdx > -1 ? item.filename.slice(0, extIdx) : item.filename;
      const rawExt = extIdx > -1 ? item.filename.slice(extIdx) : '';

      const currentNumber = rules.startIndex + i;
      const paddedIndex = String(currentNumber).padStart(rules.padding, '0');
      const itemDateStr = item.createdAt
        ? new Date(item.createdAt).toISOString().slice(0, 10)
        : todayStr;

      // 1. Token Substitution in Pattern
      let computed = rules.pattern || '{name}';
      computed = computed.replace(/{name}/g, rawBase);
      computed = computed.replace(/{index}/g, paddedIndex);
      computed = computed.replace(/{date}/g, itemDateStr);
      computed = computed.replace(/{w}/g, String(item.width || 0));
      computed = computed.replace(/{h}/g, String(item.height || 0));
      computed = computed.replace(/{ext}/g, rawExt.replace('.', ''));

      // 2. Search & Replace
      if (rules.search) {
        try {
          if (rules.useRegex) {
            const re = new RegExp(rules.search, 'g');
            computed = computed.replace(re, rules.replace);
          } else {
            computed = computed.split(rules.search).join(rules.replace);
          }
        } catch {
          // If invalid regex, fallback to literal
          computed = computed.split(rules.search).join(rules.replace);
        }
      }

      // 3. Prefix & Suffix
      if (rules.prefix) computed = `${rules.prefix}${computed}`;
      if (rules.suffix) computed = `${computed}${rules.suffix}`;

      // 4. Space Handling
      if (rules.spaceHandling === 'hyphen') {
        computed = computed.replace(/\s+/g, '-');
      } else if (rules.spaceHandling === 'underscore') {
        computed = computed.replace(/\s+/g, '_');
      } else if (rules.spaceHandling === 'remove') {
        computed = computed.replace(/\s+/g, '');
      }

      // 5. Case Transformation
      computed = toCase(computed, rules.caseTransform);

      const finalName = `${computed}${rawExt}`;
      const isDuplicate = usedNames.has(finalName.toLowerCase());
      usedNames.add(finalName.toLowerCase());

      previews.push({
        id: item.id,
        originalName: item.filename,
        newName: finalName,
        extension: rawExt,
        width: item.width,
        height: item.height,
        isDuplicate,
        changed: finalName !== item.filename,
      });
    }

    return previews;
  },
};
