// 블랙다이아몬드 colorKorean 을 어댑터의 roughColorKorean 으로 재계산(사이즈 재수집 후)
import { readFileSync, writeFileSync } from 'node:fs';
import { roughColorKorean } from './sites/black-diamond.js';
const [src, dst] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(src, 'utf-8'));
const a = Array.isArray(rows) ? rows : rows.items;
for (const r of a) if (r.color) r.colorKorean = roughColorKorean(r.color);
writeFileSync(dst, JSON.stringify(rows, null, 2));
console.log('recolor', a.length);
