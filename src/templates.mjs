import { BUILD_DATE, SITE_NAME, localeOrder, locales, pagePath, pages } from './config.mjs';
import { content } from './content.mjs';

const pageByKey = Object.fromEntries(pages.map((page) => [page.key, page]));

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function icon(name, size = 20) {
  const attrs = `width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"`;
  const icons = {
    arrow: `<svg ${attrs}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    chevron: `<svg ${attrs}><path d="m8 10 4 4 4-4"/></svg>`,
    menu: `<svg ${attrs}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    close: `<svg ${attrs}><path d="m6 6 12 12M18 6 6 18"/></svg>`,
    spark: `<svg ${attrs}><path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="m5 15 .9 2.1L8 18l-2.1.9L5 21l-.9-2.1L2 18l2.1-.9L5 15Z"/></svg>`,
    hand: `<svg ${attrs}><path d="M7.5 11V6.5a1.5 1.5 0 0 1 3 0V10m0-4.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0v4m0-2a1.5 1.5 0 0 1 3 0v4.2c0 4.2-2.8 7.3-7.1 7.3H11c-2 0-3.2-.7-4.4-2.1L3.7 14.5a1.5 1.5 0 0 1 2.2-2l1.6 1.4V11Z"/></svg>`,
    book: `<svg ${attrs}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z"/></svg>`,
    play: `<svg ${attrs}><path d="m9 7 8 5-8 5V7Z"/></svg>`,
    undo: `<svg ${attrs}><path d="M9 8H4V3"/><path d="M4 8c2-3 5-4 8-4a8 8 0 1 1-7.4 11"/></svg>`,
    bulb: `<svg ${attrs}><path d="M9 18h6M10 22h4"/><path d="M8.2 14.6A7 7 0 1 1 15.8 14.6c-.8.6-.8 1.4-.8 2.4H9c0-1 0-1.8-.8-2.4Z"/></svg>`,
    sound: `<svg ${attrs}><path d="M5 10v4h4l4 3V7l-4 3H5Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10"/></svg>`,
    grid: `<svg ${attrs}><path d="M4 4h16v16H4zM4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/></svg>`,
    trophy: `<svg ${attrs}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>`,
    clock: `<svg ${attrs}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
    check: `<svg ${attrs}><path d="m5 12 4 4L19 6"/></svg>`,
    info: `<svg ${attrs}><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>`,
    keyboard: `<svg ${attrs}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h6"/></svg>`,
    phone: `<svg ${attrs}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>`,
    shield: `<svg ${attrs}><path d="M12 3 5 6v5c0 4.4 2.8 7.9 7 10 4.2-2.1 7-5.6 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>`,
    home: `<svg ${attrs}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>`,
    external: `<svg ${attrs}><path d="M14 5h5v5M19 5l-8 8"/><path d="M19 13v6H5V5h6"/></svg>`
  };
  return icons[name] || icons.info;
}

function logoMarkup(locale, compact = false) {
  const label = content[locale].common.brandTagline;
  return `<span class="brand-mark" aria-hidden="true"><span></span><span></span><span></span><span></span><i></i></span><span class="brand-copy"><strong>${SITE_NAME}</strong>${compact ? '' : `<small>${escapeHtml(label)}</small>`}</span>`;
}

function alternateLinks(siteUrl, pageKey) {
  const slug = pageByKey[pageKey].slug;
  const links = localeOrder.map((locale) => {
    const href = `${siteUrl}${pagePath(locale, pageKey)}`;
    return `<link rel="alternate" hreflang="${locales[locale].hreflang}" href="${href}">`;
  });
  links.push(`<link rel="alternate" hreflang="x-default" href="${siteUrl}/">`);
  return links.join('\n    ');
}

function breadcrumbItems(locale, pageKey) {
  const c = content[locale];
  const items = [{ name: c.common.nav.home, href: pagePath(locale, 'home') }];
  if (['beginner', 'intermediate', 'advanced'].includes(pageKey)) {
    items.push({ name: c.common.nav.courses, href: pagePath(locale, 'beginner') });
  }
  if (pageKey !== 'home') {
    const names = {
      play: c.common.nav.play,
      rules: c.common.nav.rules,
      strategy: c.common.nav.strategy,
      beginner: c.common.nav.beginner,
      intermediate: c.common.nav.intermediate,
      advanced: c.common.nav.advanced
    };
    items.push({ name: names[pageKey], href: pagePath(locale, pageKey) });
  }
  return items;
}

function schemaForPage(siteUrl, locale, pageKey, meta) {
  const canonical = `${siteUrl}${pagePath(locale, pageKey)}`;
  const c = content[locale];
  const items = breadcrumbItems(locale, pageKey);
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      url: `${siteUrl}/`,
      name: SITE_NAME,
      inLanguage: localeOrder.map((code) => locales[code].htmlLang),
      description: content[locale].meta.home.description
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${siteUrl}${item.href}`
      }))
    }
  ];

  if (pageKey === 'play') {
    graph.push({
      '@type': 'VideoGame',
      name: `${locales[locale].gameName} - ${SITE_NAME}`,
      url: canonical,
      description: meta.description,
      applicationCategory: 'Game',
      operatingSystem: 'Web Browser, Android, iOS',
      playMode: ['SinglePlayer', 'MultiPlayer'],
      gamePlatform: ['Web Browser', 'Mobile'],
      inLanguage: locales[locale].htmlLang,
      isAccessibleForFree: true
    });
  } else if (['beginner', 'intermediate', 'advanced'].includes(pageKey)) {
    const course = c.courses[pageKey];
    graph.push({
      '@type': 'Course',
      name: course.title,
      description: meta.description,
      url: canonical,
      provider: { '@type': 'Organization', name: SITE_NAME, url: siteUrl },
      inLanguage: locales[locale].htmlLang,
      isAccessibleForFree: true,
      educationalLevel: course.level,
      numberOfCredits: course.lessons.length,
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: course.duration
      }
    });
  } else if (pageKey === 'rules' || pageKey === 'strategy') {
    graph.push({
      '@type': 'Article',
      headline: meta.title.split(' - ')[0],
      description: meta.description,
      mainEntityOfPage: canonical,
      dateModified: BUILD_DATE,
      datePublished: BUILD_DATE,
      inLanguage: locales[locale].htmlLang,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME }
    });
  } else {
    graph.push({
      '@type': 'WebPage',
      name: meta.title,
      description: meta.description,
      url: canonical,
      inLanguage: locales[locale].htmlLang,
      isPartOf: { '@id': `${siteUrl}/#website` }
    });
  }

  const faq = pageKey === 'home' ? c.home.faq : pageKey === 'play' ? c.play.faq : pageKey === 'rules' ? c.rules.faq : pageKey === 'strategy' ? c.strategy.faq : null;
  if (faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a }
      }))
    });
  }

  return safeJson({ '@context': 'https://schema.org', '@graph': graph });
}

