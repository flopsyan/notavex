'use strict';

// ===================================================================
// Notavex — Google Keep-style notes UI
// ===================================================================

// ===================================================================
// i18n (English / German). The default language follows the browser/system
// language (German for "de…", English otherwise) until the user picks one in
// Settings, which is stored in localStorage. README/code stay English; only the
// UI is translated. Note content is user data and shown as entered.
// ===================================================================

const STRINGS = {
  en: {
    menu_toggle: 'Toggle menu',
    search_ph: 'Search your notes',
    account_menu: 'Account',
    menu_account: 'Account',
    menu_settings: 'Settings',
    logout: 'Log out',
    nav_labels: 'Labels',
    section_pinned: 'Pinned',
    section_others: 'Others',
    // composer
    composer_take_note: 'Take a note…',
    composer_title: 'Title',
    composer_note: 'Take a note…  (Markdown & tables supported)',
    composer_new_list: 'New list',
    composer_new_numlist: 'New numbered list',
    add_label: 'Add label',
    checklist: 'Checklist',
    image_add: 'Add image',
    image_remove: 'Remove image',
    preview: 'Preview',
    edit: 'Edit',
    close: 'Close',
    nothing_preview: 'Nothing to preview.',
    // views + labels
    view_notes: 'Notes',
    view_archive: 'Archive',
    view_trash: 'Trash',
    no_labels: 'No labels yet',
    label_note: 'Label note',
    create_label: 'Create label',
    list_item: 'List item',
    list_item_hint: 'Tip: start a line with ## to add a subheading',
    delete_item: 'Delete item',
    delete_heading: 'Delete subheading',
    drag_reorder: 'Drag to reorder',
    remove_label: 'Remove label',
    // card actions
    pin: 'Pin',
    unpin: 'Unpin',
    bg_color: 'Background color',
    archive: 'Archive',
    unarchive: 'Unarchive',
    more: 'More',
    restore: 'Restore',
    delete_forever: 'Delete forever',
    make_copy: 'Make a copy',
    delete: 'Delete',
    completed_one: '{n} completed item',
    completed_many: '{n} completed items',
    // board / empty / confirms
    trash_note: 'Notes in Trash are deleted after they are emptied.',
    empty_trash: 'Empty trash',
    empty_no_match: 'No matching notes.',
    empty_archive: 'Your archive is empty.',
    empty_trash_state: 'Trash is empty.',
    empty_notes: 'Notes you add appear here.',
    confirm_delete_forever: 'Delete this note forever? This cannot be undone.',
    confirm_empty_trash: 'Empty trash? All notes in trash will be permanently deleted.',
    // relative time
    just_now: 'just now',
    minutes_ago: '{n}m ago',
    hours_ago: '{n}h ago',
    days_ago: '{n}d ago',
    // colors
    color_default: 'Default',
    color_coral: 'Coral',
    color_peach: 'Peach',
    color_sand: 'Sand',
    color_mint: 'Mint',
    color_sage: 'Sage',
    color_fog: 'Fog',
    color_storm: 'Storm',
    color_dusk: 'Dusk',
    color_blossom: 'Blossom',
    color_clay: 'Clay',
    color_chalk: 'Chalk',
    // settings dialog
    settings_title: 'Settings',
    appearance: 'Appearance',
    color_theme: 'Color theme',
    theme_system: 'System',
    theme_light: 'Light',
    theme_dark: 'Dark',
    language: 'Language',
    // account dialog
    account_title: 'Account',
    change_password: 'Change password',
    current_password: 'Current password',
    new_password: 'New password',
    confirm_password: 'Confirm password',
    save: 'Save',
    cancel: 'Cancel',
    pw_changed: 'Password changed.',
    pw_mismatch: 'New passwords do not match.',
    pw_too_short: 'Password too short (min. 4 characters).',
    pw_wrong_current: 'Current password is wrong.',
    pw_required: 'Please fill in all fields.',
    pw_error: 'Could not change the password.',
    // account / users management
    account_username: 'Username',
    username_locked: 'Your username is your login and cannot be changed.',
    display_name: 'Display name',
    display_name_ph: 'shown in your account (optional)',
    password_optional: 'Leave the password fields empty to keep your current password.',
    saved: 'Saved.',
    login_user: 'Username',
    login_password: 'Password',
    users_title: 'Users',
    users_sub: 'Only admins can add or remove accounts.',
    role_admin: 'Admin',
    you: 'you',
    add_user: 'Add user',
    new_username_ph: 'e.g. anna',
    remove: 'Remove',
    confirm_delete_user: 'Remove this user?',
    confirm_delete_self: 'Remove your own account? You will be logged out.',
    err_invalid_username: 'Invalid username (2–32 chars: letters, numbers, . _ -).',
    err_taken: 'Username already taken.',
    err_last_user: 'Cannot remove the last account.',
    err_last_admin: 'Cannot remove the last admin account.',
    err_generic: 'Something went wrong.',
  },
  de: {
    menu_toggle: 'Menü ein-/ausklappen',
    search_ph: 'Notizen durchsuchen',
    account_menu: 'Konto',
    menu_account: 'Konto',
    menu_settings: 'Einstellungen',
    logout: 'Abmelden',
    nav_labels: 'Labels',
    section_pinned: 'Angepinnt',
    section_others: 'Sonstige',
    composer_take_note: 'Notiz schreiben…',
    composer_title: 'Titel',
    composer_note: 'Notiz schreiben…  (Markdown & Tabellen werden unterstützt)',
    composer_new_list: 'Neue Liste',
    composer_new_numlist: 'Neue nummerierte Liste',
    add_label: 'Label hinzufügen',
    checklist: 'Checkliste',
    image_add: 'Bild hinzufügen',
    image_remove: 'Bild entfernen',
    preview: 'Vorschau',
    edit: 'Bearbeiten',
    close: 'Schließen',
    nothing_preview: 'Nichts zum Anzeigen.',
    view_notes: 'Notizen',
    view_archive: 'Archiv',
    view_trash: 'Papierkorb',
    no_labels: 'Noch keine Labels',
    label_note: 'Notiz mit Label versehen',
    create_label: 'Label erstellen',
    list_item: 'Listeneintrag',
    list_item_hint: 'Tipp: Beginne eine Zeile mit ## für eine Zwischenüberschrift',
    delete_item: 'Eintrag löschen',
    delete_heading: 'Zwischenüberschrift löschen',
    drag_reorder: 'Zum Umsortieren ziehen',
    remove_label: 'Label entfernen',
    pin: 'Anpinnen',
    unpin: 'Lösen',
    bg_color: 'Hintergrundfarbe',
    archive: 'Archivieren',
    unarchive: 'Aus dem Archiv',
    more: 'Mehr',
    restore: 'Wiederherstellen',
    delete_forever: 'Endgültig löschen',
    make_copy: 'Kopie erstellen',
    delete: 'Löschen',
    completed_one: '{n} erledigter Eintrag',
    completed_many: '{n} erledigte Einträge',
    trash_note: 'Notizen im Papierkorb werden beim Leeren gelöscht.',
    empty_trash: 'Papierkorb leeren',
    empty_no_match: 'Keine passenden Notizen.',
    empty_archive: 'Dein Archiv ist leer.',
    empty_trash_state: 'Der Papierkorb ist leer.',
    empty_notes: 'Notizen, die du hinzufügst, erscheinen hier.',
    confirm_delete_forever: 'Diese Notiz endgültig löschen? Das kann nicht rückgängig gemacht werden.',
    confirm_empty_trash: 'Papierkorb leeren? Alle Notizen im Papierkorb werden endgültig gelöscht.',
    just_now: 'gerade eben',
    minutes_ago: 'vor {n} Min.',
    hours_ago: 'vor {n} Std.',
    days_ago: 'vor {n} T.',
    color_default: 'Standard',
    color_coral: 'Koralle',
    color_peach: 'Pfirsich',
    color_sand: 'Sand',
    color_mint: 'Minze',
    color_sage: 'Salbei',
    color_fog: 'Nebel',
    color_storm: 'Sturm',
    color_dusk: 'Dämmerung',
    color_blossom: 'Blüte',
    color_clay: 'Lehm',
    color_chalk: 'Kreide',
    settings_title: 'Einstellungen',
    appearance: 'Darstellung',
    color_theme: 'Farbschema',
    theme_system: 'System',
    theme_light: 'Hell',
    theme_dark: 'Dunkel',
    language: 'Sprache',
    account_title: 'Konto',
    change_password: 'Passwort ändern',
    current_password: 'Aktuelles Passwort',
    new_password: 'Neues Passwort',
    confirm_password: 'Passwort bestätigen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    pw_changed: 'Passwort geändert.',
    pw_mismatch: 'Die neuen Passwörter stimmen nicht überein.',
    pw_too_short: 'Passwort zu kurz (mind. 4 Zeichen).',
    pw_wrong_current: 'Aktuelles Passwort ist falsch.',
    pw_required: 'Bitte alle Felder ausfüllen.',
    pw_error: 'Passwort konnte nicht geändert werden.',
    // Konto / Benutzerverwaltung
    account_username: 'Benutzername',
    username_locked: 'Dein Benutzername ist dein Login und nicht änderbar.',
    display_name: 'Anzeigename',
    display_name_ph: 'wird in deinem Konto angezeigt (optional)',
    password_optional: 'Lass die Passwortfelder leer, um dein Passwort nicht zu ändern.',
    saved: 'Gespeichert.',
    login_user: 'Benutzername',
    login_password: 'Passwort',
    users_title: 'Benutzer',
    users_sub: 'Nur Admins können Konten anlegen oder entfernen.',
    role_admin: 'Admin',
    you: 'du',
    add_user: 'Benutzer anlegen',
    new_username_ph: 'z. B. anna',
    remove: 'Entfernen',
    confirm_delete_user: 'Diesen Benutzer entfernen?',
    confirm_delete_self: 'Dein eigenes Konto entfernen? Du wirst abgemeldet.',
    err_invalid_username: 'Ungültiger Benutzername (2–32 Zeichen: Buchstaben, Zahlen, . _ -).',
    err_taken: 'Benutzername bereits vergeben.',
    err_last_user: 'Der letzte Account kann nicht entfernt werden.',
    err_last_admin: 'Der letzte Admin-Account kann nicht entfernt werden.',
    err_generic: 'Etwas ist schiefgelaufen.',
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

let lang = detectLang();

// t(key, vars?) -> translated string with optional {name} interpolation.
function t(key, vars) {
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
  return s;
}

// Translate the static markup carrying data-i18n* attributes.
function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// Persist a language choice and reload so every string is re-rendered.
function setLang(next) {
  if (next !== 'en' && next !== 'de') return;
  try { localStorage.setItem('notavex-lang', next); } catch (e) { /* ignore */ }
  if (next !== lang) location.reload();
}

const COLORS = [
  { name: '', label: 'color_default' },
  { name: 'coral', label: 'color_coral' },
  { name: 'peach', label: 'color_peach' },
  { name: 'sand', label: 'color_sand' },
  { name: 'mint', label: 'color_mint' },
  { name: 'sage', label: 'color_sage' },
  { name: 'fog', label: 'color_fog' },
  { name: 'storm', label: 'color_storm' },
  { name: 'dusk', label: 'color_dusk' },
  { name: 'blossom', label: 'color_blossom' },
  { name: 'clay', label: 'color_clay' },
  { name: 'chalk', label: 'color_chalk' },
];

const MAX_IMAGES = 12;       // keep in sync with the server's maxImages
const IMAGE_MAX_EDGE = 1600; // longest edge after in-browser downscale

// view: 'active' | 'archived' | 'trash'; user: the logged-in account or null
const state = { authEnabled: false, user: null, all: [], query: '', label: '', view: 'active' };

// Composer scratch state (reset after each note is committed).
let composerColor = '';
let composerLabels = [];
let composerChecklist = false;
let composerItems = []; // [{checked,text}] when the composer is in checklist mode
let composerImages = []; // data URLs of images attached to the note being drafted

let labels = []; // [{name, count}] from /api/labels

let grids = []; // [{ container, cards }] — kept so we can re-layout on resize

// ---------- DOM refs ----------
const $ = (s) => document.querySelector(s);
const searchInput = $('#search');
const accountWrap = $('#account');
const accountBtn = $('#account-btn');
const accountMenu = $('#account-menu');
const accountProfileBtn = $('#account-profile');
const accountSettingsBtn = $('#account-settings');
const accountLogoutBtn = $('#account-logout');
const accountCard = $('#account-card');
const accountCardName = $('#account-card-name');
const accountCardSub = $('#account-card-sub');
const navToggle = $('#nav-toggle');
const sidebar = $('#sidebar');
const scrim = $('#scrim');
const navList = $('#nav-views');
const labelList = $('#label-list');
const composer = $('#composer');
const composerCollapsed = $('#composer-collapsed');
const composerNewList = $('#composer-newlist');
const composerNewNumList = $('#composer-newnumlist');
const composerImageCollapsed = $('#composer-image-collapsed');
const composerTitle = $('#composer-title');
const editor = $('#editor');
const composerChecklistEl = $('#composer-checklist');
const composerImagesEl = $('#composer-images');
const composerImageBtn = $('#composer-image-btn');
const composerImageFile = $('#composer-image-file');
const composerColorsEl = $('#composer-colors');
const composerLabelBtn = $('#composer-label-btn');
const composerListBtn = $('#composer-list-btn');
const composerPreviewBtn = $('#composer-preview-btn');
const composerCloseBtn = $('#composer-close');
const composerPreviewBox = $('#composer-preview');
const composerChips = $('#composer-chips');
const boardActions = $('#board-actions');
const pinnedSection = $('#pinned-section');
const pinnedGrid = $('#pinned-grid');
const othersLabel = $('#others-label');
const othersGrid = $('#others-grid');
const emptyEl = $('#empty');

// ===================================================================
// Icons — colorless inline SVGs (Material-Symbols-style outline).
// All use currentColor so theme switching "just works".
// ===================================================================

const ICONS = {
  // top bar / nav
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  logo: '<path d="M5 4h11l3 3v13H5z"/><path d="M9 12l2 2 4-4"/>',
  moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
  logout: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
  person: '<circle cx="12" cy="8" r="3.4"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V13z"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 16l-5-5-4 4-2-2-4 4"/>',
  notes: '<path d="M5 4h14v14l-4 2H5z"/><path d="M15 20v-4h4"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8"/><path d="M10 12h4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
  label: '<path d="M4 5h8l8 7-8 7H4z"/><circle cx="8" cy="12" r="1.3"/>',
  // card / composer actions
  pin: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 14v7"/>',
  pinFilled: '<path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z" fill="currentColor" stroke="none"/><path d="M12 14v7"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.6-.2-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .9-1.8 1.9-1.8H17a4 4 0 0 0 4-4c0-3.9-4-6.7-9-6.7z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8" r="1"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 6l4 4"/>',
  more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  unarchive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11h14V8"/><path d="M12 16v-5"/><path d="M9.5 13L12 10.5 14.5 13"/>',
  restore: '<path d="M4 12a8 8 0 1 1 2.3 5.6"/><path d="M4 20v-5h5"/>',
  // misc
  check: '<path d="M5 12l4 4L19 6"/>',
  checklist: '<path d="M4 6l1.5 1.5L8 5"/><path d="M4 12l1.5 1.5L8 11"/><path d="M4 18l1.5 1.5L8 17"/><path d="M11 6h9"/><path d="M11 12h9"/><path d="M11 18h9"/>',
  listNumbered: '<path d="M11 6h9"/><path d="M11 12h9"/><path d="M11 18h9"/><path d="M6 10V4L4 5.5"/><path d="M4 15.2a1.5 1.5 0 1 1 2.6 1L4 20h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  drag: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
};

// icon(name, size) -> inline <svg> string using currentColor.
function icon(name, size = 20) {
  const body = ICONS[name] || '';
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
    `stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`;
}

// ---------- small helpers ----------

async function api(method, path, body, extra) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  // keepalive lets a small save (checklist text, title) survive page unload so
  // Ctrl+W / navigation doesn't drop it. Not for image saves (64KB cap).
  if (extra && extra.keepalive) opts.keepalive = true;
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function formatRelative(iso) {
  const d = new Date(iso);
  const secs = (Date.now() - d.getTime()) / 1000;
  if (secs < 45) return t('just_now');
  if (secs < 3600) return t('minutes_ago', { n: Math.round(secs / 60) });
  if (secs < 86400) return t('hours_ago', { n: Math.round(secs / 3600) });
  if (secs < 604800) return t('days_ago', { n: Math.round(secs / 86400) });
  return d.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

// Replace the textarea's [from, to) range with `text`, leaving the caret at the
// end of the inserted text. Resizes and notifies input listeners.
function spliceTextarea(ta, from, to, text) {
  const v = ta.value;
  ta.value = v.slice(0, from) + text + v.slice(to);
  ta.selectionStart = ta.selectionEnd = from + text.length;
  autosize(ta);
  ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// On Enter inside a Markdown list, start the next item automatically (Google Keep
// style):
//   "- item"      -> new "- " line
//   "- [ ] item"  -> new "- [ ] " line   (task lists)
//   "1. item"     -> new "2. " line       (numbering continues)
// Pressing Enter on an otherwise-empty marker ("- ", "1. ", "- [ ] ") clears it
// and leaves the list. Returns true when it handled the key (caller preventDefaults).
function continueListOnEnter(ta) {
  if (ta.selectionStart !== ta.selectionEnd) return false; // active selection: leave default
  const pos = ta.selectionStart;
  const lineStart = ta.value.lastIndexOf('\n', pos - 1) + 1;
  const line = ta.value.slice(lineStart, pos);

  // Task list (check before the plain-bullet rule, which it also matches).
  let m = line.match(/^(\s*)([-*+])\s+\[([ xX])\]\s*(.*)$/);
  if (m) {
    if (m[4].trim() === '') { spliceTextarea(ta, lineStart, pos, m[1]); return true; }
    spliceTextarea(ta, pos, pos, `\n${m[1]}${m[2]} [ ] `);
    return true;
  }

  // Bullet list.
  m = line.match(/^(\s*)([-*+])\s+(.*)$/);
  if (m) {
    if (m[3].trim() === '') { spliceTextarea(ta, lineStart, pos, m[1]); return true; }
    spliceTextarea(ta, pos, pos, `\n${m[1]}${m[2]} `);
    return true;
  }

  // Ordered list — continue the numbering.
  m = line.match(/^(\s*)(\d+)([.)])\s+(.*)$/);
  if (m) {
    if (m[4].trim() === '') { spliceTextarea(ta, lineStart, pos, m[1]); return true; }
    const next = parseInt(m[2], 10) + 1;
    spliceTextarea(ta, pos, pos, `\n${m[1]}${next}${m[3]} `);
    return true;
  }

  return false;
}

// True for clicks that should NOT collapse the composer or any popover:
// detached nodes (e.g. a swatch removed mid-click) and anything inside a popover.
function isProtectedClick(e) {
  return !e.target.isConnected || !!e.target.closest('.popover');
}

// ===================================================================
// Markdown rendering (safe: all input is HTML-escaped first, only a fixed
// set of tags is emitted, and link/image URLs are sanitized).
// ===================================================================

const PH = String.fromCharCode(0); // placeholder sentinel — cannot occur in user input

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sanitizeUrl(url) {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|\/|#|\.\.?\/)/i.test(u)) return u;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // relative path (no scheme)
  return '#';
}

function renderInline(text) {
  // `text` is already HTML-escaped. Protect inline code spans first.
  const codeSpans = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codeSpans.push(c);
    return PH + 'c' + (codeSpans.length - 1) + PH;
  });

  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^)]*?)&quot;)?\)/g,
    (_, alt, url, title) =>
      `<img src="${sanitizeUrl(url)}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`);

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^)]*?)&quot;)?\)/g,
    (_, label, url, title) =>
      `<a href="${sanitizeUrl(url)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${label}</a>`);

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // Hashtags render as styled spans but are purely visual — labels are explicit
  // (set via the label UI), never parsed from text.
  text = text.replace(/(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu,
    (_, pre, tag) => `${pre}<span class="hashtag">#${tag}</span>`);

  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  const restore = new RegExp(PH + 'c(\\d+)' + PH, 'g');
  return text.replace(restore, (_, i) => `<code>${codeSpans[+i]}</code>`);
}

