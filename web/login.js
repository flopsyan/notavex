'use strict';

// Minimal i18n for the standalone login page (the SPA has its own copy).
const STRINGS = {
  en: {
    login_sub: 'Sign in to continue.',
    login_user: 'Username',
    login_password: 'Password',
    login_signin: 'Sign in',
    login_wrong: 'Wrong username or password.',
    login_rate: 'Too many failed attempts. Please try again later.',
    login_failed: 'Sign in failed.',
    login_network: 'Network error. Please try again.',
  },
  de: {
    login_sub: 'Melde dich an, um fortzufahren.',
    login_user: 'Benutzername',
    login_password: 'Passwort',
    login_signin: 'Anmelden',
    login_wrong: 'Benutzername oder Passwort falsch.',
    login_rate: 'Zu viele Fehlversuche. Bitte versuche es später erneut.',
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
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorBox = document.getElementById('login-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value }),
    });
    if (res.ok) {
      window.location.href = '/';
      return;
    }
    errorBox.textContent = res.status === 401 ? t('login_wrong')
      : res.status === 429 ? t('login_rate') : t('login_failed');
    errorBox.hidden = false;
    passwordInput.select();
  } catch (err) {
    errorBox.textContent = t('login_network');
    errorBox.hidden = false;
  }
});