function headMarkup(siteUrl, locale, pageKey, extra = {}) {
  const meta = content[locale].meta[pageKey];
  const canonical = `${siteUrl}${pagePath(locale, pageKey)}`;
  const socialImage = `${siteUrl}/assets/og-cover.png`;
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#181a27">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}">
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
    <link rel="canonical" href="${canonical}">
    <link rel="alternate" type="application/rss+xml" title="${SITE_NAME} RSS" href="${siteUrl}/rss.xml">
    ${alternateLinks(siteUrl, pageKey)}
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${SITE_NAME}">
    <meta property="og:title" content="${escapeHtml(meta.title)}">
    <meta property="og:description" content="${escapeHtml(meta.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${socialImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="${locales[locale].htmlLang.replace('-', '_')}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(meta.title)}">
    <meta name="twitter:description" content="${escapeHtml(meta.description)}">
    <meta name="twitter:image" content="${socialImage}">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/assets/icon-192.png">
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="preload" href="/assets/styles.css" as="style">
    <link rel="stylesheet" href="/assets/styles.css">
    <script type="application/ld+json">${schemaForPage(siteUrl, locale, pageKey, meta)}</script>
    ${extra.head || ''}`;
}

function headerMarkup(locale, pageKey) {
  const c = content[locale];
  const courseActive = ['beginner', 'intermediate', 'advanced'].includes(pageKey);
  const navLink = (key, label, active = pageKey === key) => `<a href="${pagePath(locale, key)}"${active ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`;
  const languageLinks = localeOrder.map((code) => {
    const active = code === locale;
    return `<a href="${pagePath(code, pageKey)}" hreflang="${locales[code].hreflang}" lang="${locales[code].htmlLang}"${active ? ' aria-current="true"' : ''}><span>${escapeHtml(locales[code].label)}</span>${active ? icon('check', 16) : ''}</a>`;
  }).join('');

  const desktopNav = `
    <nav class="desktop-nav" aria-label="Primary">
      ${navLink('play', c.common.nav.play)}
      <details class="nav-popover"${courseActive ? ' data-active="true"' : ''}>
        <summary>${escapeHtml(c.common.nav.courses)} ${icon('chevron', 16)}</summary>
        <div class="nav-popover-panel">
          ${navLink('beginner', c.common.nav.beginner)}
          ${navLink('intermediate', c.common.nav.intermediate)}
          ${navLink('advanced', c.common.nav.advanced)}
        </div>
      </details>
      ${navLink('rules', c.common.nav.rules)}
      ${navLink('strategy', c.common.nav.strategy)}
    </nav>`;

  const mobileLinks = `
    ${navLink('home', c.common.nav.home)}
    ${navLink('play', c.common.nav.play)}
    <span class="mobile-nav-label">${escapeHtml(c.common.nav.courses)}</span>
    ${navLink('beginner', c.common.nav.beginner)}
    ${navLink('intermediate', c.common.nav.intermediate)}
    ${navLink('advanced', c.common.nav.advanced)}
    ${navLink('rules', c.common.nav.rules)}
    ${navLink('strategy', c.common.nav.strategy)}`;

  return `<header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="${pagePath(locale, 'home')}" aria-label="${SITE_NAME} ${c.common.nav.home}">${logoMarkup(locale)}</a>
      ${desktopNav}
      <div class="header-actions">
        <details class="language-menu">
          <summary aria-label="${escapeHtml(c.common.footer.language)}">${escapeHtml(locales[locale].shortLabel)} ${icon('chevron', 15)}</summary>
          <div class="language-panel">${languageLinks}</div>
        </details>
        <a class="button button-small button-dark desktop-play" href="${pagePath(locale, 'play')}">${icon('play', 16)} ${escapeHtml(c.common.actions.playNow)}</a>
        <details class="mobile-menu">
          <summary aria-label="Menu">${icon('menu', 22)}</summary>
          <div class="mobile-menu-panel">
            <div class="mobile-menu-top"><a class="brand brand-compact" href="${pagePath(locale, 'home')}">${logoMarkup(locale, true)}</a></div>
            <nav aria-label="Mobile">${mobileLinks}</nav>
            <div class="mobile-language">${languageLinks}</div>
          </div>
        </details>
      </div>
    </div>
  </header>`;
}

function footerMarkup(locale) {
  const c = content[locale];
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div class="footer-brand">
        <a class="brand brand-footer" href="${pagePath(locale, 'home')}">${logoMarkup(locale)}</a>
        <p>${escapeHtml(c.common.footer.intro)}</p>
        <div class="privacy-note">${icon('shield', 17)} <span>${escapeHtml(c.common.footer.privacy)}</span></div>
      </div>
      <div class="footer-column">
        <strong>${escapeHtml(c.common.footer.play)}</strong>
        <a href="${pagePath(locale, 'play')}">${escapeHtml(c.common.nav.play)}</a>
        <a href="${pagePath(locale, 'rules')}">${escapeHtml(c.common.nav.rules)}</a>
        <a href="${pagePath(locale, 'strategy')}">${escapeHtml(c.common.nav.strategy)}</a>
      </div>
      <div class="footer-column">
        <strong>${escapeHtml(c.common.footer.learn)}</strong>
        <a href="${pagePath(locale, 'beginner')}">${escapeHtml(c.common.nav.beginner)}</a>
        <a href="${pagePath(locale, 'intermediate')}">${escapeHtml(c.common.nav.intermediate)}</a>
        <a href="${pagePath(locale, 'advanced')}">${escapeHtml(c.common.nav.advanced)}</a>
      </div>
      <div class="footer-column">
        <strong>${escapeHtml(c.common.footer.language)}</strong>
        ${localeOrder.map((code) => `<a href="${pagePath(code, 'home')}" hreflang="${locales[code].hreflang}" lang="${locales[code].htmlLang}">${escapeHtml(locales[code].label)}</a>`).join('')}
      </div>
    </div>
    <div class="shell footer-bottom">
      <span>© ${new Date(BUILD_DATE).getUTCFullYear()} ${escapeHtml(c.common.footer.copyright)}</span>
      <span>${escapeHtml(c.common.localOnly)} · ${escapeHtml(c.common.noAccount)} · ${escapeHtml(c.common.offline)}</span>
    </div>
  </footer>`;
}

