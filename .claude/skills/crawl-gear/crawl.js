import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { SPECS_SCHEMA, CATEGORY_LABELS, formatSpecValue } from './specs-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const siteKey = args[0];
const flags = Object.fromEntries(
  args
    .slice(1)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
);

if (!siteKey) {
  console.error('Usage: node crawl.js <site-key> [--categories=url1,url2] [--no-weight] [--no-open]');
  console.error('Available sites: rab');
  process.exit(1);
}

const adapter = (await import(`./sites/${siteKey}.js`)).default;
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--ignore-certificate-errors', '--no-sandbox'],
});
console.log(`Crawling "${adapter.name}"...`);

const categoryUrls = flags.categories ? String(flags.categories).split(',') : adapter.defaultCategories;
const withWeight = !flags['no-weight'];

const gears = await adapter.crawl(browser, { categoryUrls, withWeight });
await browser.close();
console.log(`\nCrawled ${gears.length} items.\n`);

if (gears.length === 0) {
  console.log('Nothing crawled. Exiting.');
  process.exit(0);
}

const outDir = join(__dirname, 'out');
mkdirSync(outDir, { recursive: true });
const stamp = Date.now();
const jsonPath = join(outDir, `${siteKey}-${stamp}.json`);
const htmlPath = join(outDir, `${siteKey}-${stamp}.html`);

writeFileSync(jsonPath, JSON.stringify(gears, null, 2));

const escape = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const cards = gears
  .map((g, i) => {
    const warns = [];
    if (!g.imageUrl) warns.push('NO IMAGE');
    if (!g.weight) warns.push('NO WEIGHT');
    if (!g.name) warns.push('NO NAME');

    const schema = SPECS_SCHEMA[g.category] ?? {};
    const specEntries = Object.entries(schema);
    const specRows = specEntries.length
      ? specEntries
          .map(([key, def]) => {
            const v = g.specs?.[key];
            const has = v != null && v !== '';
            return `<div class="spec ${has ? '' : 'spec-missing'}"><span>${escape(def.label)}</span><b>${has ? escape(formatSpecValue(key, v, schema)) : '<i>—</i>'}</b></div>`;
          })
          .join('')
      : '';
    const missingCount = specEntries.filter(([k]) => g.specs?.[k] == null || g.specs?.[k] === '').length;
    if (specEntries.length > 0 && missingCount === specEntries.length) warns.push('NO SPECS');

    const catLabel = CATEGORY_LABELS[g.category] ?? g.category ?? '-';
    const colorLine = [g.colorKorean, g.color].filter(Boolean).join(' / ') || '-';
    const sizeLine = [g.sizeKorean, g.size].filter(Boolean).join(' / ') || '-';
    return `
    <div class="card">
      <div class="thumb">${
        g.imageUrl
          ? `<img src="${escape(g.imageUrl)}" loading="lazy" />`
          : `<div class="empty">?</div>`
      }</div>
      <div class="meta">
        <div class="row"><span class="idx">#${i + 1}</span>${
          warns.length ? warns.map((w) => `<span class="warn">${w}</span>`).join('') : ''
        }</div>
        <div class="name">${escape(g.nameKorean) || '<i>(no name)</i>'}</div>
        <div class="name-en">${escape(g.name) || ''}</div>
        <div class="kv"><span>company</span><b>${escape(g.companyKorean ? `${g.companyKorean} / ${g.company}` : g.company)}</b></div>
        <div class="kv"><span>category</span><b>${escape(catLabel)} <small>(${escape(g.category)})</small></b></div>
        <div class="kv"><span>weight</span><b>${g.weight ? `${g.weight} g` : '<i>0</i>'}</b></div>
        <div class="kv"><span>color</span><b>${escape(colorLine)}</b></div>
        <div class="kv"><span>size</span><b>${escape(sizeLine)}</b></div>
        ${specRows ? `<div class="specs">${specRows}</div>` : ''}
        <div class="group-id">${escape(g.groupId ?? '')}</div>
        <div class="src">${escape(g._source ?? '')}</div>
      </div>
    </div>`;
  })
  .join('');

