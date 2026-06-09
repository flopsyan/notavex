'use strict';

// Minimal i18n for the standalone login page (the SPA has its own copy).
const STRINGS = {
  en: {
    login_sub: 'Enter your password to continue.',
    login_password: 'Password',
    login_signin: 'Sign in',
    login_wrong: 'Wrong password.',
    login_failed: 'Sign in failed.',
    login_network: 'Network error. Please try again.',
  },
  de: {
    login_sub: 'Gib dein Passwort ein, um fortzufahren.',
    login_password: 'Passwort',
    login_signin: 'Anmelden',
    login_wrong: 'Falsches Passwort.',
    login_failed: 'Anmeldung fehlgeschlagen.',
    login_network: 'Netzwerkfehler. Bitte versuche es erneut.',
  },
};

function detectLang() {
  try {
    const stored = localStorage.getItem('notavex-lang');
    if (stored === 'en' || stored === 'de') return stored;
  } catch (e) { /* localStorage unavailable */ }
  const langs = navigator.languages && navigator.languages.length
    ? navigator.languages : [navigator.language || 'en'];
  return langs.some((l) => /^de\b/i.test(l)) ? 'de' : 'en';
}

const lang = detectLang();
const t = (key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;

document.documentElement.lang = lang;
document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });

const form = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('login-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    if (res.ok) {
      window.location.href = '/';
      return;
    }
    errorBox.textContent = res.status === 401 ? t('login_wrong') : t('login_failed');
    errorBox.hidden = false;
    passwordInput.select();
  } catch (err) {
    errorBox.textContent = t('login_network');
    errorBox.hidden = false;
  }
});
