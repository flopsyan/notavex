'use strict';

// ===================================================================
// Jot — Google Keep-style notes UI
// ===================================================================

const COLORS = [
  { name: '', label: 'Default' },
  { name: 'coral', label: 'Coral' },
  { name: 'peach', label: 'Peach' },
  { name: 'sand', label: 'Sand' },
  { name: 'mint', label: 'Mint' },
  { name: 'sage', label: 'Sage' },
  { name: 'fog', label: 'Fog' },
  { name: 'storm', label: 'Storm' },
  { name: 'dusk', label: 'Dusk' },
  { name: 'blossom', label: 'Blossom' },
  { name: 'clay', label: 'Clay' },
  { name: 'chalk', label: 'Chalk' },
];

const state = { authEnabled: false, all: [], query: '', tag: '' };
let composerColor = '';
let grids = []; // [{ container, cards }] — kept so we can re-layout on resize

// ---------- DOM refs ----------
const $ = (s) => document.querySelector(s);
const searchInput = $('#search');
const themeToggle = $('#theme-toggle');
const logoutBtn = $('#logout');
const navToggle = $('#nav-toggle');
const sidebar = $('#sidebar');
const scrim = $('#scrim');
const navAll = $('#nav-all');
const labelList = $('#label-list');
const composer = $('#composer');
const composerCollapsed = $('#composer-collapsed');
const editor = $('#editor');
const composerColorsEl = $('#composer-colors');
const composerPreviewBtn = $('#composer-preview-btn');
const composerCloseBtn = $('#composer-close');
const composerPreviewBox = $('#composer-preview');
const pinnedSection = $('#pinned-section');
const pinnedGrid = $('#pinned-grid');
const othersLabel = $('#others-label');
const othersGrid = $('#others-grid');
const emptyEl = $('#empty');

// ---------- small helpers ----------

async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
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
  if (secs < 45) return 'just now';
  if (secs < 3600) return Math.round(secs / 60) + 'm ago';
  if (secs < 86400) return Math.round(secs / 3600) + 'h ago';
  if (secs < 604800) return Math.round(secs / 86400) + 'd ago';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function autosize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
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

  text = text.replace(/(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu,
    (_, pre, tag) => `${pre}<span class="hashtag" data-tag="${tag.toLowerCase()}">#${tag}</span>`);

  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  const restore = new RegExp(PH + 'c(\\d+)' + PH, 'g');
  return text.replace(restore, (_, i) => `<code>${codeSpans[+i]}</code>`);
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
  const isBreak = (l) =>
    l.trim() === '' || blockToken(l) ||
    /^(#{1,6})\s+/.test(l) || /^\s*>/.test(l) ||
    /^\s*[-*+]\s+/.test(l) || /^\s*\d+\.\s+/.test(l) ||
    /^\s*([-*_])(\s*\1){2,}\s*$/.test(l);

  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const tok = blockToken(line);

    if (tok) { html += blocks[+tok[1]]; i++; continue; }
    if (line.trim() === '') { i++; continue; }

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
        const task = item.match(/^\[([ xX])\]\s+(.*)$/);
        if (task) {
          const checked = task[1].toLowerCase() === 'x' ? ' checked' : '';
          items += `<li class="task"><input type="checkbox" disabled${checked}> ${renderInline(escapeHtml(task[2]))}</li>`;
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

// ===================================================================
// Notes timeline (masonry)
// ===================================================================

function iconButton(label, title, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

function noteCard(m) {
  const el = document.createElement('article');
  el.className = 'note';
  el.dataset.id = m.id;
  if (m.color) el.dataset.color = m.color;

  const pin = iconButton(m.pinned ? '📌' : '📍', m.pinned ? 'Unpin' : 'Pin', () => togglePin(m));
  pin.classList.add('note-pin');
  el.appendChild(pin);

  const body = document.createElement('div');
  body.className = 'note-body markdown';
  body.innerHTML = renderMarkdown(m.content);
  body.querySelectorAll('.hashtag').forEach((t) =>
    t.addEventListener('click', () => filterByTag(t.dataset.tag)));
  el.appendChild(body);

  if (m.tags && m.tags.length) {
    const tags = document.createElement('div');
    tags.className = 'note-tags';
    m.tags.forEach((t) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'note-tag';
      chip.textContent = '#' + t;
      chip.addEventListener('click', () => filterByTag(t));
      tags.appendChild(chip);
    });
    el.appendChild(tags);
  }

  const actions = document.createElement('div');
  actions.className = 'note-actions';

  const colorBtn = iconButton('🎨', 'Background color', (e) => {
    e.stopPropagation();
    const existing = el.querySelector('.color-popover');
    closeColorPopovers();
    if (!existing) openColorPopover(el, m);
  });
  actions.appendChild(colorBtn);
  actions.appendChild(iconButton('✏️', 'Edit', () => startEdit(el, m)));
  actions.appendChild(iconButton('🗑️', 'Delete', () => removeMemo(m)));

  const time = document.createElement('time');
  time.className = 'note-time';
  time.textContent = formatRelative(m.createdAt);
  time.dateTime = m.createdAt;
  time.title = new Date(m.createdAt).toLocaleString()
    + (m.updatedAt && m.updatedAt !== m.createdAt ? '  ·  edited ' + new Date(m.updatedAt).toLocaleString() : '');
  actions.appendChild(time);

  el.appendChild(actions);
  return el;
}

function openColorPopover(cardEl, m) {
  const pop = document.createElement('div');
  pop.className = 'color-popover';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.name === '' ? ' is-default' : '') + ((m.color || '') === c.name ? ' is-selected' : '');
    if (c.name) sw.dataset.color = c.name;
    sw.title = c.label;
    sw.addEventListener('click', (e) => {
      e.stopPropagation();
      closeColorPopovers();
      setColor(m, c.name);
    });
    pop.appendChild(sw);
  });
  cardEl.appendChild(pop);
}