// GFM pipe table. `lines` is the slice of raw source lines forming the table
// (header, separator, body...). Returns HTML or null if it isn't a valid table.
function renderTable(lines) {
  if (lines.length < 2) return null;
  const splitRow = (l) => {
    let s = l.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    // Split on unescaped pipes, then un-escape "\|".
    return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim());
  };
  const sep = lines[1].trim();
  if (!/^\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?$/.test(sep)) return null;

  const aligns = splitRow(lines[1]).map((c) => {
    const left = c.startsWith(':'), right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });

  const cell = (tag, txt, i) => {
    const a = aligns[i] ? ` style="text-align:${aligns[i]}"` : '';
    return `<${tag}${a}>${renderInline(escapeHtml(txt))}</${tag}>`;
  };

  const head = splitRow(lines[0]);
  let html = '<div class="table-wrap"><table><thead><tr>';
  head.forEach((c, i) => { html += cell('th', c, i); });
  html += '</tr></thead><tbody>';
  for (let r = 2; r < lines.length; r++) {
    const cells = splitRow(lines[r]);
    html += '<tr>';
    for (let i = 0; i < head.length; i++) html += cell('td', cells[i] || '', i);
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function renderMarkdown(src) {
  if (!src) return '';
  src = src.replace(/\r\n?/g, '\n');

  const blocks = [];
  src = src.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return PH + 'b' + (blocks.length - 1) + PH;
  });
  const tokenRe = new RegExp('^' + PH + 'b(\\d+)' + PH + '$');
  const blockToken = (l) => tokenRe.exec(l.trim());

  const lines = src.split('\n');
  const isTableSep = (l) => /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)+\|?\s*$/.test(l);
  const isTableRow = (l) => l.includes('|') && l.trim() !== '';
  const isBreak = (l) =>
    l.trim() === '' || blockToken(l) ||
    /^(#{1,6})\s+/.test(l) || /^\s*>/.test(l) ||
    /^\s*[-*+]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);

  let html = '';
  let i = 0;
  let taskIndex = 0; // running index of task checkboxes in document order
  while (i < lines.length) {
    const line = lines[i];
    const tok = blockToken(line);

    if (tok) { html += blocks[+tok[1]]; i++; continue; }
    if (line.trim() === '') { i++; continue; }

    // GFM pipe table: a "| ... |" row immediately followed by a separator row.
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const tbl = [line, lines[i + 1]];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isTableSep(lines[j])) {
        tbl.push(lines[j]);
        j++;
      }
      const out = renderTable(tbl);
      if (out) { html += out; i = j; continue; }
    }

    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      html += `<h${level}>${renderInline(escapeHtml(m[2].trim()))}</h${level}>`;
      i++; continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { html += '<hr>'; i++; continue; }

    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      html += `<blockquote>${renderMarkdown(quote.join('\n'))}</blockquote>`;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      let items = '';
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const item = lines[i].replace(/^\s*[-*+]\s+/, '');
        const task = item.match(/^\[([ xX])\]\s*(.*)$/);
        if (task) {
          const checked = task[1].toLowerCase() === 'x' ? ' checked' : '';
          items += `<li class="task"><input type="checkbox" data-task="${taskIndex}"${checked}> ${renderInline(escapeHtml(task[2]))}</li>`;
          taskIndex++;
        } else {
          items += `<li>${renderInline(escapeHtml(item))}</li>`;
        }
        i++;
      }
      html += `<ul>${items}</ul>`;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      let items = '';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items += `<li>${renderInline(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, '')))}</li>`;
        i++;
      }
      html += `<ol>${items}</ol>`;
      continue;
    }

    const para = [];
    while (i < lines.length && !isBreak(lines[i])) {
      para.push(renderInline(escapeHtml(lines[i])));
      i++;
    }
    html += `<p>${para.join('<br>')}</p>`;
  }

  const restore = new RegExp(PH + 'b(\\d+)' + PH, 'g');
  return html.replace(restore, (full, idx) => (blocks[+idx] !== undefined ? blocks[+idx] : full));
}

// Pure helper: flip the Nth (0-based, document order) task line's [ ]/[x] in
// `content`. Returns the new content (unchanged if index is out of range).
// Phase B reuses this for its checklist component.
function toggleTaskInContent(content, taskIndex) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  let inFence = false;
  let n = 0;
  for (let k = 0; k < lines.length; k++) {
    if (/^\s*```/.test(lines[k])) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = lines[k].match(/^(\s*[-*+]\s+\[)([ xX])(\].*)$/);
    if (!m) continue;
    if (n === taskIndex) {
      const next = m[2].toLowerCase() === 'x' ? ' ' : 'x';
      lines[k] = m[1] + next + m[3];
      return lines.join('\n');
    }
    n++;
  }
  return content;
}

// ===================================================================
// Checklist model (Phase B) — markdown lines as structured entries. An entry is
// either an item ({checked, text}, stored "- [ ] x" / "- [x] x") or a subheading
// ({heading: true, text}, stored "## x"). Subheadings split the list into
// sections; the canonical order keeps unchecked items first then checked items
// WITHIN EACH section (a heading-free list is a single section — the original
// global invariant). The pure helpers below preserve that order so the card
// preview, the modal and a reload always agree. Because content is always stored
// canonically, document order == display order, so every helper addresses an
// entry by its index in parseChecklist(content).
// ===================================================================

// parseChecklist(content) -> entries in document order: {heading:true, text} for
// "## x" lines, {checked, text} for "- [ ] x" / "- [x] x" task lines (fenced
// code is ignored, matching toggleTaskInContent). Any other line is dropped.
function parseChecklist(content) {
  const lines = (content || '').replace(/\r\n?/g, '\n').split('\n');
  const items = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) {
      const text = h[1].trim();
      if (text) items.push({ heading: true, text });
      continue;
    }
    const m = line.match(/^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/);
    if (!m) continue;
    items.push({ checked: m[1].toLowerCase() === 'x', text: m[2] });
  }
  return items;
}

// buildChecklistContent(entries) -> markdown. Headings stay put and act as
// section dividers; within each section a stable partition puts unchecked items
// first then checked, regardless of the input order.
function buildChecklistContent(entries) {
  const out = [];
  let section = []; // items collected since the last heading
  const flush = () => {
    const unchecked = section.filter((it) => !it.checked);
    const checked = section.filter((it) => it.checked);
    for (const it of [...unchecked, ...checked]) {
      out.push(`- [${it.checked ? 'x' : ' '}] ${it.text}`);
    }
    section = [];
  };
  for (const e of entries) {
    if (e.heading) { flush(); out.push(`## ${e.text}`); } else section.push(e);
  }
  flush();
  return out.join('\n');
}

