// Explore a brand homepage and emit a structured map of candidate category URLs.
// Claude uses this output to decide:
//   - which URLs are category listing pages
//   - how to map them to our 33 internal category keys
//   - what to set as defaultCategories in the adapter
//
// Usage: node discover.js <brand-homepage-url>

import puppeteer from 'puppeteer';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node discover.js <brand-homepage-url>');
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--ignore-certificate-errors',
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-http2',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.setUserAgent(
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
);
// Some Korean WAFs block puppeteer's request fingerprint. Try goto first; if non-2xx,
// fall back to native fetch + setContent (works for server-rendered pages).
let response;
try {
  response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
} catch (e) {
  response = null;
}
if (!response || response.status() >= 400) {
  const r = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
    },
  });
  const html = await r.text();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
}
await new Promise((r) => setTimeout(r, 3000));

// Hover over nav elements to expose mega-menus
try {
  await page.evaluate(() => {
    document
      .querySelectorAll('nav a, nav [role="button"], header a, header [role="button"], header button')
      .forEach((el) => {
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
      });
  });
  await new Promise((r) => setTimeout(r, 1500));
} catch (_) {}

const result = await page.evaluate((sourceUrl) => {
  const homepage = new URL(sourceUrl).origin;
  const allLinks = Array.from(document.querySelectorAll('a[href]'));

  const sameDomain = allLinks
    .map((a) => {
      try {
        const u = new URL(a.href);
        if (u.origin !== homepage) return null;
        const text = a.textContent.replace(/\s+/g, ' ').trim();
        if (!text || text.length > 60) return null;
        return {
          text: text.slice(0, 60),
          href: a.href.split('#')[0].split('?')[0],
          pathname: u.pathname,
          depth: u.pathname.split('/').filter(Boolean).length,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(
      (l) =>
        l &&
        l.depth >= 1 &&
        l.depth <= 4 &&
        !/^\/?(login|signup|register|cart|account|search|help|faq|contact|about|press|blog|news|terms|privacy|policy|legal|stockists|store-finder|customer|wishlist|compare)/i.test(
          l.pathname
        ) &&
        !/\.(jpg|jpeg|png|webp|pdf|svg)$/i.test(l.pathname)
    );

  const byHref = new Map();
  for (const l of sameDomain) {
    if (!byHref.has(l.href)) byHref.set(l.href, l);
  }

  const unique = Array.from(byHref.values()).sort((a, b) => a.depth - b.depth || a.pathname.localeCompare(b.pathname));

  // Group by 2-segment prefix (handles locale prefixes like /kr/, /en/)
  // e.g., /kr/backpacks/all  →  prefix /kr/backpacks
  // e.g., /backpacks/all     →  prefix /backpacks
  const byPrefix = {};
  for (const l of unique) {
    const segs = l.pathname.split('/').filter(Boolean);
    const usesLocale = segs[0] && segs[0].length <= 3;
    const prefix = usesLocale && segs.length >= 2 ? `/${segs[0]}/${segs[1]}` : `/${segs[0] ?? '_'}`;
    byPrefix[prefix] = byPrefix[prefix] || [];
    byPrefix[prefix].push(l);
  }

  // Category-looking groups: prefix that has 3+ children which themselves look like sub-paths
  // (not random product slugs). Heuristic: text length < 25, multiple siblings.
  const categoryGroups = Object.entries(byPrefix)
    .filter(([prefix, links]) => {
      if (links.length < 3) return false;
      const shortNamed = links.filter((l) => l.text.length <= 25).length;
      return shortNamed >= 3;
    })
    .map(([prefix, links]) => ({
      prefix,
      count: links.length,
      children: links
        .filter((l) => l.text.length <= 30)
        .slice(0, 15)
        .map((l) => ({ text: l.text, href: l.href })),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    homepage,
    targetUrl: sourceUrl,
    title: document.title,
    totalLinks: unique.length,
    categoryGroups,
  };
}, url);

console.log(JSON.stringify(result, null, 2));
await browser.close();
