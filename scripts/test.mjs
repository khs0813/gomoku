import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { GOOGLE_ADSENSE_ACCOUNT, localeOrder, locales, pagePath, pages } from '../src/config.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(projectRoot, 'dist');
const siteUrl = 'https://fivegrid-test.example';

const build = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'build.mjs')], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, SITE_URL: siteUrl }
});
assert.equal(build.status, 0, 'Static build failed');

const sourceScripts = [
  'src/config.mjs',
  'src/content.mjs',
  'src/templates.mjs',
  'scripts/build.mjs',
  'scripts/serve.mjs',
  'src/public/assets/site.js',
  'src/public/assets/course-progress.js',
  'src/public/assets/omok-game.js',
  'src/public/assets/omok-ai-worker.js'
];
for (const script of sourceScripts) {
  const check = spawnSync(process.execPath, ['--check', path.join(projectRoot, script)], { encoding: 'utf8' });
  assert.equal(check.status, 0, `${script} has a syntax error: ${check.stderr}`);
}

function fileForRoute(route) {
  const normalized = route.replace(/^\/+|\/+$/g, '');
  return normalized ? path.join(dist, normalized, 'index.html') : path.join(dist, 'index.html');
}

async function exists(filePath) {
  try { return (await stat(filePath)).isFile(); } catch { return false; }
}

const rootHtmlPath = path.join(dist, 'index.html');
assert((await readFile(rootHtmlPath, 'utf8')).includes(`<meta name="google-adsense-account" content="${GOOGLE_ADSENSE_ACCOUNT}">`), 'Missing AdSense meta tag on /');
const htmlFiles = [rootHtmlPath];
for (const locale of localeOrder) {
  const titles = new Set();
  for (const page of pages) {
    const route = pagePath(locale, page.key);
    const filePath = fileForRoute(route);
    assert(await exists(filePath), `Missing route output: ${route}`);
    htmlFiles.push(filePath);
    const html = await readFile(filePath, 'utf8');
    assert(html.includes(`<html lang="${locales[locale].htmlLang}"`), `Wrong html lang on ${route}`);
    assert(html.includes(`<link rel="canonical" href="${siteUrl}${route}">`), `Wrong canonical on ${route}`);
    assert(html.includes(`<meta name="google-adsense-account" content="${GOOGLE_ADSENSE_ACCOUNT}">`), `Missing AdSense meta tag on ${route}`);
    assert(html.includes('hreflang="ko"'), `Missing Korean hreflang on ${route}`);
    assert(html.includes('hreflang="en"'), `Missing English hreflang on ${route}`);
    assert(html.includes('hreflang="zh-Hans"'), `Missing Chinese hreflang on ${route}`);
    assert(html.includes('hreflang="x-default"'), `Missing x-default hreflang on ${route}`);
    const description = html.match(/<meta name="description" content="([^\"]+)"/)?.[1];
    assert(description && [...description].length >= 18, `Description is missing or too short on ${route}`);
    assert(html.includes('application/ld+json'), `Structured data is missing on ${route}`);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    assert(title, `Missing title on ${route}`);
    assert(!titles.has(title), `Duplicate title in ${locale}: ${title}`);
    titles.add(title);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `Expected exactly one h1 on ${route}`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `Duplicate HTML id on ${route}`);
    if (page.key === 'play') {
      const gameConfig = html.match(/<script type="application\/json" id="game-i18n">([\s\S]*?)<\/script>/)?.[1];
      assert(gameConfig, `Missing game translations on ${route}`);
      JSON.parse(gameConfig);
      assert(html.includes('width="900" height="900"'), `Missing game canvas on ${route}`);
    }
    if (['beginner', 'intermediate', 'advanced'].includes(page.key)) {
      assert.equal((html.match(/data-lesson-id=/g) || []).length, 5, `Expected five lessons on ${route}`);
    }
  }
}

