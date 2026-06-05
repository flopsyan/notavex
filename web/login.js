'use strict';

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
    const data = await res.json().catch(() => ({}));
    errorBox.textContent = data.error || 'Sign in failed.';
    errorBox.hidden = false;
    passwordInput.select();
  } catch (err) {
    errorBox.textContent = 'Network error. Please try again.';
    errorBox.hidden = false;
  }
});