function pageShell({ siteUrl, locale, pageKey, body, extra = {}, bodyClass = '' }) {
  const c = content[locale];
  return `<!doctype html>
<html lang="${locales[locale].htmlLang}" dir="${locales[locale].dir}">
<head>${headMarkup(siteUrl, locale, pageKey, extra)}</head>
<body class="${bodyClass || `page-${pageKey}`}">
  <a class="skip-link" href="#main">${escapeHtml(c.common.skip)}</a>
  ${headerMarkup(locale, pageKey)}
  <main id="main">${body}</main>
  ${footerMarkup(locale)}
  <script src="/assets/site.js" defer></script>
  ${extra.scripts || ''}
</body>
</html>`;
}

function boardPreviewSvg() {
  const size = 15;
  const cell = 28;
  const pad = 20;
  const total = pad * 2 + cell * (size - 1);
  const black = [[7,7],[8,7],[6,8],[7,9],[9,9],[5,6],[8,10],[10,8],[4,9]];
  const white = [[7,8],[8,8],[6,7],[6,9],[9,8],[5,7],[9,10],[10,9]];
  const lines = Array.from({ length: size }, (_, i) => {
    const p = pad + i * cell;
    return `<path d="M${pad} ${p}H${total-pad}M${p} ${pad}V${total-pad}"/>`;
  }).join('');
  const stars = [[3,3],[11,3],[7,7],[3,11],[11,11]].map(([x,y]) => `<circle cx="${pad+x*cell}" cy="${pad+y*cell}" r="3.2"/>`).join('');
  const stones = [
    ...black.map(([x,y], i) => `<g class="stone stone-black"><circle cx="${pad+x*cell}" cy="${pad+y*cell}" r="12.4"/>${i === black.length-1 ? `<circle class="last-dot" cx="${pad+x*cell}" cy="${pad+y*cell}" r="3"/>` : ''}</g>`),
    ...white.map(([x,y]) => `<g class="stone stone-white"><circle cx="${pad+x*cell}" cy="${pad+y*cell}" r="12.4"/></g>`)
  ].join('');
  return `<svg class="hero-board-svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="Gomoku board preview"><g class="board-lines">${lines}${stars}</g>${stones}<g class="hint-pulse"><circle cx="${pad+10*cell}" cy="${pad+10*cell}" r="10"/><circle cx="${pad+10*cell}" cy="${pad+10*cell}" r="3"/></g></svg>`;
}

function featureIcon(name) {
  return `<span class="feature-icon">${icon(name, 25)}</span>`;
}

function faqMarkup(items) {
  return `<div class="faq-list">${items.map((item, index) => `<details${index === 0 ? ' open' : ''}><summary><span>${escapeHtml(item.q)}</span><i aria-hidden="true">+</i></summary><div class="faq-answer"><p>${escapeHtml(item.a)}</p></div></details>`).join('')}</div>`;
}

function breadcrumbMarkup(locale, pageKey) {
  const c = content[locale];
  const items = breadcrumbItems(locale, pageKey);
  return `<nav class="breadcrumbs" aria-label="${escapeHtml(c.common.breadcrumbs)}"><ol>${items.map((item, index) => `<li>${index < items.length - 1 ? `<a href="${item.href}">${escapeHtml(item.name)}</a>` : `<span aria-current="page">${escapeHtml(item.name)}</span>`}</li>`).join('')}</ol></nav>`;
}

function articleHero(locale, pageKey, data, options = {}) {
  const c = content[locale];
  const readTime = options.readTime || 6;
  return `<section class="article-hero">
    <div class="shell article-hero-grid">
      <div>
        ${breadcrumbMarkup(locale, pageKey)}
        <p class="eyebrow">${escapeHtml(data.eyebrow)}</p>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="article-intro">${escapeHtml(data.intro)}</p>
        <div class="article-meta"><span>${icon('clock', 17)} ${readTime} ${escapeHtml(c.common.minRead)}</span><span>${escapeHtml(c.common.updated)} ${BUILD_DATE}</span></div>
      </div>
      ${options.aside || `<div class="article-hero-mark" aria-hidden="true"><span>5</span><small>IN A ROW</small></div>`}
    </div>
  </section>`;
}