const sources = Array.from(new Set(gears.map((g) => g._source).filter(Boolean)));
const stats = {
  total: gears.length,
  noImage: gears.filter((g) => !g.imageUrl).length,
  noWeight: gears.filter((g) => !g.weight).length,
  noName: gears.filter((g) => !g.name).length,
  companies: Array.from(new Set(gears.map((g) => g.company))),
  categories: Array.from(new Set(gears.map((g) => g.category))),
};

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${escape(adapter.name)} crawl preview (${gears.length})</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f5f5f7; color: #1a1a1a; }
  header { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #e5e5e5; padding: 16px 24px; z-index: 10; }
  header h1 { margin: 0 0 8px; font-size: 20px; }
  header .stats { font-size: 13px; color: #666; display: flex; gap: 16px; flex-wrap: wrap; }
  header .stats b { color: #1a1a1a; }
  header .warn-summary { color: #c0392b; }
  header .sources { font-size: 12px; color: #888; margin-top: 8px; word-break: break-all; }
  header .json-path { font-size: 11px; color: #888; margin-top: 8px; font-family: ui-monospace, monospace; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; padding: 24px; }
  .card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
  .thumb { aspect-ratio: 4 / 5; background: #fafafa; display: flex; align-items: center; justify-content: center; }
  .thumb img { width: 100%; height: 100%; object-fit: contain; }
  .empty { font-size: 40px; color: #ccc; }
  .meta { padding: 12px; font-size: 13px; }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .idx { font-size: 11px; color: #999; }
  .warn { font-size: 10px; background: #fee; color: #c0392b; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
  .name { font-weight: 600; font-size: 14px; word-break: keep-all; }
  .name-en { font-size: 12px; color: #888; margin-bottom: 8px; word-break: break-word; }
  .kv small { color: #999; font-size: 10px; }
  .group-id { margin-top: 6px; font-size: 10px; color: #999; font-family: ui-monospace, monospace; }
  .kv { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; color: #666; }
  .kv b { color: #1a1a1a; font-weight: 500; }
  .kv i { color: #c0392b; font-style: normal; }
  .specs { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e5e5; }
  .spec { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; color: #666; font-size: 12px; }
  .spec b { color: #2c3e50; font-weight: 500; }
  .spec i { color: #bbb; font-style: normal; }
  .spec-missing b { color: #bbb; }
  .src { margin-top: 8px; font-size: 10px; color: #aaa; word-break: break-all; font-family: ui-monospace, monospace; }
</style>
</head>
<body>
<header>
  <h1>${escape(adapter.name)} — ${gears.length} items</h1>
  <div class="stats">
    <span><b>${stats.total}</b> total</span>
    <span class="${stats.noImage ? 'warn-summary' : ''}"><b>${stats.noImage}</b> no image</span>
    <span class="${stats.noWeight ? 'warn-summary' : ''}"><b>${stats.noWeight}</b> no weight</span>
    <span class="${stats.noName ? 'warn-summary' : ''}"><b>${stats.noName}</b> no name</span>
    <span>companies: <b>${stats.companies.map(escape).join(', ')}</b></span>
    <span>categories: <b>${stats.categories.map(escape).join(', ')}</b></span>
  </div>
  <div class="sources">sources: ${sources.map(escape).join(' | ')}</div>
  <div class="json-path">JSON: ${escape(jsonPath)}</div>
</header>
<main>${cards}</main>
</body>
</html>`;

writeFileSync(htmlPath, html);

console.log(`JSON: ${jsonPath}`);
console.log(`HTML: ${htmlPath}`);
console.log(`\nTo push after review:`);
console.log(`  ADMIN_UID=<uid> node .claude/skills/crawl-gear/push.js ${jsonPath}`);

if (!flags['no-open'] && process.platform === 'darwin') {
  exec(`open "${htmlPath}"`);
}
