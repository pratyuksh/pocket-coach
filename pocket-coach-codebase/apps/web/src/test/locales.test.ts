import { describe, expect, it } from 'vitest';
import en from '../locales/en/common.json';
import de from '../locales/de/common.json';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});

const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const enFlat = flatten(en);
const deFlat = flatten(de);

describe('locale catalogs', () => {
  it('has the same keys in English and German', () => {
    const missingInDe = Object.keys(enFlat).filter((k) => !(k in deFlat));
    const missingInEn = Object.keys(deFlat).filter((k) => !(k in enFlat));
    expect({ missingInDe, missingInEn }).toEqual({ missingInDe: [], missingInEn: [] });
  });

  it('has no empty translations', () => {
    const empty = [...Object.entries(enFlat), ...Object.entries(deFlat)]
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it('uses the same interpolation placeholders in both languages', () => {
    const mismatched = Object.keys(enFlat)
      .filter((k) => k in deFlat)
      .filter((k) => placeholders(enFlat[k]).join() !== placeholders(deFlat[k]).join());
    expect(mismatched).toEqual([]);
  });
});
