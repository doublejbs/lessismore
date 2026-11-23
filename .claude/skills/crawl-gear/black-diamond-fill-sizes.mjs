// 블랙다이아몬드: 사이즈 select 가 컬러 선택 후에만 채워지는 상품의 사이즈를 다시 읽어 행을 사이즈별로 펼친다(2026-11 리프레시).
// Usage: node bd-fill-sizes.mjs <raw-crawl.json> <out.json>
import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'node:fs';
const [src, dst] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(src, 'utf-8'));
const urls = [...new Set(rows.filter((r) => !r.size).map((r) => r._detailUrl))];
const b = await puppeteer.launch({ headless: 'new' });
const page = await b.newPage();
const sizesBy = {};
let i = 0;
for (const u of urls) {
  i += 1;
  try {
    await page.goto(u, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('select[name="viewOptions[]"]')[0]?.options.length > 1, { timeout: 6000 }).catch(() => {});
    const ok = await page.evaluate(() => {
      const s = document.querySelectorAll('select[name="viewOptions[]"]');
      if (s.length < 2 || s[0].options.length < 2) return false;
      s[0].selectedIndex = 1;
      s[0].dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) window.jQuery(s[0]).trigger('change');
      return true;
    });
    if (ok) {
      await page.waitForFunction(() => document.querySelectorAll('select[name="viewOptions[]"]')[1]?.options.length > 1, { timeout: 8000 }).catch(() => {});
      sizesBy[u] = await page.evaluate(() => {
        const sel = document.querySelectorAll('select[name="viewOptions[]"]')[1];
        return sel ? [...sel.options].slice(1).map((o) => o.textContent.replace(/\s*\(?품절\)?\s*/g, '').trim()).filter((t) => t && t !== 'ONE') : [];
      });
    }
  } catch (e) {
    console.log('ERR', u, e.message);
  }
  if (sizesBy[u]?.length) console.log(`${i}/${urls.length}`, u, sizesBy[u].join(','));
}
await b.close();
const out = rows.flatMap((r) => (!r.size && sizesBy[r._detailUrl]?.length ? sizesBy[r._detailUrl].map((z) => ({ ...r, size: z, sizeKorean: z })) : [r]));
writeFileSync(dst, JSON.stringify(out, null, 2));
console.log(`products ${urls.length}, filled ${Object.values(sizesBy).filter((v) => v.length).length}, rows ${rows.length} → ${out.length}`);
