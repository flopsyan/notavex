'use strict';

// Applies the saved theme and language to <html> before first paint, so there
// is no flash of the wrong theme. Kept as an external file (not inline) to
// satisfy the strict Content-Security-Policy (script-src 'self').
(function () {
  try {
    var theme = localStorage.getItem('notavex-theme');
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    var l = localStorage.getItem('notavex-lang');
    if (l === 'de' || l === 'en') document.documentElement.setAttribute('lang', l);
  } catch (e) { /* localStorage unavailable */ }
})();