// Toggle the item at entry-index `index`. Because content is stored
// unchecked-first per section, the stable partition in buildChecklistContent
// sinks a newly-checked item to the TOP of its section's completed run and
// floats a newly-unchecked item to the BOTTOM of its unchecked run. An index
// that misses or lands on a heading is a no-op.
function toggleChecklistItem(content, index) {
  const entries = parseChecklist(content);
  const target = entries[index];
  if (!target || target.heading) return content;
  target.checked = !target.checked;
  return buildChecklistContent(entries);
}

// Append a new unchecked item to the bottom of the LAST section's unchecked run.
function appendChecklistItem(content, text) {
  const entries = parseChecklist(content);
  entries.push({ checked: false, text });
  return buildChecklistContent(entries);
}

// Append a new subheading, starting a fresh section at the end of the list.
function appendChecklistHeading(content, text) {
  const entries = parseChecklist(content);
  entries.push({ heading: true, text });
  return buildChecklistContent(entries);
}

// Remove the entry (item or heading) at entry-index `index`. Dropping a heading
// merges its items into the section above.
function removeChecklistItem(content, index) {
  const entries = parseChecklist(content);
  if (index < 0 || index >= entries.length) return content;
  entries.splice(index, 1);
  return buildChecklistContent(entries);
}

// Interpret a string typed into an add row: a leading "##" (markdown heading)
// makes a subheading, anything else a plain unchecked item.
function parseAddEntry(text) {
  const h = text.match(/^#{1,6}\s+(.*)$/);
  const headingText = h && h[1].trim();
  return headingText ? { heading: true, text: headingText } : { heading: false, text };
}

// Replace the text of the entry at `index` (newlines collapse to spaces). Empty
// text removes the entry — clearing an item deletes it, Google Keep style.
function setChecklistEntryText(content, index, text) {
  const entries = parseChecklist(content);
  const e = entries[index];
  if (!e) return content;
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) entries.splice(index, 1); else e.text = clean;
  return buildChecklistContent(entries);
}

// Move the entry at `from` next to the entry at `over` (above it when `before`).
// Reuses computeReorder for the index math, then re-canonicalizes — so a manual
// order among unchecked items sticks while checked items still sink per section.
function reorderChecklist(content, from, over, before) {
  const entries = parseChecklist(content);
  const res = computeReorder(entries.map((_, i) => i), from, over, before);
  if (!res) return content;
  return buildChecklistContent(res.ids.map((i) => entries[i]));
}

// ===================================================================
// Drag-and-drop reorder math (pure, unit-tested).
// ===================================================================

// Given the ordered ids of a section (top -> bottom), the dragged id, and the
// id it was dropped relative to (`overId`) with `before` = drop above that
// target, return { ids, afterId } where `ids` is the new top->bottom order and
// `afterId` is the id immediately ABOVE the dragged card (0 = it lands first) —
// exactly what POST /move expects. Returns null for a no-op (unchanged order).
function computeReorder(orderedIds, draggedId, overId, before) {
  const from = orderedIds.indexOf(draggedId);
  if (from < 0) return null;
  const without = orderedIds.filter((id) => id !== draggedId);
  let insertAt;
  if (overId === draggedId || overId == null) {
    insertAt = from; // dropped on itself / nowhere -> no move
  } else {
    const overIdx = without.indexOf(overId);
    if (overIdx < 0) return null;
    insertAt = before ? overIdx : overIdx + 1;
  }
  const next = without.slice();
  next.splice(insertAt, 0, draggedId);
  // No-op when the order is unchanged.
  if (next.length === orderedIds.length && next.every((id, i) => id === orderedIds[i])) {
    return null;
  }
  const pos = next.indexOf(draggedId);
  const afterId = pos === 0 ? 0 : next[pos - 1];
  return { ids: next, afterId };
}

// ===================================================================
// UI atoms
// ===================================================================

function iconButton(name, title, onClick, extraClass) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn' + (extraClass ? ' ' + extraClass : '');
  b.innerHTML = icon(name);
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

// Close every open popover (color pickers, label editors, ⋮ menus).
function closePopovers() {
  document.querySelectorAll('.popover').forEach((p) => p.remove());
}

// Position a popover element relative to an anchor button, flipping above the
// anchor if there isn't room below. The popover must already be in the DOM.
function placePopover(pop, anchor) {
  pop.style.visibility = 'hidden';
  document.body.appendChild(pop);
  const a = anchor.getBoundingClientRect();
  const pr = pop.getBoundingClientRect();
  let top = a.bottom + 6;
  if (top + pr.height > window.innerHeight - 8) top = Math.max(8, a.top - pr.height - 6);
  let left = a.left;
  if (left + pr.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - pr.width - 8);
  pop.style.top = Math.round(top + window.scrollY) + 'px';
  pop.style.left = Math.round(left + window.scrollX) + 'px';
  pop.style.visibility = '';
}

// ===================================================================
// Color popover (existing cards + reused by composer button placement)
// ===================================================================

function openColorPopover(anchor, current, onPick) {
  closePopovers();
  const pop = document.createElement('div');
  pop.className = 'popover color-popover';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.name === '' ? ' is-default' : '') + ((current || '') === c.name ? ' is-selected' : '');
    if (c.name) sw.dataset.color = c.name;
    sw.title = t(c.label);
    sw.setAttribute('aria-label', t(c.label));
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopovers();
      onPick(c.name);
    });
    pop.appendChild(sw);
  });
  placePopover(pop, anchor);
}

// ===================================================================
// Label popover (reused by composer + existing cards)
// ===================================================================

// Open a label editor anchored to `anchor`. `current` is the array of labels on
// the target; `onChange(newLabels)` is called whenever the set changes.
function openLabelPopover(anchor, current, onChange) {
  closePopovers();
  const pop = document.createElement('div');
  pop.className = 'popover label-popover';
  pop.addEventListener('click', (e) => e.stopPropagation());

  const selected = new Set(current || []);

  const head = document.createElement('div');
  head.className = 'label-pop-head';
  head.textContent = t('label_note');
  pop.appendChild(head);

  const listEl = document.createElement('div');
  listEl.className = 'label-pop-list';
  pop.appendChild(listEl);

  const renderRows = () => {
    listEl.innerHTML = '';
    // Union of known labels and any already on this note (case-insensitive).
    const names = [];
    const seen = new Set();
    const add = (name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      names.push(name);
    };
    [...selected].forEach(add);
    labels.forEach((l) => add(l.name));
    names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    if (names.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'label-pop-empty';
      empty.textContent = t('no_labels');
      listEl.appendChild(empty);
      return;
    }
    names.forEach((name) => {
      const isOn = [...selected].some((s) => s.toLowerCase() === name.toLowerCase());
      const row = document.createElement('label');
      row.className = 'label-pop-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = isOn;
      const span = document.createElement('span');
      span.className = 'label-pop-name';
      span.textContent = name;
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (![...selected].some((s) => s.toLowerCase() === name.toLowerCase())) selected.add(name);
        } else {
          [...selected].forEach((s) => { if (s.toLowerCase() === name.toLowerCase()) selected.delete(s); });
        }
        onChange([...selected]);
      });
      row.append(cb, span);
      listEl.appendChild(row);
    });
  };
  renderRows();

  const form = document.createElement('div');
  form.className = 'label-pop-create';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = t('create_label');
  input.maxLength = 50;
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'icon-btn';
  addBtn.title = t('create_label');
  addBtn.setAttribute('aria-label', t('create_label'));
  addBtn.innerHTML = icon('plus', 18);
  const createLabel = () => {
    const name = input.value.trim();
    if (!name) return;
    if (![...selected].some((s) => s.toLowerCase() === name.toLowerCase())) selected.add(name);
    input.value = '';
    renderRows();
    onChange([...selected]);
  };
  addBtn.addEventListener('click', createLabel);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); createLabel(); }
  });
  form.append(input, addBtn);
  pop.appendChild(form);

  placePopover(pop, anchor);
  input.focus();
}

// ===================================================================
// ⋮ More menu
// ===================================================================

// items: [{ label, icon, onClick }]
function openMenu(anchor, items) {
  closePopovers();
  const pop = document.createElement('div');
  pop.className = 'popover menu-popover';
  items.forEach((it) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-item';
    b.innerHTML = `<span class="menu-ico">${icon(it.icon, 18)}</span><span>${escapeHtml(it.label)}</span>`;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopovers();
      it.onClick();
    });
    pop.appendChild(b);
  });
  placePopover(pop, anchor);
}

// ===================================================================
// Checklist component (Keep-style) — shared by the card preview, the modal
// and the composer. Renders unchecked items on top, a collapsible "completed"
// group, and (optionally) an add-item row.
// ===================================================================

// Entry index currently being dragged within an editable checklist (else null).
let clDragFrom = null;