function renderHome(siteUrl, locale) {
  const c = content[locale];
  const h = c.home;
  const body = `
  <section class="hero-section">
    <div class="hero-glow" aria-hidden="true"></div>
    <div class="shell hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(h.eyebrow)}</p>
        <h1><span>${escapeHtml(h.titleLead)}</span> <em>${escapeHtml(h.titleAccent)}</em></h1>
        <p class="hero-intro">${escapeHtml(h.intro)}</p>
        <div class="hero-actions">
          <a class="button button-primary" href="${pagePath(locale, 'play')}">${icon('play', 18)} ${escapeHtml(c.common.actions.playNow)}</a>
          <a class="button button-ghost" href="${pagePath(locale, 'beginner')}">${escapeHtml(c.common.actions.startBeginner)} ${icon('arrow', 18)}</a>
        </div>
        <div class="hero-stats">${h.stats.map((stat) => `<div><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join('')}</div>
      </div>
      <div class="hero-game-card">
        <div class="hero-card-head"><span class="status-dot"></span><span>${escapeHtml(h.previewCaption)}</span><b>FIVEGRID AI</b></div>
        <div class="hero-board-wrap">${boardPreviewSvg()}</div>
        <div class="hero-card-foot"><span>${escapeHtml(h.previewMove)}</span><span class="thinking-bars" aria-hidden="true"><i></i><i></i><i></i></span></div>
      </div>
    </div>
    <div class="shell trust-row">${h.trust.map((item, index) => `<span>${index === 0 ? icon('phone', 17) : index === 1 ? icon('keyboard', 17) : icon('shield', 17)} ${escapeHtml(item)}</span>`).join('')}</div>
  </section>

  <section class="section feature-section">
    <div class="shell">
      <div class="section-heading split-heading"><div><p class="eyebrow">${escapeHtml(h.sectionFeatureEyebrow)}</p><h2>${escapeHtml(h.sectionFeatureTitle)}</h2></div><p>${escapeHtml(h.sectionFeatureIntro)}</p></div>
      <div class="feature-grid">${h.features.map((feature, index) => `<article class="feature-card"><span class="card-index">0${index + 1}</span>${featureIcon(feature.icon)}<h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.text)}</p></article>`).join('')}</div>
    </div>
  </section>

  <section class="section path-section">
    <div class="shell">
      <div class="section-heading centered"><p class="eyebrow">${escapeHtml(h.pathEyebrow)}</p><h2>${escapeHtml(h.pathTitle)}</h2><p>${escapeHtml(h.pathIntro)}</p></div>
      <div class="path-grid">${h.path.map((step, index) => {
        const key = ['beginner','intermediate','advanced'][index];
        return `<a class="path-card" href="${pagePath(locale, key)}"><div class="path-number">${escapeHtml(step.number)}</div><span class="level-pill">${escapeHtml(step.level)}</span><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p><div class="path-footer"><span>${icon('clock', 16)} ${escapeHtml(step.time)}</span>${icon('arrow', 20)}</div></a>`;
      }).join('')}</div>
    </div>
  </section>

  <section class="section rules-teaser">
    <div class="shell rules-teaser-grid">
      <div class="rules-visual" aria-hidden="true"><div class="rule-five">${[0,1,2,3,4].map((i) => `<i style="--i:${i}"></i>`).join('')}</div><span>5</span></div>
      <div class="rules-teaser-copy"><p class="eyebrow">RULES IN 60 SECONDS</p><h2>${escapeHtml(h.rulesTitle)}</h2><p>${escapeHtml(h.rulesIntro)}</p><ul class="check-list">${h.rulePoints.map((item) => `<li>${icon('check', 17)}<span>${escapeHtml(item)}</span></li>`).join('')}</ul><a class="text-link" href="${pagePath(locale, 'rules')}">${escapeHtml(c.common.actions.learnRules)} ${icon('arrow', 18)}</a></div>
    </div>
  </section>

  <section class="section faq-section">
    <div class="shell faq-shell"><div class="section-heading"><p class="eyebrow">FAQ</p><h2>${escapeHtml(h.faqTitle)}</h2></div>${faqMarkup(h.faq)}</div>
  </section>

  <section class="final-cta">
    <div class="shell final-cta-inner"><div><p class="eyebrow">YOUR NEXT MOVE</p><h2>${escapeHtml(c.common.actions.playNow)}</h2></div><a class="button button-light" href="${pagePath(locale, 'play')}">${icon('play', 18)} ${escapeHtml(c.common.actions.playNow)}</a></div>
  </section>`;
  return pageShell({ siteUrl, locale, pageKey: 'home', body });
}

function gameShellMarkup(locale) {
  const labels = content[locale].play.labels;
  return `<section class="game-stage" data-game-root data-locale="${locale}">
    <div class="game-topbar">
      <div class="game-status" aria-live="polite"><span class="turn-stone turn-black" data-turn-stone></span><div><small>${escapeHtml(labels.status)}</small><strong data-status>${escapeHtml(labels.yourTurn)}</strong></div></div>
      <div class="game-metrics"><span><small>${escapeHtml(labels.move)}</small><strong data-move-count>0</strong></span><span><small>${escapeHtml(labels.elapsed)}</small><strong data-timer>00:00</strong></span></div>
    </div>
    <div class="game-main-grid">
      <div class="board-panel">
        <div class="board-frame" data-board-frame>
          <canvas class="gomoku-board" data-board width="900" height="900" tabindex="0" role="application" aria-label="${escapeHtml(labels.keyboardHelp)}"></canvas>
          <div class="ai-overlay" data-ai-overlay hidden><span class="thinking-orbit"><i></i></span><strong>${escapeHtml(labels.aiTurn)}</strong></div>
        </div>
        <p class="keyboard-note">${icon('keyboard', 16)} ${escapeHtml(labels.keyboardHelp)}</p>
        <div class="game-action-row">
          <button class="game-button primary" type="button" data-new-game>${icon('play', 17)}<span>${escapeHtml(labels.newGame)}</span></button>
          <button class="game-button" type="button" data-undo>${icon('undo', 17)}<span>${escapeHtml(labels.undo)}</span></button>
          <button class="game-button" type="button" data-hint>${icon('bulb', 17)}<span>${escapeHtml(labels.hint)}</span></button>
        </div>
      </div>
      <aside class="game-sidebar">
        <section class="control-card">
          <div class="control-card-title"><span>${icon('grid', 18)}</span><h2>${escapeHtml(labels.setup)}</h2></div>
          <fieldset><legend>${escapeHtml(labels.mode)}</legend><div class="segmented two"><label><input type="radio" name="mode" value="ai" checked><span>${escapeHtml(labels.modeAi)}</span></label><label><input type="radio" name="mode" value="local"><span>${escapeHtml(labels.modeLocal)}</span></label></div></fieldset>
          <fieldset data-ai-setting><legend>${escapeHtml(labels.difficulty)}</legend><div class="segmented three"><label><input type="radio" name="difficulty" value="beginner"><span>${escapeHtml(labels.beginner)}</span></label><label><input type="radio" name="difficulty" value="intermediate" checked><span>${escapeHtml(labels.intermediate)}</span></label><label><input type="radio" name="difficulty" value="advanced"><span>${escapeHtml(labels.advanced)}</span></label></div><p class="setting-description" data-difficulty-description>${escapeHtml(labels.aiIntermediateDesc)}</p></fieldset>
          <fieldset data-ai-setting><legend>${escapeHtml(labels.side)}</legend><div class="segmented three"><label><input type="radio" name="side" value="black" checked><span><i class="tiny-stone black"></i>${escapeHtml(labels.black)}</span></label><label><input type="radio" name="side" value="white"><span><i class="tiny-stone white"></i>${escapeHtml(labels.white)}</span></label><label><input type="radio" name="side" value="random"><span>${escapeHtml(labels.random)}</span></label></div></fieldset>
          <fieldset><legend>${escapeHtml(labels.rule)}</legend><select data-rule-select aria-label="${escapeHtml(labels.rule)}"><option value="freestyle">${escapeHtml(labels.freestyle)}</option><option value="exact-five">${escapeHtml(labels.exactFive)}</option><option value="renju">${escapeHtml(labels.renju)}</option></select><p class="setting-description" data-rule-description>${escapeHtml(labels.ruleNoteFreestyle)}</p></fieldset>
          <div class="toggle-row"><label><span>${icon('sound', 17)} ${escapeHtml(labels.sound)}</span><input class="switch" type="checkbox" data-sound disabled></label><label><span>${icon('grid', 17)} ${escapeHtml(labels.coordinates)}</span><input class="switch" type="checkbox" data-coordinates checked></label></div>
        </section>
        <section class="control-card record-card">
          <div class="control-card-title"><span>${icon('trophy', 18)}</span><h2>${escapeHtml(labels.record)}</h2></div>
          <div class="record-grid"><div><strong data-wins>0</strong><span>${escapeHtml(labels.wins)}</span></div><div><strong data-losses>0</strong><span>${escapeHtml(labels.losses)}</span></div><div><strong data-draws>0</strong><span>${escapeHtml(labels.draws)}</span></div><div><strong data-streak>0</strong><span>${escapeHtml(labels.streak)}</span></div></div>
          <button class="text-button" type="button" data-reset-record>${escapeHtml(labels.resetRecord)}</button>
        </section>
        <section class="install-card"><span>${icon('phone', 21)}</span><div><strong>${escapeHtml(labels.install)}</strong><p>${escapeHtml(labels.installHelp)}</p></div></section>
      </aside>
    </div>
    <div class="toast" data-toast role="status" aria-live="polite" hidden></div>
    <dialog class="game-dialog" data-result-dialog><div class="dialog-stones" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><p class="eyebrow">GAME OVER</p><h2 data-result-title></h2><p data-result-detail></p><div class="dialog-actions"><button class="button button-primary" type="button" data-dialog-new>${escapeHtml(labels.newGame)}</button><button class="button button-ghost" type="button" data-dialog-close>OK</button></div></dialog>
  </section>
  <script type="application/json" id="game-i18n">${safeJson(labels)}</script>`;
}

function renderPlay(siteUrl, locale) {
  const c = content[locale];
  const p = c.play;
  const body = `
    <section class="play-hero"><div class="shell">${breadcrumbMarkup(locale, 'play')}<p class="eyebrow">${escapeHtml(p.eyebrow)}</p><h1>${escapeHtml(p.title)}</h1><p>${escapeHtml(p.intro)}</p></div></section>
    <div class="shell game-shell">${gameShellMarkup(locale)}</div>
    <section class="section compact-section"><div class="shell"><div class="section-heading centered"><p class="eyebrow">MOBILE UX</p><h2>${escapeHtml(p.guideTitle)}</h2></div><div class="guide-grid">${p.guide.map((item,index)=>`<article><span>0${index+1}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
    <section class="section ai-explainer"><div class="shell"><div class="section-heading"><p class="eyebrow">AI LEVELS</p><h2>${escapeHtml(p.aiTitle)}</h2></div><div class="ai-card-grid">${p.aiCards.map((item,index)=>`<article class="ai-level-card level-${index+1}"><div><span class="level-orb">${index+1}</span><span class="level-badge">${escapeHtml(item.badge)}</span></div><h3>${escapeHtml(item.level)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
    <section class="section faq-section"><div class="shell faq-shell"><div class="section-heading"><p class="eyebrow">FAQ</p><h2>${escapeHtml(p.faqTitle)}</h2></div>${faqMarkup(p.faq)}</div></section>`;
  return pageShell({
    siteUrl,
    locale,
    pageKey: 'play',
    body,
    bodyClass: 'page-play',
    extra: { scripts: '<script type="module" src="/assets/omok-game.js"></script>' }
  });
}

function miniPatternSvg(type, locale) {
  const cell = 42;
  const pad = 24;
  const size = 7;
  const total = pad * 2 + cell * (size - 1);
  const coords = {
    openFour: { black: [[1,3],[2,3],[3,3],[4,3]], white: [], hints: [[0,3],[5,3]] },
    doubleThree: { black: [[2,3],[4,3],[3,2],[3,4]], white: [], hints: [[3,3]], forbidden: true },
    doubleFour: { black: [[1,3],[2,3],[4,3],[3,1],[3,2],[3,4]], white: [], hints: [[3,3]], forbidden: true },
    overline: { black: [[0,3],[1,3],[2,3],[3,3],[4,3],[5,3]], white: [], hints: [], forbidden: true },
    fourThree: { black: [[1,3],[2,3],[4,3],[3,2],[3,4]], white: [[5,3]], hints: [[3,3]] },
    openThree: { black: [[2,3],[3,3],[4,3]], white: [], hints: [[1,3],[5,3]] }
  }[type];
  const lines = Array.from({length:size},(_,i)=>{const p=pad+i*cell;return `<path d="M${pad} ${p}H${total-pad}M${p} ${pad}V${total-pad}"/>`;}).join('');
  const stone = (x,y,color)=>`<circle class="mini-${color}" cx="${pad+x*cell}" cy="${pad+y*cell}" r="17"/>`;
  const hint = (x,y)=>`<g class="mini-hint"><circle cx="${pad+x*cell}" cy="${pad+y*cell}" r="12"/><path d="m${pad+x*cell-5} ${pad+y*cell}h10m-5-5v10"/></g>`;
  const forbidden = coords.forbidden ? `<g class="mini-forbidden"><circle cx="${pad+3*cell}" cy="${pad+3*cell}" r="13"/><path d="m${pad+3*cell-6} ${pad+3*cell-6} 12 12m0-12-12 12"/></g>` : '';
  return `<svg class="pattern-svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="${escapeHtml(locales[locale].gameName)} pattern"><g class="mini-lines">${lines}</g>${coords.black.map(([x,y])=>stone(x,y,'black')).join('')}${coords.white.map(([x,y])=>stone(x,y,'white')).join('')}${coords.hints.map(([x,y])=>hint(x,y)).join('')}${forbidden}</svg>`;
}

function renderRules(siteUrl, locale) {
  const c = content[locale];
  const r = c.rules;
  const body = `${articleHero(locale, 'rules', r, { readTime: 8 })}
    <article class="article-body">
      <section class="content-section"><div class="shell narrow"><h2>${escapeHtml(r.basicsTitle)}</h2><div class="step-list">${r.basics.map((item)=>`<div class="step-item"><span>${escapeHtml(item.number)}</span><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></div></div>`).join('')}</div></div></section>
      <section class="content-section surface-section"><div class="shell"><div class="section-heading"><p class="eyebrow">RULESETS</p><h2>${escapeHtml(r.variantsTitle)}</h2></div><div class="responsive-table"><table><thead><tr>${r.tableHeaders.map((h)=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${r.variants.map((row)=>`<tr><th>${escapeHtml(row.name)}</th><td>${escapeHtml(row.black)}</td><td>${escapeHtml(row.white)}</td><td>${escapeHtml(row.forbidden)}</td><td>${escapeHtml(row.recommended)}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section class="content-section"><div class="shell"><div class="section-heading split-heading"><div><p class="eyebrow">RENJU</p><h2>${escapeHtml(r.forbiddenTitle)}</h2></div><p>${escapeHtml(r.forbiddenIntro)}</p></div><div class="forbidden-grid">${r.forbidden.map((item,index)=>`<article><div class="pattern-visual">${miniPatternSvg(['doubleThree','doubleFour','overline'][index], locale)}</div><span class="forbidden-code">${escapeHtml(item.code)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
      <section class="content-section dark-content"><div class="shell dark-content-grid"><div><p class="eyebrow">ORDER MATTERS</p><h2>${escapeHtml(r.precedenceTitle)}</h2></div><ol>${r.precedence.map((item)=>`<li><span>${escapeHtml(item)}</span></li>`).join('')}</ol></div></section>
      <section class="content-section"><div class="shell"><div class="section-heading"><p class="eyebrow">GLOSSARY</p><h2>${escapeHtml(r.glossaryTitle)}</h2></div><dl class="glossary-grid">${r.glossary.map((item)=>`<div><dt>${escapeHtml(item.term)}</dt><dd>${escapeHtml(item.definition)}</dd></div>`).join('')}</dl></div></section>
      <section class="content-section faq-section"><div class="shell faq-shell"><div class="section-heading"><p class="eyebrow">FAQ</p><h2>${escapeHtml(r.faqTitle)}</h2></div>${faqMarkup(r.faq)}</div></section>
      <section class="article-cta"><div class="shell article-cta-inner"><div><p class="eyebrow">PUT IT INTO PRACTICE</p><h2>${escapeHtml(c.common.actions.playNow)}</h2></div><a class="button button-light" href="${pagePath(locale, 'play')}">${icon('play',18)} ${escapeHtml(c.common.actions.playNow)}</a></div></section>
    </article>`;
  return pageShell({ siteUrl, locale, pageKey: 'rules', body });
}

function renderStrategy(siteUrl, locale) {
  const c = content[locale];
  const s = c.strategy;
  const aside = `<div class="strategy-aside">${miniPatternSvg('fourThree', locale)}<span>4—3</span></div>`;
  const body = `${articleHero(locale, 'strategy', s, { readTime: 10, aside })}
    <article class="article-body">
      <section class="content-section"><div class="shell"><div class="section-heading"><p class="eyebrow">DECISION ORDER</p><h2>${escapeHtml(s.priorityTitle)}</h2></div><div class="priority-grid">${s.priority.map((item)=>`<article><span>${escapeHtml(item.number)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
      <section class="content-section surface-section"><div class="shell"><div class="section-heading"><p class="eyebrow">PATTERN VALUE</p><h2>${escapeHtml(s.patternTitle)}</h2></div><div class="pattern-ranking">${s.patterns.map((item,index)=>`<article><div class="rank-mark">${escapeHtml(item.rank)}</div><div class="rank-board">${miniPatternSvg(index===0?'openFour':index===1?'fourThree':index===2?'openThree':'openThree', locale)}</div><div><span>${escapeHtml(item.power)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.text)}</p></div></article>`).join('')}</div></div></section>
      <section class="content-section"><div class="shell strategy-two-col"><div class="strategy-copy"><p class="eyebrow">OPENING</p><h2>${escapeHtml(s.openingTitle)}</h2><p>${escapeHtml(s.openingText)}</p><ul class="dot-list">${s.openingTips.map((tip)=>`<li>${escapeHtml(tip)}</li>`).join('')}</ul></div><div class="strategy-copy accent-copy"><p class="eyebrow">DEFENSE</p><h2>${escapeHtml(s.defenseTitle)}</h2><p>${escapeHtml(s.defenseText)}</p><ol>${s.defenseSteps.map((step)=>`<li>${escapeHtml(step)}</li>`).join('')}</ol></div></div></section>
      <section class="content-section dark-content"><div class="shell calculation-grid"><div><p class="eyebrow">CALCULATION</p><h2>${escapeHtml(s.readingTitle)}</h2><p>${escapeHtml(s.readingText)}</p></div><div class="formula-card"><span>${escapeHtml(s.readingFormula)}</span><div aria-hidden="true"><i></i>${icon('arrow',22)}<i></i>${icon('arrow',22)}<i></i></div></div></div></section>
      <section class="content-section"><div class="shell"><div class="section-heading"><p class="eyebrow">COMMON MISTAKES</p><h2>${escapeHtml(s.mistakesTitle)}</h2></div><div class="mistake-grid">${s.mistakes.map((item,index)=>`<article><span>0${index+1}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join('')}</div></div></section>
      <section class="content-section drill-section"><div class="shell drill-grid"><div><p class="eyebrow">30 SECOND DRILL</p><h2>${escapeHtml(s.drillTitle)}</h2></div><ol>${s.drill.map((item)=>`<li>${icon('check',17)}<span>${escapeHtml(item)}</span></li>`).join('')}</ol><a class="button button-primary" href="${pagePath(locale,'play')}">${icon('play',17)} ${escapeHtml(c.common.actions.playNow)}</a></div></section>
      <section class="content-section faq-section"><div class="shell faq-shell"><div class="section-heading"><p class="eyebrow">FAQ</p><h2>${escapeHtml(s.faqTitle)}</h2></div>${faqMarkup(s.faq)}</div></section>
    </article>`;
  return pageShell({ siteUrl, locale, pageKey: 'strategy', body });
}

function courseNav(locale, current) {
  const c = content[locale];
  const keys = ['beginner','intermediate','advanced'];
  return `<nav class="course-tabs" aria-label="${escapeHtml(c.common.nav.courses)}">${keys.map((key,index)=>`<a href="${pagePath(locale,key)}"${key===current?' aria-current="page"':''}><span>0${index+1}</span>${escapeHtml(c.common.nav[key])}</a>`).join('')}</nav>`;
}

function renderCourse(siteUrl, locale, pageKey) {
  const c = content[locale];
  const course = c.courses[pageKey];
  const index = ['beginner','intermediate','advanced'].indexOf(pageKey);
  const doneLabel = { ko: '완료', en: 'Done', zh: '完成' }[locale];
  const nextKey = index < 2 ? ['beginner','intermediate','advanced'][index+1] : 'play';
  const nextLabel = index < 2 ? c.common.actions.continueCourse : c.common.actions.playNow;
  const aside = `<div class="course-hero-card"><span>0${index+1}</span><strong>${escapeHtml(course.level)}</strong><small>${icon('clock',15)} ${escapeHtml(course.duration)}</small></div>`;
  const body = `${articleHero(locale, pageKey, course, { readTime: index === 0 ? 8 : index === 1 ? 11 : 14, aside })}
    <article class="article-body course-body" data-course="${pageKey}">
      <div class="shell">${courseNav(locale,pageKey)}</div>
      <section class="content-section course-overview"><div class="shell course-overview-grid"><div><p class="eyebrow">YOU WILL LEARN</p><h2>${escapeHtml(course.title)}</h2></div><ul class="check-list">${course.outcomes.map((item)=>`<li>${icon('check',17)}<span>${escapeHtml(item)}</span></li>`).join('')}</ul><div class="course-progress-card"><div><span data-progress-label>0 / ${course.lessons.length}</span><strong data-progress-percent>0%</strong></div><div class="progress-track"><i data-progress-bar></i></div></div></div></section>
      <section class="content-section surface-section lessons-section"><div class="shell"><div class="section-heading"><p class="eyebrow">LESSONS</p><h2>${course.lessons.length} ${escapeHtml(c.common.lesson)}</h2></div><div class="lesson-list">${course.lessons.map((lesson,lessonIndex)=>`<article class="lesson-card" data-lesson-card="${lesson.id}"><div class="lesson-number"><span>${escapeHtml(lesson.number)}</span><i></i></div><div class="lesson-content"><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.text)}</p><div class="lesson-tip">${icon('bulb',18)}<span>${escapeHtml(lesson.tip)}</span></div></div><button class="lesson-complete" type="button" data-lesson-id="${lesson.id}" aria-pressed="false"><span class="unchecked">${escapeHtml(c.common.lesson)} ${lessonIndex+1}</span><span class="checked">${icon('check',17)} ${escapeHtml(doneLabel)}</span></button></article>`).join('')}</div></div></section>
      <section class="content-section challenge-section"><div class="shell challenge-grid"><div class="challenge-mark"><span>${icon('trophy',28)}</span></div><div><p class="eyebrow">CHECKPOINT</p><h2>${escapeHtml(course.challengeTitle)}</h2><p>${escapeHtml(course.challengeText)}</p></div><ul>${course.checklist.map((item,checkIndex)=>`<li><label><input type="checkbox" data-checkpoint="${checkIndex}"><span>${icon('check',16)}</span><b>${escapeHtml(item)}</b></label></li>`).join('')}</ul><a class="button button-primary" href="${pagePath(locale,'play')}?difficulty=${pageKey}&course=${pageKey}">${icon('play',18)} ${escapeHtml(c.common.actions.playNow)}</a></div></section>
      <section class="course-next"><div class="shell course-next-inner"><div><p class="eyebrow">NEXT</p><h2>${escapeHtml(course.nextTitle)}</h2><p>${escapeHtml(course.nextText)}</p></div><a class="button button-light" href="${pagePath(locale,nextKey)}">${escapeHtml(nextLabel)} ${icon('arrow',18)}</a></div></section>
    </article>`;
  return pageShell({ siteUrl, locale, pageKey, body, bodyClass: `page-course page-course-${pageKey}`, extra: { scripts: '<script type="module" src="/assets/course-progress.js"></script>' } });
}

export function renderLocalizedPage(siteUrl, locale, pageKey) {
  if (!content[locale]) throw new Error(`Unknown locale: ${locale}`);
  switch (pageKey) {
    case 'home': return renderHome(siteUrl, locale);
    case 'play': return renderPlay(siteUrl, locale);
    case 'rules': return renderRules(siteUrl, locale);
    case 'strategy': return renderStrategy(siteUrl, locale);
    case 'beginner':
    case 'intermediate':
    case 'advanced': return renderCourse(siteUrl, locale, pageKey);
    default: throw new Error(`Unknown page: ${pageKey}`);
  }
}

export function renderLanguageHub(siteUrl) {
  const options = [
    { locale: 'ko', title: '오목을 시작하세요', text: 'AI 대국, 규칙, 전략과 단계별 한국어 코스' },
    { locale: 'en', title: 'Start playing Gomoku', text: 'AI matches, rules, strategy and structured courses in English' },
    { locale: 'zh', title: '开始五子棋学习', text: '中文AI对弈、规则、策略与分级课程' }
  ];
  const alternates = localeOrder.map((code)=>`<link rel="alternate" hreflang="${locales[code].hreflang}" href="${siteUrl}${pagePath(code,'home')}">`).join('\n');
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#181a27">
    <title>FIVEGRID | Gomoku · 오목 · 五子棋</title><meta name="description" content="Choose Korean, English or Simplified Chinese to play Gomoku online against AI and learn rules and strategy.">
    <meta name="robots" content="index,follow"><link rel="canonical" href="${siteUrl}/"><link rel="alternate" type="application/rss+xml" title="${SITE_NAME} RSS" href="${siteUrl}/rss.xml">${alternates}<link rel="alternate" hreflang="x-default" href="${siteUrl}/">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/icon-192.png"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/styles.css">
    <meta property="og:title" content="FIVEGRID | Gomoku · 오목 · 五子棋"><meta property="og:description" content="Play and learn five in a row in Korean, English or Chinese."><meta property="og:image" content="${siteUrl}/assets/og-cover.png"><meta property="og:url" content="${siteUrl}/"><meta property="og:type" content="website">
  </head><body class="language-hub-page"><main class="language-hub"><div class="hub-board" aria-hidden="true">${boardPreviewSvg()}</div><div class="hub-content"><a class="brand hub-brand" href="/">${logoMarkup('en')}</a><p class="eyebrow">CHOOSE YOUR LANGUAGE</p><h1>Gomoku · 오목 · 五子棋</h1><p>Play against three AI levels and learn the game step by step. Select a language to continue.</p><div class="language-card-grid">${options.map((option)=>`<a href="${pagePath(option.locale,'home')}" lang="${locales[option.locale].htmlLang}" hreflang="${locales[option.locale].hreflang}"><span>${escapeHtml(locales[option.locale].shortLabel)}</span><div><strong>${escapeHtml(option.title)}</strong><small>${escapeHtml(option.text)}</small></div>${icon('arrow',20)}</a>`).join('')}</div><small class="hub-note">No account · No database · Mobile ready</small></div></main><script src="/assets/site.js" defer></script></body></html>`;
}

export function render404(siteUrl) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found - FIVEGRID</title><link rel="stylesheet" href="/assets/styles.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"></head><body class="not-found-page"><main class="not-found"><div class="not-found-mark"><span>4</span><i></i><span>4</span></div><h1>That intersection is empty.</h1><p>The page may have moved. Choose a language and return to the board.</p><div><a class="button button-primary" href="/ko/">한국어</a><a class="button button-ghost" href="/en/">English</a><a class="button button-ghost" href="/zh/">简体中文</a></div></main></body></html>`;
}