const internalLinks = new Set();
for (const filePath of htmlFiles) {
  const html = await readFile(filePath, 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
    const value = match[1];
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    internalLinks.add(value.split(/[?#]/)[0]);
  }
}

for (const link of internalLinks) {
  if (!link) continue;
  const decoded = decodeURIComponent(link);
  let target;
  if (decoded === '/') target = path.join(dist, 'index.html');
  else if (decoded.endsWith('/')) target = path.join(dist, decoded, 'index.html');
  else {
    target = path.join(dist, decoded);
    if (!(await exists(target)) && !path.extname(decoded)) target = path.join(dist, decoded, 'index.html');
  }
  assert(await exists(target), `Broken internal reference: ${link}`);
}

for (const required of ['404.html', 'offline.html', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml', 'rss.xml', 'service-worker.js', 'assets/favicon.svg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/og-cover.png']) {
  assert(await exists(path.join(dist, required)), `Missing generated or copied asset: ${required}`);
}

const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
const sitemapLocs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
assert.equal(sitemapLocs.length, 1 + localeOrder.length * pages.length, 'Unexpected sitemap URL count');
assert.equal(new Set(sitemapLocs).size, sitemapLocs.length, 'Duplicate sitemap URLs');
assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'Missing sitemap hreflang namespace');
assert.equal((sitemap.match(/<xhtml:link /g) || []).length, (1 + localeOrder.length * pages.length) * (localeOrder.length + 1), 'Unexpected sitemap hreflang link count');

const rss = await readFile(path.join(dist, 'rss.xml'), 'utf8');
const rssItemLinks = [...rss.matchAll(/<item>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g)].map((match) => match[1]);
const rssGuids = [...rss.matchAll(/<guid isPermaLink="true">(.*?)<\/guid>/g)].map((match) => match[1]);
assert(rss.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), 'RSS XML declaration is missing');
assert(rss.includes('<rss version="2.0"'), 'RSS root element is missing');
assert(rss.includes(`<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`), 'RSS self link is missing');
assert.equal(rssItemLinks.length, localeOrder.length * pages.length, 'Unexpected RSS item count');
assert.equal(new Set(rssGuids).size, rssGuids.length, 'Duplicate RSS guids');
for (const link of rssItemLinks) assert(sitemapLocs.includes(link), `RSS item is missing from sitemap: ${link}`);

const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.icons.length, 2);

async function requestWorkerMove(board, player, difficulty = 'advanced', rule = 'freestyle') {
  let reply;
  globalThis.self = {
    postMessage(message) { reply = message; }
  };
  const workerUrl = `${pathToFileURL(path.join(projectRoot, 'src/public/assets/omok-ai-worker.js')).href}?test=${Date.now()}-${Math.random()}`;
  await import(workerUrl);
  await globalThis.self.onmessage({ data: {
    requestId: 1,
    purpose: 'ai',
    board,
    player,
    difficulty,
    rule,
    timeLimit: 250
  } });
  assert(reply, 'AI worker did not respond');
  assert(!reply.error, `AI worker error: ${reply.error}`);
  return reply.move;
}

const emptyBoard = Array(225).fill(0);
const openingMove = await requestWorkerMove(emptyBoard, 1, 'beginner');
assert(openingMove && openingMove.x === 7 && openingMove.y === 7, 'AI should open in the center');

const winningBoard = Array(225).fill(0);
for (let x = 3; x <= 6; x++) winningBoard[7 * 15 + x] = 1;
winningBoard[6 * 15 + 7] = 2;
const winningMove = await requestWorkerMove(winningBoard, 1);
assert(winningMove && winningMove.y === 7 && [2, 7].includes(winningMove.x), 'AI did not take an immediate win');

const blockingBoard = Array(225).fill(0);
for (let x = 3; x <= 6; x++) blockingBoard[7 * 15 + x] = 2;
blockingBoard[6 * 15 + 7] = 1;
const blockingMove = await requestWorkerMove(blockingBoard, 1);
assert(blockingMove && blockingMove.y === 7 && [2, 7].includes(blockingMove.x), 'AI did not block an immediate loss');

const assets = await readdir(path.join(dist, 'assets'));
assert(assets.length >= 8, 'Too few public assets were emitted');
console.log(`Validated ${htmlFiles.length} HTML pages, ${internalLinks.size} internal references, SEO metadata, PWA assets, and tactical AI behavior.`);