// Build checklist rows into `host` from a structured entry array (items and
// subheadings) in canonical order. Indices passed to the callbacks are entry
// indices — positions in `entries`, which (because content is stored
// canonically) equal the rows' top-to-bottom document order.
//   opts = {
//     interactive,            // checkboxes are clickable
//     editable,               // text becomes editable fields + drag handles
//     collapsed,              // completed group collapsed? (heading-free lists)
//     showRemove,             // show a hover × on each row
//     onToggle(index),
//     onRemove(index),
//     onEdit(index, text),    // committed item/heading text (editable only)
//     onMove(from, over, before), // drag-reorder (editable only)
//     onCollapse(),           // header click (omit to make header inert)
//   }
function buildChecklistRows(host, entries, opts) {
  const o = opts || {};
  const enableDnD = !!(o.editable && o.onMove);

  const clearDrop = () => host.querySelectorAll('.cl-drop-before, .cl-drop-after')
    .forEach((r) => r.classList.remove('cl-drop-before', 'cl-drop-after'));

  const makeRemoveButton = (label, onClick) => {
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'cl-remove';
    rm.title = label;
    rm.setAttribute('aria-label', label);
    rm.innerHTML = icon('close', 16);
    rm.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return rm;
  };

  // A borderless, auto-growing textarea that reads as inline text. Commits the
  // newline-stripped, trimmed value on blur and on Enter; unchanged is a no-op.
  const makeEditableField = (initial, className, onCommit) => {
    const ta = document.createElement('textarea');
    ta.className = className;
    ta.rows = 1;
    ta.value = initial;
    ta.spellcheck = false;
    let committed = initial.trim();
    const resize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', () => {
      if (/[\r\n]/.test(ta.value)) ta.value = ta.value.replace(/[\r\n]+/g, ' ');
      resize();
    });
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ta.blur(); }
      e.stopPropagation();
    });
    ta.addEventListener('blur', () => {
      const val = ta.value.replace(/[\r\n]+/g, ' ').trim();
      if (val === committed) return;
      committed = val;
      onCommit(val);
    });
    requestAnimationFrame(resize); // size once it is in the DOM
    return ta;
  };

  // A drag grip; HTML5 drag starts here so the text field stays selectable.
  const makeDragHandle = (row, entryIndex) => {
    const handle = document.createElement('span');
    handle.className = 'cl-drag';
    handle.title = t('drag_reorder');
    handle.setAttribute('aria-label', t('drag_reorder'));
    handle.innerHTML = icon('drag', 18);
    handle.draggable = true;
    handle.addEventListener('mousedown', (e) => e.stopPropagation());
    handle.addEventListener('dragstart', (e) => {
      clDragFrom = entryIndex;
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(entryIndex)); } catch (_) { /* ignore */ }
      try { e.dataTransfer.setDragImage(row, 0, 0); } catch (_) { /* ignore */ }
      requestAnimationFrame(() => row.classList.add('cl-dragging'));
    });
    handle.addEventListener('dragend', () => {
      clDragFrom = null;
      row.classList.remove('cl-dragging');
      clearDrop();
    });
    return handle;
  };

  // Make `row` a drop target: a top/bottom indicator follows the cursor, and a
  // drop reorders the dragged entry next to this one.
  const attachRowDrop = (row, entryIndex) => {
    row.addEventListener('dragover', (e) => {
      if (clDragFrom == null || clDragFrom === entryIndex) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const r = row.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      row.classList.toggle('cl-drop-before', before);
      row.classList.toggle('cl-drop-after', !before);
    });
    row.addEventListener('dragleave', () => row.classList.remove('cl-drop-before', 'cl-drop-after'));
    row.addEventListener('drop', (e) => {
      if (clDragFrom == null) return;
      e.preventDefault();
      const r = row.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      const from = clDragFrom;
      clDragFrom = null;
      clearDrop();
      if (from !== entryIndex) o.onMove(from, entryIndex, before);
    });
  };

  const makeItemRow = (item, entryIndex) => {
    const row = document.createElement('div');
    row.className = 'cl-item' + (item.checked ? ' is-checked' : '') + (o.editable ? ' is-editable' : '');
    if (enableDnD) { row.appendChild(makeDragHandle(row, entryIndex)); attachRowDrop(row, entryIndex); }
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'cl-check';
    cb.checked = item.checked;
    if (o.interactive && o.onToggle) {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', (e) => { e.stopPropagation(); o.onToggle(entryIndex); });
    } else {
      cb.disabled = true;
    }
    let textEl;
    if (o.editable && o.onEdit) {
      textEl = makeEditableField(item.text, 'cl-text cl-text-input', (val) => o.onEdit(entryIndex, val));
    } else {
      textEl = document.createElement('span');
      textEl.className = 'cl-text';
      textEl.innerHTML = renderInline(escapeHtml(item.text));
    }
    row.append(cb, textEl);
    if (o.showRemove && o.onRemove) {
      row.appendChild(makeRemoveButton(t('delete_item'), () => o.onRemove(entryIndex)));
    }
    return row;
  };

  const makeHeadingRow = (heading, entryIndex) => {
    const row = document.createElement('div');
    row.className = 'cl-heading' + (o.editable ? ' is-editable' : '');
    if (enableDnD) { row.appendChild(makeDragHandle(row, entryIndex)); attachRowDrop(row, entryIndex); }
    let textEl;
    if (o.editable && o.onEdit) {
      textEl = makeEditableField(heading.text, 'cl-heading-text cl-text-input', (val) => o.onEdit(entryIndex, val));
    } else {
      textEl = document.createElement('span');
      textEl.className = 'cl-heading-text';
      textEl.innerHTML = renderInline(escapeHtml(heading.text));
    }
    row.appendChild(textEl);
    if (o.showRemove && o.onRemove) {
      row.appendChild(makeRemoveButton(t('delete_heading'), () => o.onRemove(entryIndex)));
    }
    return row;
  };

  // With subheadings the list renders strictly in document order — items sink
  // only within their own section (see buildChecklistContent), so there is no
  // global completed group. A heading-free list keeps the classic layout:
  // unchecked on top, then a collapsible "completed" group.
  if (entries.some((e) => e.heading)) {
    entries.forEach((e, i) => {
      host.appendChild(e.heading ? makeHeadingRow(e, i) : makeItemRow(e, i));
    });
    return;
  }

  entries.forEach((item, i) => { if (!item.checked) host.appendChild(makeItemRow(item, i)); });

  const checkedIdx = [];
  entries.forEach((item, i) => { if (item.checked) checkedIdx.push(i); });
  if (checkedIdx.length) {
    const header = document.createElement('div');
    header.className = 'cl-completed-head' + (o.onCollapse ? ' is-clickable' : '');
    const chev = document.createElement('span');
    chev.className = 'cl-chevron' + (o.collapsed ? '' : ' is-open');
    chev.innerHTML = icon('chevron', 18);
    const label = document.createElement('span');
    label.className = 'cl-completed-label';
    label.textContent = checkedIdx.length === 1
      ? t('completed_one', { n: checkedIdx.length })
      : t('completed_many', { n: checkedIdx.length });
    header.append(chev, label);
    if (o.onCollapse) {
      header.addEventListener('click', (e) => { e.stopPropagation(); o.onCollapse(); });
    }
    host.appendChild(header);

    if (!o.collapsed) {
      const group = document.createElement('div');
      group.className = 'cl-completed-group';
      checkedIdx.forEach((i) => group.appendChild(makeItemRow(entries[i], i)));
      host.appendChild(group);
    }
  }
}

// renderChecklist(m, {interactive}) -> the checklist body for a memo.
// Toggling a checkbox auto-sinks (toggleChecklistItem) and persists via
// PUT {content}; the completed-group header persists collapse via /collapsed.
// `extra` adds the modal-only affordances: {showAdd, showRemove}.
function renderChecklist(m, { interactive } = {}, extra = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'note-checklist';
  const items = parseChecklist(m.content);

  buildChecklistRows(wrap, items, {
    interactive,
    editable: !!extra.editable,
    collapsed: !!m.completedCollapsed,
    showRemove: !!extra.showRemove,
    onToggle: interactive ? (index) => toggleChecklistAt(m, index) : null,
    onRemove: extra.showRemove ? (index) => removeChecklistAt(m, index) : null,
    onEdit: extra.editable ? (index, text) => editChecklistAt(m, index, text) : null,
    onMove: extra.editable ? (from, over, before) => reorderChecklistAt(m, from, over, before) : null,
    onCollapse: interactive ? () => toggleChecklistCollapse(m) : null,
  });

  if (extra.showAdd) {
    wrap.appendChild(makeAddItemRow((text, keepFocus) => {
      // On Enter, re-focus the (rebuilt) add input after the async persist so the
      // modal supports fast sequential entry; on blur, leave focus where it went.
      if (keepFocus) modalAddFocusPending = true;
      addChecklistItem(m, text);
    }));
  }
  return wrap;
}

// The "+ List item" row. `onSubmit(text, keepFocus)` is called on Enter and on
// blur (Google Keep style: typing then clicking away still commits the text).
// The input is cleared before onSubmit. `keepFocus` is true for Enter so callers
// re-focus the rebuilt add input for fast sequential entry, and false on blur so
// committing does not yank focus back from wherever the user clicked.
function makeAddItemRow(onSubmit) {
  const row = document.createElement('div');
  row.className = 'cl-add';
  const plus = document.createElement('span');
  plus.className = 'cl-add-ico';
  plus.innerHTML = icon('plus', 18);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cl-add-input';
  input.placeholder = t('list_item');
  input.title = t('list_item_hint'); // "## …" starts a subheading
  const submit = (keepFocus) => {
    const text = input.value.trim();
    if (!text) return;
    input.value = ''; // cleared first, so the removal-induced blur is a no-op
    onSubmit(text, keepFocus);
    if (keepFocus && input.isConnected) input.focus(); // not re-rendered -> keep focus
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(true); }
    e.stopPropagation();
  });
  // Commit whatever was typed when the field loses focus (click away, Tab, etc.).
  input.addEventListener('blur', () => submit(false));
  input.addEventListener('click', (e) => e.stopPropagation());
  row.append(plus, input);
  return row;
}

// ---- memo-backed checklist mutations (persist + re-render card & modal) ----

// Always work off the freshest copy of the memo (state.all is kept current by
// patchMemo) so rapid successive toggles don't compute from a stale closure.
function liveMemo(m) { return state.all.find((x) => x.id === m.id) || m; }

async function persistChecklistContent(m, content) {
  const cur = liveMemo(m);
  if (content === cur.content) return;
  pendingSaves++;
  try {
    const upd = await api('PUT', '/memos/' + cur.id, { content }, { keepalive: true });
    patchMemo(upd);
    rebuildCard(upd);
    if (modalMemo && modalMemo.id === upd.id) refreshModalBody(upd);
  } catch (err) { alert(err.message); }
  finally { pendingSaves--; }
}

function toggleChecklistAt(m, index) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, toggleChecklistItem(cur.content, index));
}

function addChecklistItem(m, text) {
  const cur = liveMemo(m);
  const entry = parseAddEntry(text);
  persistChecklistContent(cur, entry.heading
    ? appendChecklistHeading(cur.content, entry.text)
    : appendChecklistItem(cur.content, entry.text));
}

function removeChecklistAt(m, index) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, removeChecklistItem(cur.content, index));
}

function editChecklistAt(m, index, text) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, setChecklistEntryText(cur.content, index, text));
}

function reorderChecklistAt(m, from, over, before) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, reorderChecklist(cur.content, from, over, before));
}

async function toggleChecklistCollapse(m) {
  const cur = liveMemo(m);
  try {
    const upd = await api('POST', `/memos/${cur.id}/collapsed`, { collapsed: !cur.completedCollapsed });
    patchMemo(upd);
    rebuildCard(upd);
    if (modalMemo && modalMemo.id === upd.id) refreshModalBody(upd);
  } catch (err) { alert(err.message); }
}

// ===================================================================
// Images — picked from the device, downscaled in the browser to a JPEG data
// URL (no upload endpoint needed), then stored on the memo as a data URL.
// ===================================================================

// Read one image File and resolve to a downscaled JPEG data URL.
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('not an image')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; // flatten any transparency for JPEG
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Resize a FileList to at most `room` data URLs, skipping anything unreadable.
async function filesToDataURLs(fileList, room) {
  const files = [...(fileList || [])].filter((f) => /^image\//.test(f.type));
  const out = [];
  for (const f of files) {
    if (out.length >= room) break;
    try { out.push(await readImageFile(f)); } catch (_) { /* skip unreadable file */ }
  }
  return out;
}

// Open a native picker for images and hand the resulting data URLs to onPicked.
function pickImages(onPicked) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', async () => {
    const urls = await filesToDataURLs(input.files, MAX_IMAGES);
    input.remove();
    if (urls.length) onPicked(urls);
  }, { once: true });
  // A dismissed picker fires no change event; drop the input instead of leaking it.
  input.addEventListener('cancel', () => input.remove(), { once: true });
  input.click();
}

// A single image thumbnail (with an optional hover × to remove it).
function imageThumb(src, onRemove) {
  const fig = document.createElement('div');
  fig.className = 'note-image';
  const img = document.createElement('img');
  img.src = src;
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('load', relayoutSoon);
  fig.appendChild(img);
  if (onRemove) {
    fig.appendChild(iconButton('close', t('image_remove'),
      (e) => { e.stopPropagation(); onRemove(); }, 'note-image-remove'));
  }
  return fig;
}

// The edge-to-edge image grid shown at the top of a card or in the modal.
// onRemove(index) is optional (omitted on read-only cards).
function imagesGrid(images, onRemove) {
  const wrap = document.createElement('div');
  wrap.className = 'note-images' + (images.length === 1 ? ' single' : '');
  images.forEach((src, i) => {
    wrap.appendChild(imageThumb(src, onRemove ? () => onRemove(i) : null));
  });
  return wrap;
}

// Fill a composer/editor strip host with removable thumbnails.
function fillImageStrip(host, images, onRemove) {
  host.innerHTML = '';
  host.hidden = images.length === 0;
  images.forEach((src, i) => host.appendChild(imageThumb(src, () => onRemove(i))));
}

// ===================================================================
// Note cards
// ===================================================================

function noteCard(m) {
  const el = document.createElement('article');
  el.className = 'note';
  el.dataset.id = m.id;
  if (m.color) el.dataset.color = m.color;

  // Pin (active view only).
  if (state.view === 'active') {
    const pin = iconButton(m.pinned ? 'pinFilled' : 'pin', m.pinned ? t('unpin') : t('pin'),
      (e) => { e.stopPropagation(); togglePin(m); }, 'note-pin');
    if (m.pinned) pin.classList.add('is-pinned');
    el.appendChild(pin);
  }

  // Images sit above the title, like Google Keep.
  if (m.images && m.images.length) {
    el.appendChild(imagesGrid(m.images));
  }

  if (m.title) {
    const h = document.createElement('div');
    h.className = 'note-title';
    h.textContent = m.title;
    el.appendChild(h);
  }

  // Body: a checklist note gets the structured component (no add-row in the
  // card preview); everything else is generic markdown with interactive tasks.
  if (m.checklist === true) {
    el.appendChild(renderChecklist(m, { interactive: state.view !== 'trash' }));
  } else {
    const body = document.createElement('div');
    body.className = 'note-body markdown';
    body.innerHTML = renderMarkdown(m.content);
    // Interactive task checkboxes (not in trash view).
    if (state.view !== 'trash') {
      body.querySelectorAll('input[type="checkbox"][data-task]').forEach((cb) => {
        cb.addEventListener('click', (e) => e.stopPropagation());
        cb.addEventListener('change', (e) => {
          e.stopPropagation();
          toggleTask(m, parseInt(cb.dataset.task, 10));
        });
      });
    } else {
      body.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.disabled = true; });
    }
    el.appendChild(body);
  }

  // Label chips.
  if (m.labels && m.labels.length) {
    const chips = document.createElement('div');
    chips.className = 'note-labels';
    m.labels.forEach((name) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'note-label';
      chip.innerHTML = `${icon('label', 13)}<span>${escapeHtml(name)}</span>`;
      chip.addEventListener('click', (e) => { e.stopPropagation(); filterByLabel(name); });
      chips.appendChild(chip);
    });
    el.appendChild(chips);
  }

  el.appendChild(buildActions(el, m));

  // Click anywhere on a card -> open the modal editor (Google Keep style). Trash
  // stays read-only. Only actual controls opt out: buttons (action icons, label
  // chips, checklist ×), links, form inputs (incl. checklist checkboxes) and the
  // bottom action toolbar. The checklist checkboxes and collapse header also
  // stopPropagation, so clicking them never bubbles up here.
  if (state.view !== 'trash') {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button,a,input,textarea,.note-actions')) return;
      openModal(m);
    });
    // Drag-and-drop reordering (active view only — see attachDrag).
    if (state.view === 'active') attachDrag(el, m);
  }
  return el;
}

