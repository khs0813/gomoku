import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BUILD_DATE,
  SITE_NAME,
  localeOrder,
  locales,
  normalizeSiteUrl,
  pagePath,
  pages
} from '../src/config.mjs';
import { content } from '../src/content.mjs';
import { render404, renderLanguageHub, renderLocalizedPage } from '../src/templates.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePublic = path.join(projectRoot, 'src', 'public');
const outputDir = path.join(projectRoot, 'dist');
const siteUrl = normalizeSiteUrl(process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL);

function outputPathForRoute(route) {
  const routePath = route.replace(/^\/+|\/+$/g, '');
  return routePath ? path.join(outputDir, routePath, 'index.html') : path.join(outputDir, 'index.html');
}

async function writeRoute(route, html) {
  const filePath = outputPathForRoute(route);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, html, 'utf8');
}

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function rssDate(value) {
  return new Date(`${value}T00:00:00.000Z`).toUTCString();
}

function sitemapXml() {
  const routes = [
    { path: '/', priority: '0.8', changefreq: 'monthly', pageKey: 'home' },
    ...localeOrder.flatMap((locale) => pages.map((page) => ({
      path: pagePath(locale, page.key),
      pageKey: page.key,
      priority: page.key === 'play' ? '1.0' : page.key === 'home' ? '0.9' : '0.7',
      changefreq: page.key === 'play' ? 'weekly' : 'monthly'
    })))
  ];

  const alternateLinks = (pageKey) => [
    ...localeOrder.map((locale) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(locales[locale].hreflang)}" href="${escapeXml(`${siteUrl}${pagePath(locale, pageKey)}`)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${siteUrl}/`)}"/>`
  ].join('\n');

  const entries = routes.map((route) => `  <url>
    <loc>${escapeXml(`${siteUrl}${route.path}`)}</loc>
${alternateLinks(route.pageKey)}
    <lastmod>${BUILD_DATE}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}

function rssXml() {
  const publishedAt = rssDate(BUILD_DATE);
  const items = localeOrder.flatMap((locale) => pages.map((page) => {
    const meta = content[locale].meta[page.key];
    const url = `${siteUrl}${pagePath(locale, page.key)}`;
    return `    <item>
      <title>${escapeXml(meta.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(meta.description)}</description>
      <pubDate>${publishedAt}</pubDate>
      <category>${escapeXml(locales[locale].label)}</category>
      <category>${escapeXml(page.key)}</category>
      <dc:language>${escapeXml(locales[locale].htmlLang)}</dc:language>
    </item>`;
  })).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${SITE_NAME} | 오목 · Gomoku · 五子棋`)}</title>
    <link>${escapeXml(siteUrl)}/</link>
    <atom:link href="${escapeXml(siteUrl)}/rss.xml" rel="self" type="application/rss+xml"/>
    <description>한국어, 영어, 중국어로 오목 AI 대국과 규칙, 전략, 단계별 코스를 제공하는 FIVEGRID RSS 피드입니다.</description>
    <language>ko-KR</language>
    <lastBuildDate>${publishedAt}</lastBuildDate>
    <pubDate>${publishedAt}</pubDate>
    <ttl>1440</ttl>
${items}
  </channel>
</rss>
`;
}

function webManifest() {
  return JSON.stringify({
    id: '/',
    name: `${SITE_NAME} — Gomoku · 오목 · 五子棋`,
    short_name: SITE_NAME,
    description: 'Play Gomoku against three AI levels and learn rules and strategy in Korean, English, or Simplified Chinese.',
    lang: 'en',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f6efe4',
    theme_color: '#181a27',
    categories: ['games', 'education'],
    icons: [
      { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    shortcuts: localeOrder.map((locale) => ({
      name: `${locales[locale].gameName} · ${locales[locale].label}`,
      short_name: locales[locale].gameName,
      url: pagePath(locale, 'play'),
      icons: [{ src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' }]
    }))
  }, null, 2);
}

function offlinePage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#181a27">
  <meta name="robots" content="noindex">
  <title>Offline — ${SITE_NAME}</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="not-found-page">
  <main class="not-found">
    <div class="not-found-mark"><span>5</span><i></i><span>5</span></div>
    <h1>You are offline.</h1>
    <p>Previously opened pages and the game may still work. Reconnect and refresh to load everything.</p>
    <div><a class="button button-primary" href="/">Open FIVEGRID</a></div>
  </main>
</body>
</html>`;
}

function serviceWorker() {
  const precacheRoutes = [
    '/',
    '/offline.html',
    '/manifest.webmanifest',
    '/rss.xml',
    '/assets/styles.css',
    '/assets/site.js',
    '/assets/course-progress.js',
    '/assets/omok-game.js',
    '/assets/omok-ai-worker.js',
    '/assets/favicon.svg',
    '/assets/icon-192.png',
    '/assets/icon-512.png',
    '/assets/og-cover.png',
    ...localeOrder.flatMap((locale) => pages.map((page) => pagePath(locale, page.key)))
  ];
  return `const CACHE_NAME = 'fivegrid-${BUILD_DATE}';
const PRECACHE = ${JSON.stringify(precacheRoutes, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('fivegrid-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && url.pathname !== '/service-worker.js') {
        caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }))
  );
});
`;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(sourcePublic, outputDir, { recursive: true });

await writeRoute('/', renderLanguageHub(siteUrl));
for (const locale of localeOrder) {
  for (const page of pages) {
    await writeRoute(pagePath(locale, page.key), renderLocalizedPage(siteUrl, locale, page.key));
  }
}

await writeFile(path.join(outputDir, '404.html'), render404(siteUrl), 'utf8');
await writeFile(path.join(outputDir, 'offline.html'), offlinePage(), 'utf8');
await writeFile(path.join(outputDir, 'manifest.webmanifest'), webManifest(), 'utf8');
await writeFile(path.join(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
await writeFile(path.join(outputDir, 'sitemap.xml'), sitemapXml(), 'utf8');
await writeFile(path.join(outputDir, 'rss.xml'), rssXml(), 'utf8');
await writeFile(path.join(outputDir, 'service-worker.js'), serviceWorker(), 'utf8');
await writeFile(path.join(outputDir, 'version.json'), JSON.stringify({ name: SITE_NAME, buildDate: BUILD_DATE, siteUrl }, null, 2), 'utf8');

console.log(`Built ${1 + localeOrder.length * pages.length} HTML routes in ${outputDir}`);
console.log(`Canonical site URL: ${siteUrl}`);