function closeColorPopovers() {
  document.querySelectorAll('.color-popover').forEach((p) => p.remove());
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

function render() {
  const q = state.query.toLowerCase();
  const filtered = state.all.filter((m) => {
    if (state.tag && !(m.tags || []).includes(state.tag)) return false;
    if (q && !m.content.toLowerCase().includes(q)) return false;
    return true;
  });

  const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id);
  const pinned = filtered.filter((m) => m.pinned).sort(byNewest);
  const others = filtered.filter((m) => !m.pinned).sort(byNewest);

  pinnedSection.hidden = pinned.length === 0;
  othersLabel.hidden = !(pinned.length > 0 && others.length > 0);

  grids = [
    { container: pinnedGrid, cards: pinned.map(noteCard) },
    { container: othersGrid, cards: others.map(noteCard) },
  ];
  relayoutAll();

  emptyEl.hidden = filtered.length !== 0;
  if (filtered.length === 0) {
    emptyEl.textContent = state.all.length === 0
      ? 'Notes you add appear here.'
      : 'No matching notes.';
  }
}

function rebuildCard(m) {
  const old = document.querySelector(`.note[data-id="${m.id}"]`);
  if (!old) { render(); return; }
  const fresh = noteCard(m);
  old.replaceWith(fresh);
  grids.forEach((g) => { const i = g.cards.indexOf(old); if (i >= 0) g.cards[i] = fresh; });
  relayoutAll();
}

// ===================================================================
// Actions
// ===================================================================

async function togglePin(m) {
  try {
    const upd = await api('POST', `/memos/${m.id}/pin`, { pinned: !m.pinned });
    const i = state.all.findIndex((x) => x.id === m.id);
    if (i >= 0) state.all[i] = upd;
    render();
  } catch (err) { alert(err.message); }
}

async function setColor(m, color) {
  try {
    const upd = await api('POST', `/memos/${m.id}/color`, { color });
    const i = state.all.findIndex((x) => x.id === m.id);
    if (i >= 0) state.all[i] = upd;
    const el = document.querySelector(`.note[data-id="${m.id}"]`);
    if (el) {
      if (upd.color) el.dataset.color = upd.color; else delete el.dataset.color;
    }
    relayoutAll();
  } catch (err) { alert(err.message); }
}

async function removeMemo(m) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  try {
    await api('DELETE', '/memos/' + m.id);
    state.all = state.all.filter((x) => x.id !== m.id);
    render();
    renderLabels();
  } catch (err) { alert(err.message); }
}

function startEdit(cardEl, m) {
  closeColorPopovers();
  cardEl.classList.add('is-editing');
  cardEl.innerHTML = '';

  const ta = document.createElement('textarea');
  ta.className = 'note-edit';
  ta.value = m.content;
  const bar = document.createElement('div');
  bar.className = 'note-edit-bar';
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'text-btn';
  done.textContent = 'Done';
  bar.appendChild(done);
  cardEl.append(ta, bar);
  autosize(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  const commit = async () => {
    const content = ta.value.trim();
    if (!content || content === m.content) { rebuildCard(m); return; }
    try {
      const upd = await api('PUT', '/memos/' + m.id, { content });
      const i = state.all.findIndex((x) => x.id === m.id);
      if (i >= 0) state.all[i] = upd;
      rebuildCard(upd);
      renderLabels();
    } catch (err) { alert(err.message); }
  };
  done.addEventListener('click', commit);
  ta.addEventListener('input', () => autosize(ta));
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); rebuildCard(m); }
  });
}

// ===================================================================
// Filtering + labels
// ===================================================================