// Build the per-view bottom action row for a card.
function buildActions(el, m) {
  const actions = document.createElement('div');
  actions.className = 'note-actions';

  if (state.view === 'trash') {
    actions.appendChild(iconButton('restore', t('restore'),
      (e) => { e.stopPropagation(); restoreFromTrash(m); }));
    actions.appendChild(iconButton('trash', t('delete_forever'),
      (e) => { e.stopPropagation(); deleteForever(m); }));
  } else {
    // color
    actions.appendChild(iconButton('palette', t('bg_color'), (e) => {
      e.stopPropagation();
      openColorPopover(e.currentTarget, m.color, (color) => setColor(m, color));
    }));
    // add label
    actions.appendChild(iconButton('label', t('add_label'), (e) => {
      e.stopPropagation();
      openLabelPopover(e.currentTarget, m.labels || [], (next) => setLabels(m, next));
    }));
    // add image
    actions.appendChild(iconButton('image', t('image_add'), (e) => {
      e.stopPropagation();
      pickImages((urls) => addImagesToMemo(m, urls));
    }));

    if (state.view === 'archived') {
      actions.appendChild(iconButton('unarchive', t('unarchive'),
        (e) => { e.stopPropagation(); setArchived(m, false); }));
    } else {
      actions.appendChild(iconButton('archive', t('archive'),
        (e) => { e.stopPropagation(); setArchived(m, true); }));
    }

    // ⋮ more
    actions.appendChild(iconButton('more', t('more'), (e) => {
      e.stopPropagation();
      openMenu(e.currentTarget, [
        { label: t('make_copy'), icon: 'copy', onClick: () => duplicateMemo(m) },
        { label: t('delete'), icon: 'trash', onClick: () => trashMemo(m) },
      ]);
    }));
  }

  const time = document.createElement('time');
  time.className = 'note-time';
  const stamp = state.view === 'trash' && m.trashedAt ? m.trashedAt : m.createdAt;
  time.textContent = formatRelative(stamp);
  time.dateTime = stamp;
  time.title = new Date(m.createdAt).toLocaleString()
    + (m.updatedAt && m.updatedAt !== m.createdAt ? '  ·  edited ' + new Date(m.updatedAt).toLocaleString() : '');
  actions.appendChild(time);

  return actions;
}

// Lay cards out into the shortest column (masonry), responsive to width.
function distribute(container, cards) {
  const GAP = 14, MIN = 236;
  const width = container.clientWidth || container.offsetWidth || 1;
  const n = Math.max(1, Math.min(cards.length || 1, Math.floor((width + GAP) / (MIN + GAP))));
  container.innerHTML = '';
  const cols = [], heights = [];
  for (let k = 0; k < n; k++) {
    const c = document.createElement('div');
    c.className = 'masonry-col';
    container.appendChild(c);
    cols.push(c);
    heights.push(0);
  }
  for (const card of cards) {
    let mi = 0;
    for (let k = 1; k < n; k++) if (heights[k] < heights[mi]) mi = k;
    cols[mi].appendChild(card);
    heights[mi] += card.offsetHeight + GAP;
  }
}

function relayoutAll() {
  grids.forEach((g) => distribute(g.container, g.cards));
}

// Images load asynchronously, so a card's height isn't known when it is first
// laid out. Re-flow the masonry shortly after each image settles.
const relayoutSoon = debounce(() => relayoutAll(), 60);

function render() {
  const q = state.query.toLowerCase();
  // Preserve server order (pinned-first, then manual position, then newest).
  const filtered = state.all.filter((m) => {
    if (state.label && !(m.labels || []).some((l) => l.toLowerCase() === state.label.toLowerCase())) return false;
    if (q && !((m.title || '') + '\n' + m.content).toLowerCase().includes(q)) return false;
    return true;
  });

  // Pinned section only meaningful in the active view.
  const pinned = state.view === 'active' ? filtered.filter((m) => m.pinned) : [];
  const others = state.view === 'active' ? filtered.filter((m) => !m.pinned) : filtered;

  pinnedSection.hidden = pinned.length === 0;
  othersLabel.hidden = !(pinned.length > 0 && others.length > 0);

  // "Empty trash" board action.
  boardActions.innerHTML = '';
  if (state.view === 'trash' && state.all.length > 0) {
    const note = document.createElement('span');
    note.className = 'board-note';
    note.textContent = t('trash_note');
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.className = 'text-btn danger';
    empty.textContent = t('empty_trash');
    empty.addEventListener('click', emptyTrash);
    boardActions.append(note, empty);
  }
  boardActions.hidden = boardActions.childElementCount === 0;

  grids = [
    { container: pinnedGrid, cards: pinned.map(noteCard) },
    { container: othersGrid, cards: others.map(noteCard) },
  ];
  relayoutAll();

  emptyEl.hidden = filtered.length !== 0;
  if (filtered.length === 0) emptyEl.textContent = emptyMessage();
}

function emptyMessage() {
  if (state.all.length > 0) return t('empty_no_match');
  if (state.view === 'archived') return t('empty_archive');
  if (state.view === 'trash') return t('empty_trash_state');
  return t('empty_notes');
}

function rebuildCard(m) {
  const old = document.querySelector(`.note[data-id="${m.id}"]`);
  if (!old) { render(); return; }
  const fresh = noteCard(m);
  old.replaceWith(fresh);
  grids.forEach((g) => { const i = g.cards.indexOf(old); if (i >= 0) g.cards[i] = fresh; });
  relayoutAll();
}

// Replace a memo in state.all (or remove it when it falls out of the view).
function patchMemo(upd) {
  const i = state.all.findIndex((x) => x.id === upd.id);
  if (i >= 0) state.all[i] = upd;
}

// ===================================================================
// Actions
// ===================================================================

async function togglePin(m) {
  try {
    const upd = await api('POST', `/memos/${m.id}/pin`, { pinned: !m.pinned });
    patchMemo(upd);
    render();
  } catch (err) { alert(err.message); }
}

async function setColor(m, color) {
  try {
    const upd = await api('POST', `/memos/${m.id}/color`, { color });
    patchMemo(upd);
    const el = document.querySelector(`.note[data-id="${m.id}"]`);
    if (el) {
      if (upd.color) el.dataset.color = upd.color; else delete el.dataset.color;
    } else {
      render();
    }
    relayoutAll();
  } catch (err) { alert(err.message); }
}

async function setLabels(m, next) {
  try {
    const upd = await api('PUT', `/memos/${m.id}`, { labels: next });
    patchMemo(upd);
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function setArchived(m, archived) {
  try {
    await api('POST', `/memos/${m.id}/archive`, { archived });
    // In both the active and archived views the note leaves the current list.
    state.all = state.all.filter((x) => x.id !== m.id);
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function trashMemo(m) {
  try {
    await api('POST', `/memos/${m.id}/trash`, { trashed: true });
    state.all = state.all.filter((x) => x.id !== m.id);
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function restoreFromTrash(m) {
  try {
    await api('POST', `/memos/${m.id}/trash`, { trashed: false });
    state.all = state.all.filter((x) => x.id !== m.id);
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function deleteForever(m) {
  if (!confirm(t('confirm_delete_forever'))) return;
  try {
    await api('DELETE', '/memos/' + m.id);
    state.all = state.all.filter((x) => x.id !== m.id);
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function duplicateMemo(m) {
  try {
    const dup = await api('POST', `/memos/${m.id}/duplicate`);
    // The copy belongs to the active view; only insert it if we're looking at it.
    if (state.view === 'active') {
      state.all.unshift(dup);
      render();
    }
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function emptyTrash() {
  if (!confirm(t('confirm_empty_trash'))) return;
  try {
    await api('POST', '/memos/trash/empty');
    state.all = [];
    render();
    loadMeta();
  } catch (err) { alert(err.message); }
}

async function toggleTask(m, taskIndex) {
  const content = toggleTaskInContent(m.content, taskIndex);
  if (content === m.content) return;
  try {
    const upd = await api('PUT', '/memos/' + m.id, { content });
    patchMemo(upd);
    rebuildCard(upd);
  } catch (err) { alert(err.message); }
}

// ---- image mutations (persist + re-render card & modal) ----

async function setMemoImages(m, images) {
  try {
    const upd = await api('PUT', '/memos/' + m.id, { images });
    patchMemo(upd);
    rebuildCard(upd);
    if (modalMemo && modalMemo.id === upd.id) { modalMemo = upd; renderModalImages(upd); }
  } catch (err) { alert(err.message); }
}

function addImagesToMemo(m, urls) {
  const cur = liveMemo(m);
  const existing = cur.images || [];
  const next = [...existing, ...urls].slice(0, MAX_IMAGES);
  if (next.length === existing.length) return; // already at the limit
  setMemoImages(cur, next);
}

function removeImageFromMemo(m, index) {
  const cur = liveMemo(m);
  setMemoImages(cur, (cur.images || []).filter((_, i) => i !== index));
}

// ===================================================================
// Modal editor — click a card to open it large & centered (Keep-style).
// Label / color / pin / archive / trash / checklist toggles persist live via
// their endpoints; the title and (non-checklist) body persist on close.
// ===================================================================

let modalMemo = null;        // the memo currently open in the modal (or null)
let modalBackdrop = null;    // the backdrop element while open
let modalTitleInput = null;
let modalBodyTextarea = null; // present only for non-checklist notes
let modalChips = null;        // label chips container
let modalSurface = null;
let modalAddFocusPending = false; // re-focus the add input after an item add
let pendingSaves = 0;             // in-flight keepalive saves (for beforeunload)

function openModal(m) {
  if (modalMemo) return; // already open
  closePopovers();
  m = state.all.find((x) => x.id === m.id) || m; // freshest copy
  modalMemo = m;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const surface = document.createElement('div');
  surface.className = 'modal';
  surface.setAttribute('role', 'dialog');
  surface.setAttribute('aria-modal', 'true');
  if (m.color) surface.dataset.color = m.color;
  modalSurface = surface;

  // Title.
  const title = document.createElement('input');
  title.className = 'modal-title';
  title.type = 'text';
  title.placeholder = t('composer_title');
  title.maxLength = 1024;
  title.value = m.title || '';
  modalTitleInput = title;
  title.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      if (modalBodyTextarea) modalBodyTextarea.focus();
    }
  });

  // Images host (full-width grid above the title).
  const imagesHost = document.createElement('div');
  imagesHost.className = 'modal-images';
  imagesHost.dataset.host = 'images';

  // Body host (re-rendered in place by refreshModalBody).
  const bodyHost = document.createElement('div');
  bodyHost.className = 'modal-body';
  bodyHost.dataset.host = 'body';

  // Label chips row.
  const chips = document.createElement('div');
  chips.className = 'modal-chips';
  modalChips = chips;

  // Bottom action bar.
  const bar = buildModalActions(surface);

  surface.append(imagesHost, title, bodyHost, chips, bar);
  backdrop.appendChild(surface);
  document.body.appendChild(backdrop);
  modalBackdrop = backdrop;
  document.body.classList.add('modal-open');

  renderModalImages(m);
  fillModalBody(m);
  renderModalChips(m);

  // Close on backdrop click (but not when the click bubbled from the surface).
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) backdrop._downOnBackdrop = true;
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && backdrop._downOnBackdrop) closeModal();
    backdrop._downOnBackdrop = false;
  });

  document.addEventListener('keydown', modalKeydown, true);

  // Focus the title for a brand-new-feeling edit; for an existing checklist note
  // the title is still the natural first field.
  title.focus();
  title.setSelectionRange(title.value.length, title.value.length);
}

// Render the modal body for the current memo into the body host: an interactive
// checklist (with add + remove) for checklist notes, else a growing textarea.
function fillModalBody(m) {
  const host = modalSurface.querySelector('[data-host="body"]');
  if (!host) return;
  host.innerHTML = '';
  modalBodyTextarea = null;
  if (m.checklist === true) {
    host.appendChild(renderChecklist(m, { interactive: true }, { showAdd: true, showRemove: true, editable: true }));
  } else {
    const ta = document.createElement('textarea');
    ta.className = 'modal-textarea';
    ta.placeholder = t('composer_take_note');
    ta.value = m.content;
    ta.addEventListener('input', () => autosize(ta));
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey
        && continueListOnEnter(ta)) e.preventDefault();
    });
    host.appendChild(ta);
    modalBodyTextarea = ta;
    autosize(ta);
  }
}

// Live-refresh the modal after an out-of-band change to the open memo (checklist
// toggle/add/remove, color, labels). Preserves a non-checklist textarea's edits
// and keeps the add-item input focused for fast sequential entry.
function refreshModalBody(upd) {
  // Re-focus the add input if the user just added an item (deterministic flag)
  // or is currently typing in it.
  const ae = document.activeElement;
  const keepAddFocus = modalAddFocusPending
    || !!(ae && ae.classList && ae.classList.contains('cl-add-input')
      && modalSurface && modalSurface.contains(ae));
  modalAddFocusPending = false;
  modalMemo = upd;
  if (modalSurface) {
    if (upd.color) modalSurface.dataset.color = upd.color; else delete modalSurface.dataset.color;
  }
  renderModalChips(upd);
  // Only re-render the body wholesale for checklist notes; a live textarea must
  // keep the user's in-progress (unsaved) edits.
  if (upd.checklist === true) {
    fillModalBody(upd);
    if (keepAddFocus) {
      const inp = modalSurface && modalSurface.querySelector('.cl-add-input');
      if (inp) inp.focus();
    }
  }
}

function renderModalChips(m) {
  if (!modalChips) return;
  modalChips.innerHTML = '';
  (m.labels || []).forEach((name) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'note-label';
    chip.innerHTML = `${icon('label', 13)}<span>${escapeHtml(name)}</span>`;
    chip.addEventListener('click', async (e) => { e.stopPropagation(); await closeModal(); filterByLabel(name); });
    modalChips.appendChild(chip);
  });
  modalChips.hidden = !(m.labels && m.labels.length);
}

// Render the modal's image grid (with hover-remove) for the current memo.
function renderModalImages(m) {
  if (!modalSurface) return;
  const host = modalSurface.querySelector('[data-host="images"]');
  if (!host) return;
  host.innerHTML = '';
  if (m.images && m.images.length) {
    host.appendChild(imagesGrid(m.images, (i) => removeImageFromMemo(m, i)));
  }
}

// The modal's bottom action bar. Reuses the same per-view mutations as a card
// (color / label / archive-or-unarchive / pin / ⋮ copy+delete) plus Close.
function buildModalActions(surface) {
  const bar = document.createElement('div');
  bar.className = 'modal-actions';

  const liveRefresh = (upd) => { if (upd && modalMemo && upd.id === modalMemo.id) refreshModalBody(upd); };

  // color
  bar.appendChild(iconButton('palette', t('bg_color'), (e) => {
    e.stopPropagation();
    openColorPopover(e.currentTarget, modalMemo.color, async (color) => {
      await setColor(modalMemo, color);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) liveRefresh(cur);
    });
  }));
  // add label
  bar.appendChild(iconButton('label', t('add_label'), (e) => {
    e.stopPropagation();
    openLabelPopover(e.currentTarget, modalMemo.labels || [], async (next) => {
      await setLabels(modalMemo, next);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) liveRefresh(cur);
    });
  }));
  // add image
  bar.appendChild(iconButton('image', t('image_add'), (e) => {
    e.stopPropagation();
    pickImages((urls) => addImagesToMemo(modalMemo, urls));
  }));
  // archive / unarchive (leaves the current view -> close the modal first)
  if (state.view === 'archived') {
    bar.appendChild(iconButton('unarchive', t('unarchive'), async (e) => {
      e.stopPropagation();
      const m = modalMemo; await closeModal(); setArchived(m, false);
    }));
  } else {
    bar.appendChild(iconButton('archive', t('archive'), async (e) => {
      e.stopPropagation();
      const m = modalMemo; await closeModal(); setArchived(m, true);
    }));
  }
  // pin / unpin (active view only, mirroring the card's floating pin)
  if (state.view === 'active') {
    bar.appendChild(iconButton('pin', t('pin'), async (e) => {
      e.stopPropagation();
      await togglePin(modalMemo);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) { modalMemo = cur; e.currentTarget.innerHTML = icon(cur.pinned ? 'pinFilled' : 'pin'); }
    }, modalMemo.pinned ? 'is-pinned' : ''));
    if (modalMemo.pinned) bar.lastChild.innerHTML = icon('pinFilled');
  }
  // ⋮ more
  bar.appendChild(iconButton('more', t('more'), (e) => {
    e.stopPropagation();
    openMenu(e.currentTarget, [
      { label: t('make_copy'), icon: 'copy', onClick: async () => { const m = modalMemo; await closeModal(); duplicateMemo(m); } },
      { label: t('delete'), icon: 'trash', onClick: async () => { const m = modalMemo; await closeModal(); trashMemo(m); } },
    ]);
  }));

  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  bar.appendChild(spacer);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'text-btn';
  close.textContent = t('close');
  close.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); });
  bar.appendChild(close);

  return bar;
}

