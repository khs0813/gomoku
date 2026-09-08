export const SITE_NAME = 'FIVEGRID';
export const DEFAULT_SITE_URL = 'https://fivegrid-omok.onrender.com';
export const BUILD_DATE = '2026-08-17';
export const GOOGLE_ADSENSE_ACCOUNT = 'ca-pub-7766989656523085';

export const localeOrder = ['ko', 'en', 'zh'];

export const locales = {
  ko: {
    code: 'ko',
    htmlLang: 'ko-KR',
    hreflang: 'ko',
    label: '한국어',
    shortLabel: 'KO',
    dir: 'ltr',
    gameName: '오목',
    dateLocale: 'ko-KR'
  },
  en: {
    code: 'en',
    htmlLang: 'en',
    hreflang: 'en',
    label: 'English',
    shortLabel: 'EN',
    dir: 'ltr',
    gameName: 'Gomoku',
    dateLocale: 'en-US'
  },
  zh: {
    code: 'zh',
    htmlLang: 'zh-Hans',
    hreflang: 'zh-Hans',
    label: '简体中文',
    shortLabel: '中文',
    dir: 'ltr',
    gameName: '五子棋',
    dateLocale: 'zh-CN'
  }
};

export const pages = [
  { key: 'home', slug: '' },
  { key: 'play', slug: 'play' },
  { key: 'rules', slug: 'rules' },
  { key: 'strategy', slug: 'strategy' },
  { key: 'beginner', slug: 'course/beginner' },
  { key: 'intermediate', slug: 'course/intermediate' },
  { key: 'advanced', slug: 'course/advanced' }
];

export function normalizeSiteUrl(input) {
  const value = (input || DEFAULT_SITE_URL).trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function localizedPath(locale, slug = '') {
  return `/${locale}/${slug ? `${slug}/` : ''}`;
}

export function pagePath(locale, pageKey) {
  const page = pages.find((item) => item.key === pageKey);
  if (!page) throw new Error(`Unknown page key: ${pageKey}`);
  return localizedPath(locale, page.slug);
}