function renderLabels() {
  const counts = new Map();
  state.all.forEach((m) => (m.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  const tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  labelList.innerHTML = '';
  if (tags.length === 0) {
    labelList.innerHTML = '<div class="nav-empty">No labels yet</div>';
  } else {
    tags.forEach(([name, count]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-item' + (state.tag === name ? ' active' : '');
      b.dataset.tag = name;
      b.innerHTML = `<span class="nav-ico">🏷️</span><span class="nav-text">${escapeHtml(name)}</span><span class="nav-count">${count}</span>`;
      b.addEventListener('click', () => filterByTag(name));
      labelList.appendChild(b);
    });
  }
  navAll.classList.toggle('active', state.tag === '');
}

function filterByTag(tag) {
  state.tag = state.tag === tag ? '' : tag;
  state.query = '';
  searchInput.value = '';
  closeSidebar();
  render();
  renderLabels();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===================================================================
// Composer
// ===================================================================

function expandComposer() {
  if (!composer.classList.contains('collapsed')) return;
  composer.classList.remove('collapsed');
  renderComposerColors();
  editor.focus();
}

function renderComposerColors() {
  composerColorsEl.innerHTML = '';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.name === '' ? ' is-default' : '') + (composerColor === c.name ? ' is-selected' : '');
    if (c.name) sw.dataset.color = c.name;
    sw.title = c.label;
    sw.addEventListener('click', (e) => {
      e.preventDefault();
      composerColor = c.name;
      if (c.name) composer.dataset.color = c.name; else delete composer.dataset.color;
      renderComposerColors();
    });
    composerColorsEl.appendChild(sw);
  });
}

async function commitComposer() {
  const content = editor.value.trim();
  composer.classList.add('collapsed');
  composerPreviewBox.hidden = true;
  editor.hidden = false;
  composerPreviewBtn.textContent = 'Preview';
  if (content) {
    try {
      const m = await api('POST', '/memos', { content, color: composerColor });
      state.all.unshift(m);
      render();
      renderLabels();
    } catch (err) { alert(err.message); }
  }
  editor.value = '';
  autosize(editor);
  composerColor = '';
  delete composer.dataset.color;
}

// ===================================================================
// Theme + sidebar
// ===================================================================

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('jot-theme', next);
  applyTheme(next);
}

function closeSidebar() { document.body.classList.remove('sidebar-open'); }

// ===================================================================
// Init
// ===================================================================

async function init() {
  applyTheme(localStorage.getItem('jot-theme'));
  themeToggle.addEventListener('click', toggleTheme);

  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
  });
  scrim.addEventListener('click', closeSidebar);
  navAll.addEventListener('click', () => {
    state.tag = '';
    state.query = '';
    searchInput.value = '';
    closeSidebar();
    render();
    renderLabels();
  });

  composerCollapsed.addEventListener('click', expandComposer);
  composerCollapsed.addEventListener('focus', expandComposer);
  composerCloseBtn.addEventListener('click', commitComposer);
  composer.addEventListener('submit', (e) => { e.preventDefault(); commitComposer(); });
  editor.addEventListener('input', () => autosize(editor));
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitComposer(); }
    if (e.key === 'Escape') { e.preventDefault(); editor.value = ''; commitComposer(); }
  });
  composerPreviewBtn.addEventListener('click', () => {
    const show = composerPreviewBox.hidden;
    composerPreviewBox.hidden = !show;
    editor.hidden = show;
    composerPreviewBtn.textContent = show ? 'Edit' : 'Preview';
    if (show) composerPreviewBox.innerHTML = renderMarkdown(editor.value) || '<p class="muted">Nothing to preview.</p>';
  });

  searchInput.addEventListener('input', debounce(() => {
    state.query = searchInput.value.trim();
    state.tag = '';
    render();
    renderLabels();
  }, 200));

  logoutBtn.addEventListener('click', async () => {
    try { await api('POST', '/logout'); } catch (err) { /* ignore */ }
    window.location.href = '/login';
  });

  // Click-away: commit the composer, close popovers, close the mobile drawer.
  document.addEventListener('click', (e) => {
    if (!composer.classList.contains('collapsed') && !composer.contains(e.target)) commitComposer();
    document.querySelectorAll('.color-popover').forEach((p) => {
      if (!p.parentElement || !p.parentElement.contains(e.target)) p.remove();
    });
    if (document.body.classList.contains('sidebar-open')
      && !sidebar.contains(e.target) && e.target !== navToggle) closeSidebar();
  });

  window.addEventListener('resize', debounce(relayoutAll, 150));

  try {
    const cfg = await api('GET', '/config');
    state.authEnabled = cfg.authEnabled;
    logoutBtn.hidden = !cfg.authEnabled;
  } catch (err) { /* ignore */ }

  try {
    const res = await api('GET', '/memos');
    state.all = res.memos || [];
  } catch (err) { /* ignore */ }

  render();
  renderLabels();
}

init();