function modalKeydown(e) {
  if (e.key === 'Escape' && modalMemo) {
    // Let an open popover swallow Escape first.
    if (document.querySelector('.popover')) { closePopovers(); e.stopPropagation(); return; }
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  }
}

// Close the modal, saving the title and (for non-checklist notes) the body if
// they changed. Checklist content already persisted live during editing.
async function closeModal() {
  if (!modalMemo) return;
  const m = modalMemo;
  // Capture field values BEFORE teardown nulls the refs.
  const titleVal = modalTitleInput ? modalTitleInput.value.trim() : (m.title || '');
  const bodyVal = modalBodyTextarea ? modalBodyTextarea.value : null; // null = checklist note
  const titleChanged = titleVal !== (m.title || '');
  const bodyChanged = bodyVal !== null && bodyVal !== m.content;

  // Tear down first so a failed save still closes the dialog.
  closePopovers();
  document.removeEventListener('keydown', modalKeydown, true);
  if (modalBackdrop) modalBackdrop.remove();
  document.body.classList.remove('modal-open');
  modalMemo = null;
  modalBackdrop = null;
  modalTitleInput = null;
  modalBodyTextarea = null;
  modalChips = null;
  modalSurface = null;
  modalAddFocusPending = false;

  if (!titleChanged && !bodyChanged) return;
  const payload = { title: titleVal };
  if (bodyChanged) payload.content = bodyVal;
  try {
    const upd = await api('PUT', '/memos/' + m.id, payload);
    patchMemo(upd);
    rebuildCard(upd);
    loadMeta();
  } catch (err) { alert(err.message); }
}

// Best-effort flush of in-progress modal edits when the page is closing
// (Ctrl+W / navigation). Blurring the focused field fires its keepalive commit;
// the modal title/body otherwise only persist on close, so push those too. The
// beforeunload confirm (registered in init) keeps the page alive long enough for
// these keepalive requests to be delivered.
function flushModalOnUnload() {
  const ae = document.activeElement;
  if (ae && ae.classList
    && (ae.classList.contains('cl-add-input') || ae.classList.contains('cl-text-input'))) {
    ae.blur(); // commits via makeAddItemRow / makeEditableField -> persistChecklistContent
  }
  if (!modalMemo) return;
  const fields = {};
  if (modalTitleInput && modalTitleInput.value.trim() !== (modalMemo.title || '')) {
    fields.title = modalTitleInput.value.trim();
  }
  if (modalBodyTextarea && modalBodyTextarea.value !== modalMemo.content) {
    fields.content = modalBodyTextarea.value;
  }
  if (!Object.keys(fields).length) return;
  pendingSaves++;
  api('PUT', '/memos/' + modalMemo.id, fields, { keepalive: true }).finally(() => { pendingSaves--; });
}

// ===================================================================
// Drag-and-drop card reordering (active view only). Reorders within a section
// (pinned / others are independent groups, matching the backend's Move()).
// ===================================================================

let dragId = null;       // id of the card being dragged
let dragSection = null;  // 'pinned' | 'others'

// A section is one of the two active-view groups; ordering follows state.all
// (pinned-first, then position) filtered the same way render() filters.
function sectionOf(m) { return m.pinned ? 'pinned' : 'others'; }

// Ordered, currently-visible memo ids for a section (top -> bottom).
function visibleSectionIds(section) {
  const q = state.query.toLowerCase();
  return state.all
    .filter((m) => {
      if (sectionOf(m) !== section) return false;
      if (state.label && !(m.labels || []).some((l) => l.toLowerCase() === state.label.toLowerCase())) return false;
      if (q && !((m.title || '') + '\n' + m.content).toLowerCase().includes(q)) return false;
      return true;
    })
    .map((m) => m.id);
}

// Reorder state.all in place so `draggedId` sits immediately after `afterId`
// (or at the top of its section when afterId === 0), mirroring backend Move().
function applyMoveToState(draggedId, afterId) {
  const i = state.all.findIndex((m) => m.id === draggedId);
  if (i < 0) return;
  const [moved] = state.all.splice(i, 1);
  if (afterId === 0) {
    // Top of the section: before the first memo of the same section, else end.
    const at = state.all.findIndex((m) => sectionOf(m) === sectionOf(moved));
    state.all.splice(at < 0 ? state.all.length : at, 0, moved);
  } else {
    const at = state.all.findIndex((m) => m.id === afterId);
    state.all.splice(at < 0 ? state.all.length : at + 1, 0, moved);
  }
}

function clearDropIndicators() {
  document.querySelectorAll('.note.drop-before, .note.drop-after')
    .forEach((n) => n.classList.remove('drop-before', 'drop-after'));
}

function attachDrag(el, m) {
  el.draggable = true;

  el.addEventListener('dragstart', (e) => {
    // Never start a drag from an interactive control (text selection, etc.).
    if (e.target.closest('input,textarea,button,a,.note-checklist')) {
      e.preventDefault();
      return;
    }
    dragId = m.id;
    dragSection = sectionOf(m);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(m.id)); } catch (_) { /* ignore */ }
    // Defer the dim class so the drag image isn't captured already-dimmed.
    requestAnimationFrame(() => el.classList.add('dragging'));
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    clearDropIndicators();
    dragId = null;
    dragSection = null;
  });

  el.addEventListener('dragover', (e) => {
    if (dragId == null || dragId === m.id) return;
    if (sectionOf(m) !== dragSection) return; // never across sections
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = el.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    if (el.classList.contains(before ? 'drop-before' : 'drop-after')) return;
    el.classList.remove('drop-before', 'drop-after');
    el.classList.add(before ? 'drop-before' : 'drop-after');
  });

  el.addEventListener('dragleave', () => {
    el.classList.remove('drop-before', 'drop-after');
  });

  el.addEventListener('drop', (e) => {
    if (dragId == null || sectionOf(m) !== dragSection) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    const moved = dragId;
    clearDropIndicators();
    const res = computeReorder(visibleSectionIds(dragSection), moved, m.id, before);
    dragId = null;
    dragSection = null;
    if (!res) return; // no-op (same spot / onto itself)
    moveCard(moved, res.afterId);
  });
}

async function moveCard(id, afterId) {
  // Optimistic: reorder locally and re-lay-out, then persist.
  applyMoveToState(id, afterId);
  render();
  try {
    const upd = await api('POST', `/memos/${id}/move`, { afterId });
    patchMemo(upd);
  } catch (err) {
    alert(err.message);
    await loadMemos(); // resync on failure
    render();
  }
}

// ===================================================================
// Views + sidebar nav + labels
// ===================================================================

const VIEWS = [
  { id: 'active', label: 'view_notes', icon: 'notes' },
  { id: 'archived', label: 'view_archive', icon: 'archive' },
  { id: 'trash', label: 'view_trash', icon: 'trash' },
];

function renderNav() {
  navList.innerHTML = '';
  VIEWS.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item' + (state.view === v.id && state.label === '' ? ' active' : '');
    b.dataset.view = v.id;
    b.title = t(v.label); // visible as a tooltip when the sidebar is a rail
    b.innerHTML = `<span class="nav-ico">${icon(v.icon)}</span><span class="nav-text">${t(v.label)}</span>`;
    b.addEventListener('click', () => switchView(v.id));
    navList.appendChild(b);
  });
}

function renderLabels() {
  labelList.innerHTML = '';
  if (labels.length === 0) {
    labelList.innerHTML = `<div class="nav-empty">${escapeHtml(t('no_labels'))}</div>`;
    return;
  }
  labels.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item' + (state.label.toLowerCase() === l.name.toLowerCase() ? ' active' : '');
    b.dataset.label = l.name;
    b.title = l.name; // visible as a tooltip when the sidebar is a rail
    b.innerHTML = `<span class="nav-ico">${icon('label')}</span>` +
      `<span class="nav-text">${escapeHtml(l.name)}</span><span class="nav-count">${l.count}</span>`;
    b.addEventListener('click', () => filterByLabel(l.name));
    labelList.appendChild(b);
  });
}

