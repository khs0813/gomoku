(() => {
  document.documentElement.classList.add('js');

  const localeMatch = location.pathname.match(/^\/(ko|en|zh)(?:\/|$)/);
  if (localeMatch) {
    try { localStorage.setItem('fivegrid:last-locale', localeMatch[1]); } catch { /* storage can be unavailable */ }
  }

  document.addEventListener('click', (event) => {
    document.querySelectorAll('details[open].language-menu, details[open].nav-popover').forEach((details) => {
      if (!details.contains(event.target)) details.removeAttribute('open');
    });

    const link = event.target.closest('.mobile-menu-panel a');
    if (link) link.closest('details')?.removeAttribute('open');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {
        // The site remains fully usable without offline caching.
      });
    });
  }
})();