async function switchView(view) {
  state.view = view;
  state.label = '';
  state.query = '';
  searchInput.value = '';
  closeSidebar();
  renderNav();
  renderLabels();
  await loadMemos();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterByLabel(name) {
  // Toggle off if the same label is clicked again.
  const same = state.label.toLowerCase() === name.toLowerCase();
  state.label = same ? '' : name;
  state.query = '';
  searchInput.value = '';
  closeSidebar();
  renderNav();
  renderLabels();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================================================
// Data loading
// ===================================================================

async function loadMemos() {
  try {
    const res = await api('GET', `/memos?view=${state.view}`);
    state.all = res.memos || [];
  } catch (err) {
    state.all = [];
  }
}

async function loadMeta() {
  try {
    labels = await api('GET', '/labels') || [];
  } catch (err) { /* ignore */ }
  renderNav();
  renderLabels();
}

// ===================================================================
// Composer
// ===================================================================

function expandComposer(asChecklist) {
  const wasCollapsed = composer.classList.contains('collapsed');
  if (wasCollapsed) {
    composer.classList.remove('collapsed');
    renderComposerColors();
    renderComposerChips();
    renderComposerImages();
  }
  setComposerChecklist(!!asChecklist);
  if (composerChecklist) {
    const inp = composerChecklistEl.querySelector('.cl-add-input');
    if (inp) inp.focus(); else editor.focus();
  } else {
    editor.focus();
  }
}

// Open the composer in note mode and seed a Markdown numbered list, ready to type.
// Pressing Enter then continues the numbering automatically (continueListOnEnter).
function startNumberedList() {
  expandComposer(false);
  if (editor.value.trim() === '') {
    editor.value = '1. ';
  } else {
    editor.value += (/\n$/.test(editor.value) ? '' : '\n') + '1. ';
  }
  editor.focus();
  editor.selectionStart = editor.selectionEnd = editor.value.length;
  autosize(editor);
}

function renderComposerColors() {
  composerColorsEl.innerHTML = '';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.name === '' ? ' is-default' : '') + (composerColor === c.name ? ' is-selected' : '');
    if (c.name) sw.dataset.color = c.name;
    sw.title = t(c.label);
    sw.setAttribute('aria-label', t(c.label));
    sw.addEventListener('click', (e) => {
      // Stop the click-away handler from collapsing the composer when this
      // element is detached by the innerHTML reset below.
      e.stopPropagation();
      composerColor = c.name;
      if (c.name) composer.dataset.color = c.name; else delete composer.dataset.color;
      renderComposerColors();
    });
    composerColorsEl.appendChild(sw);
  });
}

function renderComposerChips() {
  composerChips.innerHTML = '';
  composerChips.hidden = composerLabels.length === 0;
  composerLabels.forEach((name) => {
    const chip = document.createElement('span');
    chip.className = 'composer-chip';
    chip.innerHTML = `${icon('label', 13)}<span>${escapeHtml(name)}</span>`;
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'composer-chip-x';
    x.title = 'Remove label';
    x.setAttribute('aria-label', 'Remove label');
    x.innerHTML = icon('close', 12);
    x.addEventListener('click', (e) => {
      e.stopPropagation();
      composerLabels = composerLabels.filter((l) => l !== name);
      renderComposerChips();
    });
    chip.appendChild(x);
    composerChips.appendChild(chip);
  });
}

// Render the composer's image strip (removable thumbnails) from composerImages.
function renderComposerImages() {
  fillImageStrip(composerImagesEl, composerImages, (i) => {
    composerImages.splice(i, 1);
    renderComposerImages();
  });
}

// Downscale picked files and append them to the draft (respecting MAX_IMAGES),
// expanding the composer if it was still collapsed.
async function onComposerImageFiles(fileList) {
  const room = MAX_IMAGES - composerImages.length;
  if (room <= 0) return;
  const urls = await filesToDataURLs(fileList, room);
  if (!urls.length) return;
  composerImages = composerImages.concat(urls).slice(0, MAX_IMAGES);
  if (composer.classList.contains('collapsed')) expandComposer(false);
  renderComposerImages();
}

// Render the composer's interactive checklist editor (items + add-row) from the
// in-memory composerItems. Toggles and adds update local state only (the note is
// not created until commit) and keep the canonical order (unchecked-first per
// section; "## …" adds a subheading that starts a new section).
function renderComposerChecklist() {
  composerChecklistEl.innerHTML = '';
  // Normalize order so the preview/commit and the UI agree.
  composerItems = parseChecklist(buildChecklistContent(composerItems));
  buildChecklistRows(composerChecklistEl, composerItems, {
    interactive: true,
    editable: true,
    collapsed: false,
    showRemove: true,
    onToggle: (index) => {
      composerItems = parseChecklist(toggleChecklistItem(buildChecklistContent(composerItems), index));
      renderComposerChecklist();
    },
    onRemove: (index) => {
      composerItems = parseChecklist(removeChecklistItem(buildChecklistContent(composerItems), index));
      renderComposerChecklist();
    },
    onEdit: (index, text) => {
      composerItems = parseChecklist(setChecklistEntryText(buildChecklistContent(composerItems), index, text));
      renderComposerChecklist();
    },
    onMove: (from, over, before) => {
      composerItems = parseChecklist(reorderChecklist(buildChecklistContent(composerItems), from, over, before));
      renderComposerChecklist();
    },
  });
  composerChecklistEl.appendChild(makeAddItemRow((text, keepFocus) => {
    const entry = parseAddEntry(text);
    composerItems.push(entry.heading
      ? { heading: true, text: entry.text }
      : { checked: false, text: entry.text });
    renderComposerChecklist();
    // Refocus the (re-rendered) add input for fast sequential entry on Enter;
    // on blur, leave focus where the user clicked.
    if (keepFocus) {
      const inp = composerChecklistEl.querySelector('.cl-add-input');
      if (inp) inp.focus();
    }
  }));
}

// Seed composerItems from whatever the user typed in the plain textarea (so the
// "New list" toggle never loses in-progress lines), then switch to list mode.
function syncTextareaToItems() {
  const lines = editor.value.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  composerItems = lines.map((l) => {
    const h = l.match(/^#{1,6}\s+(.*)$/);
    if (h && h[1].trim()) return { heading: true, text: h[1].trim() };
    const m = l.match(/^[-*+]\s+\[([ xX])\]\s?(.*)$/);
    if (m) return { checked: m[1].toLowerCase() === 'x', text: m[2] };
    return { checked: false, text: l.replace(/^[-*+]\s+/, '') };
  });
}

// Toggle the composer between note and checklist modes, migrating content both
// ways so nothing is lost.
function setComposerChecklist(on) {
  if (on === composerChecklist) return;
  if (on) {
    syncTextareaToItems();
  } else {
    // Back to note mode: fold the list back into the textarea as task lines.
    editor.value = buildChecklistContent(composerItems);
    autosize(editor);
  }
  composerChecklist = on;
  composer.classList.toggle('is-checklist', on);
  editor.hidden = on;
  composerChecklistEl.hidden = !on;
  editor.placeholder = on
    ? 'List item'
    : 'Take a note…  (Markdown & tables supported)';
  if (on) renderComposerChecklist();
}

// Build content + checklist flag from the composer, honoring checklist mode.
function composerPayload() {
  if (composerChecklist) {
    return { content: buildChecklistContent(composerItems), checklist: true };
  }
  return { content: editor.value.trim(), checklist: false };
}

async function commitComposer() {
  const { content, checklist } = composerPayload();
  const title = composerTitle.value.trim();

  // Snapshot scratch state, then reset the composer UI immediately.
  const color = composerColor;
  const labelsToSend = composerLabels.slice();
  const imagesToSend = composerImages.slice();
  resetComposer();

  if (content || title || imagesToSend.length) {
    try {
      const m = await api('POST', '/memos', { title, content, color, labels: labelsToSend, checklist, images: imagesToSend });
      // A new note belongs to the active view; only show it if we're there.
      if (state.view === 'active') {
        state.all.unshift(m);
        render();
      }
      loadMeta();
    } catch (err) { alert(err.message); }
  }
}

function resetComposer() {
  composer.classList.add('collapsed');
  composer.classList.remove('is-checklist');
  composerPreviewBox.hidden = true;
  editor.hidden = false;
  composerPreviewBtn.textContent = t('preview');
  editor.value = '';
  composerTitle.value = '';
  autosize(editor);
  composerColor = '';
  composerLabels = [];
  composerChecklist = false;
  composerItems = [];
  composerImages = [];
  composerChecklistEl.hidden = true;
  composerChecklistEl.innerHTML = '';
  composerImagesEl.hidden = true;
  composerImagesEl.innerHTML = '';
  delete composer.dataset.color;
  composerChips.hidden = true;
  composerChips.innerHTML = '';
}

// ===================================================================
// Theme, language + sidebar
// ===================================================================

// The stored color-scheme choice: 'system' (default), 'light' or 'dark'.
function currentTheme() {
  try {
    const v = localStorage.getItem('notavex-theme');
    if (v === 'light' || v === 'dark') return v;
  } catch (e) { /* ignore */ }
  return 'system';
}

function applyTheme(choice) {
  if (choice === 'light' || choice === 'dark') document.documentElement.dataset.theme = choice;
  else delete document.documentElement.dataset.theme; // 'system' -> follow the OS
}

// Persist and apply a color-scheme choice (System/Light/Dark from Settings).
function setTheme(choice) {
  try {
    if (choice === 'light' || choice === 'dark') localStorage.setItem('notavex-theme', choice);
    else localStorage.removeItem('notavex-theme');
  } catch (e) { /* ignore */ }
  applyTheme(choice);
}

function closeSidebar() { document.body.classList.remove('sidebar-open'); }

function isNarrow() { return matchMedia('(max-width: 720px)').matches; }

// Desktop rail-collapse state lives in body.sidebar-collapsed and is persisted.
// On mobile the hamburger opens the drawer instead, so the rail never applies.
function applyRail(collapsed) { document.body.classList.toggle('sidebar-collapsed', collapsed); }

function loadRail() {
  let collapsed = false;
  try { collapsed = localStorage.getItem('notavex-rail') === '1'; } catch (e) { /* ignore */ }
  applyRail(collapsed && !isNarrow());
}

// The hamburger: collapse/expand the rail on desktop, open/close the drawer on
// mobile.
function toggleSidebar() {
  if (isNarrow()) {
    document.body.classList.toggle('sidebar-open');
    return;
  }
  const collapsed = !document.body.classList.contains('sidebar-collapsed');
  applyRail(collapsed);
  try { localStorage.setItem('notavex-rail', collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
}

// ===================================================================
// Account menu + dialogs (account / settings)
// ===================================================================

function closeAccountMenu() {
  accountMenu.hidden = true;
  accountBtn.setAttribute('aria-expanded', 'false');
}
function openAccountMenu() {
  accountMenu.hidden = false;
  accountBtn.setAttribute('aria-expanded', 'true');
}

function initAccountMenu() {
  accountBtn.innerHTML = icon('person', 20);
  accountProfileBtn.querySelector('.account-ico').innerHTML = icon('person', 18);
  accountSettingsBtn.querySelector('.account-ico').innerHTML = icon('gear', 18);
  accountLogoutBtn.querySelector('.account-ico').innerHTML = icon('logout', 18);

  accountBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (accountMenu.hidden) openAccountMenu(); else closeAccountMenu();
  });
  accountProfileBtn.addEventListener('click', () => { closeAccountMenu(); openAccountDialog(); });
  accountSettingsBtn.addEventListener('click', () => { closeAccountMenu(); openSettingsDialog(); });
  accountLogoutBtn.addEventListener('click', async () => {
    closeAccountMenu();
    try { await api('POST', '/logout'); } catch (err) { /* ignore */ }
    window.location.href = '/login';
  });

  document.addEventListener('click', (e) => { if (!accountWrap.contains(e.target)) closeAccountMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAccountMenu(); });
}

// Build a modal dialog shell with a header (title + ✕) and an empty body.
// Returns { body, close }; close() tears the dialog down.
function buildDialog(titleText) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const head = document.createElement('div');
  head.className = 'dialog-head';
  const h = document.createElement('h2');
  h.textContent = titleText;
  head.append(h, iconButton('close', t('close'), () => close()));

  const body = document.createElement('div');
  body.className = 'dialog-body';
  dialog.append(head, body);
  backdrop.appendChild(dialog);

  function close() {
    backdrop.remove();
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey, true);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  }
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) backdrop._down = true; });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && backdrop._down) close();
    backdrop._down = false;
  });
  document.addEventListener('keydown', onKey, true);

  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');
  return { body, close };
}

function settingRow(labelText, control) {
  const row = document.createElement('div');
  row.className = 'setting-row';
  const lab = document.createElement('span');
  lab.className = 'setting-label';
  lab.textContent = labelText;
  row.append(lab, control);
  return row;
}

// A segmented switch. options = [[value, label], …]; onPick(value) on change.
function segmented(options, current, onPick) {
  const wrap = document.createElement('div');
  wrap.className = 'seg';
  options.forEach(([value, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seg-btn' + (value === current ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      wrap.querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      onPick(value);
    });
    wrap.appendChild(b);
  });
  return wrap;
}

// Settings: color scheme (System/Light/Dark) + language (EN/DE), both persisted.
function openSettingsDialog() {
  const { body } = buildDialog(t('settings_title'));

  const section = document.createElement('div');
  section.className = 'dialog-section';
  const stitle = document.createElement('div');
  stitle.className = 'dialog-section-title';
  stitle.textContent = t('appearance');
  section.appendChild(stitle);

  section.appendChild(settingRow(t('color_theme'), segmented(
    [['system', t('theme_system')], ['light', t('theme_light')], ['dark', t('theme_dark')]],
    currentTheme(),
    setTheme,
  )));
  section.appendChild(settingRow(t('language'), segmented(
    [['en', 'EN'], ['de', 'DE']],
    lang,
    setLang, // persists + reloads
  )));

  body.appendChild(section);

  // User management is admin-only (mirrors epulonis: only admins add/remove).
  if (state.user && state.user.isAdmin) {
    body.appendChild(buildUsersSection());
  }
}

// The admin-only "Users" section: a live list plus an add-user form.
function buildUsersSection() {
  const section = document.createElement('div');
  section.className = 'dialog-section';
  const title = document.createElement('div');
  title.className = 'dialog-section-title';
  title.textContent = t('users_title');
  section.append(title, fieldHint(t('users_sub')));

  const list = document.createElement('div');
  list.className = 'user-list';
  section.appendChild(list);

  const msg = document.createElement('p');
  msg.className = 'dialog-msg';
  msg.hidden = true;
  section.appendChild(msg);
  const showMsg = (text, ok) => {
    msg.textContent = text;
    msg.className = 'dialog-msg ' + (ok ? 'ok' : 'err');
    msg.hidden = false;
  };

  const refresh = async () => {
    try {
      renderUserList(list, await api('GET', '/users'), refresh, showMsg);
    } catch (err) { /* ignore */ }
  };
  refresh();

  const form = document.createElement('form');
  form.autocomplete = 'off';
  const uname = textField(t('login_user'), '');
  uname.input.placeholder = t('new_username_ph');
  const dname = textField(t('display_name'), '');
  dname.input.placeholder = t('display_name_ph');
  const pass = passwordField(t('login_password'), 'new-password');
  const grid = document.createElement('div');
  grid.className = 'grid-2';
  grid.append(uname.field, dname.field);
  form.append(grid, pass.field);

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const add = document.createElement('button');
  add.type = 'submit';
  add.className = 'btn-primary';
  add.textContent = t('add_user');
  actions.appendChild(add);
  form.appendChild(actions);
  section.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    add.disabled = true;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: uname.input.value, displayName: dname.input.value, password: pass.input.value }),
      });
      if (res.ok) {
        uname.input.value = dname.input.value = pass.input.value = '';
        showMsg(t('saved'), true);
        refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        showMsg(apiErrorMessage(data.error), false);
      }
    } catch (err) {
      showMsg(t('err_generic'), false);
    } finally {
      add.disabled = false;
    }
  });

  return section;
}

// Render the account rows (name, admin/you badges, @username, delete) into list.
function renderUserList(list, users, refresh, showMsg) {
  list.innerHTML = '';
  users.forEach((u) => {
    const row = document.createElement('div');
    row.className = 'user-row';

    const text = document.createElement('div');
    text.className = 'user-row-text';
    const name = document.createElement('span');
    name.className = 'user-row-name';
    name.textContent = u.displayName || u.username;
    if (u.isAdmin) name.appendChild(badge(t('role_admin'), 'admin'));
    if (state.user && u.id === state.user.id) name.appendChild(badge(t('you'), 'you'));
    const sub = document.createElement('span');
    sub.className = 'user-row-sub';
    sub.textContent = '@' + u.username;
    text.append(name, sub);
    row.appendChild(text);

    const del = iconButton('trash', t('remove'), async () => {
      const self = state.user && u.id === state.user.id;
      if (!confirm(self ? t('confirm_delete_self') : t('confirm_delete_user'))) return;
      try {
        const res = await fetch('/api/users/' + u.id, { method: 'DELETE' });
        if (res.status === 204) {
          if (self) { window.location.href = '/login'; return; }
          refresh();
        } else {
          const data = await res.json().catch(() => ({}));
          showMsg(apiErrorMessage(data.error), false);
        }
      } catch (err) {
        showMsg(t('err_generic'), false);
      }
    }, 'danger');
    row.appendChild(del);
    list.appendChild(row);
  });
}

function badge(label, kind) {
  const b = document.createElement('span');
  b.className = 'badge badge-' + kind;
  b.textContent = label;
  return b;
}

function passwordField(labelText, autocomplete) {
  const field = document.createElement('div');
  field.className = 'field';
  const id = 'pf-' + Math.random().toString(36).slice(2, 8);
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'password';
  input.id = id;
  input.autocomplete = autocomplete;
  field.append(label, input);
  return { field, input };
}

function textField(labelText, value) {
  const field = document.createElement('div');
  field.className = 'field';
  const id = 'tf-' + Math.random().toString(36).slice(2, 8);
  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.value = value || '';
  field.append(label, input);
  return { field, input };
}

function fieldHint(text) {
  const p = document.createElement('p');
  p.className = 'field-hint';
  p.textContent = text;
  return p;
}

// Map a server error code (the JSON "error" field) to a localized message.
function apiErrorMessage(code) {
  const map = {
    invalid_username: 'err_invalid_username',
    weak_password: 'pw_too_short',
    taken: 'err_taken',
    last_user: 'err_last_user',
    last_admin: 'err_last_admin',
    current: 'pw_wrong_current',
  };
  return t(map[code] || 'err_generic');
}

// Reflect the logged-in account in the account menu (card + visible items).
function updateAccountUI() {
  const loggedIn = !!state.user;
  accountProfileBtn.hidden = !loggedIn;
  accountLogoutBtn.hidden = !loggedIn;
  if (accountCard) {
    accountCard.hidden = !loggedIn;
    if (loggedIn) {
      accountCardName.textContent = state.user.displayName || state.user.username;
      accountCardSub.textContent = '@' + state.user.username;
    }
  }
}

// Account (Konto): username (read-only), display name, and a password change.
// One Save updates the display name and/or the password (password optional).
function openAccountDialog() {
  const { body, close } = buildDialog(t('account_title'));
  const u = state.user || { username: '', displayName: '' };

  const msg = document.createElement('p');
  msg.className = 'dialog-msg';
  msg.hidden = true;
  body.appendChild(msg);
  const showMsg = (text, ok) => {
    msg.textContent = text;
    msg.className = 'dialog-msg ' + (ok ? 'ok' : 'err');
    msg.hidden = false;
  };

  const form = document.createElement('form');
  form.autocomplete = 'off';

  const uname = textField(t('account_username'), '@' + u.username);
  uname.input.disabled = true;
  const dname = textField(t('display_name'), u.displayName || '');
  dname.input.placeholder = t('display_name_ph');
  form.append(uname.field, fieldHint(t('username_locked')), dname.field);

  const pwTitle = document.createElement('div');
  pwTitle.className = 'dialog-section-title';
  pwTitle.textContent = t('change_password');
  const cur = passwordField(t('current_password'), 'current-password');
  const nw = passwordField(t('new_password'), 'new-password');
  const cf = passwordField(t('confirm_password'), 'new-password');
  form.append(pwTitle, cur.field, nw.field, cf.field, fieldHint(t('password_optional')));

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'text-btn';
  cancel.textContent = t('cancel');
  cancel.addEventListener('click', () => close());
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'btn-primary';
  save.textContent = t('save');
  actions.append(cancel, save);
  form.appendChild(actions);
  body.appendChild(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    save.disabled = true;
    let done = null; // success message to show on close
    try {
      // 1) Display name (only if it changed).
      const newName = dname.input.value.trim();
      if (state.user && newName !== (state.user.displayName || '')) {
        const res = await fetch('/api/profile', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: newName }),
        });
        if (!res.ok) { showMsg(t('err_generic'), false); return; }
        const pu = await res.json().catch(() => null);
        if (pu) { state.user = pu; updateAccountUI(); }
        done = t('saved');
      }
      // 2) Password (only if any password field is filled).
      if (cur.input.value || nw.input.value || cf.input.value) {
        if (!cur.input.value || !nw.input.value || !cf.input.value) { showMsg(t('pw_required'), false); return; }
        if (nw.input.value !== cf.input.value) { showMsg(t('pw_mismatch'), false); return; }
        if (nw.input.value.length < 4) { showMsg(t('pw_too_short'), false); return; }
        const res = await fetch('/api/password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: cur.input.value, newPassword: nw.input.value }),
        });
        if (res.ok) {
          cur.input.value = nw.input.value = cf.input.value = '';
          done = t('pw_changed');
        } else {
          const data = await res.json().catch(() => ({}));
          showMsg(apiErrorMessage(data.error), false);
          return;
        }
      }
      if (done) { showMsg(done, true); setTimeout(close, 1200); }
      else { close(); }
    } catch (err) {
      showMsg(t('err_generic'), false);
    } finally {
      save.disabled = false;
    }
  });

  dname.input.focus();
}

// ===================================================================
// Init
// ===================================================================

function paintStaticIcons() {
  navToggle.innerHTML = icon('menu', 22);
  $('#brand-logo').innerHTML = icon('logo', 24);
  composerNewList.innerHTML = icon('checklist', 20);
  composerNewNumList.innerHTML = icon('listNumbered', 20);
  composerImageCollapsed.innerHTML = icon('image', 20);
  composerLabelBtn.innerHTML = icon('label', 18);
  composerListBtn.innerHTML = icon('checklist', 18);
  composerImageBtn.innerHTML = icon('image', 18);
}

async function init() {
  applyI18n();
  applyTheme(currentTheme());
  loadRail();
  paintStaticIcons();
  initAccountMenu();

  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSidebar();
  });
  scrim.addEventListener('click', closeSidebar);

  // Composer wiring.
  composerCollapsed.addEventListener('click', () => expandComposer(false));
  composerCollapsed.addEventListener('focus', () => expandComposer(false));
  composerNewList.addEventListener('click', (e) => { e.stopPropagation(); expandComposer(true); });
  composerNewNumList.addEventListener('click', (e) => { e.stopPropagation(); startNumberedList(); });
  composerImageBtn.addEventListener('click', (e) => { e.stopPropagation(); composerImageFile.click(); });
  composerImageCollapsed.addEventListener('click', (e) => { e.stopPropagation(); expandComposer(false); composerImageFile.click(); });
  composerImageFile.addEventListener('change', async () => {
    await onComposerImageFiles(composerImageFile.files);
    composerImageFile.value = ''; // allow re-picking the same file
  });
  composerCloseBtn.addEventListener('click', commitComposer);
  composer.addEventListener('submit', (e) => { e.preventDefault(); commitComposer(); });
  editor.addEventListener('input', () => autosize(editor));
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitComposer(); return; }
    if (e.key === 'Escape') { e.preventDefault(); resetComposer(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey
      && continueListOnEnter(editor)) e.preventDefault();
  });
  composerTitle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); editor.focus(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitComposer(); }
    if (e.key === 'Escape') { e.preventDefault(); resetComposer(); }
  });
  composerLabelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openLabelPopover(e.currentTarget, composerLabels, (next) => {
      composerLabels = next;
      renderComposerChips();
    });
  });
  composerListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setComposerChecklist(!composerChecklist);
    if (composerChecklist) {
      const inp = composerChecklistEl.querySelector('.cl-add-input');
      if (inp) inp.focus();
    } else {
      editor.focus();
    }
  });
  composerPreviewBtn.addEventListener('click', () => {
    const show = composerPreviewBox.hidden;
    composerPreviewBox.hidden = !show;
    // Hide whichever editor body is active while previewing.
    if (composerChecklist) composerChecklistEl.hidden = show;
    else editor.hidden = show;
    composerPreviewBtn.textContent = show ? t('edit') : t('preview');
    if (show) {
      const { content } = composerPayload();
      composerPreviewBox.innerHTML = renderMarkdown(content) || `<p class="muted">${escapeHtml(t('nothing_preview'))}</p>`;
    }
  });

  searchInput.addEventListener('input', debounce(() => {
    state.query = searchInput.value.trim();
    state.label = '';
    renderNav();
    renderLabels();
    render();
  }, 200));

  // Click-away: commit the composer, close popovers, close the mobile drawer.
  // Clicks on detached nodes or inside a popover are ignored (see the color bug
  // fix — a swatch can be removed mid-click by an innerHTML reset).
  document.addEventListener('click', (e) => {
    if (isProtectedClick(e)) return;
    // While the modal is open the composer is inert behind it; only manage
    // popovers (e.g. a color/label popover opened from the modal bar).
    if (!modalMemo && !composer.classList.contains('collapsed') && !composer.contains(e.target)) commitComposer();
    closePopovers();
    if (!modalMemo && document.body.classList.contains('sidebar-open')
      && !sidebar.contains(e.target) && e.target !== navToggle) closeSidebar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePopovers();
  });

  window.addEventListener('resize', debounce(() => { closePopovers(); relayoutAll(); loadRail(); }, 150));
  // Popovers are anchored in page coordinates; drop them on scroll to avoid drift.
  window.addEventListener('scroll', () => closePopovers(), { passive: true });

  // Save-on-leave (Ctrl+W / navigation): flush pending edits, then if a save is
  // still in flight ask the browser to confirm leaving so it can complete.
  window.addEventListener('beforeunload', (e) => {
    flushModalOnUnload();
    if (pendingSaves > 0) { e.preventDefault(); e.returnValue = ''; }
  });

  try {
    const cfg = await api('GET', '/config');
    state.authEnabled = cfg.authEnabled;
    state.user = cfg.user || null;
  } catch (err) { /* ignore */ }
  updateAccountUI();

  renderNav();
  renderLabels();
  await loadMemos();
  render();
  await loadMeta();
}

init();
