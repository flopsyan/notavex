'use strict';

// ===================================================================
// Jot — single-page notes UI
// ===================================================================

const PAGE_SIZE = 20;

const state = {
  authEnabled: false,
  query: '',
  tag: '',
  memos: [],
  offset: 0,
  total: 0,
};

// ---------- tiny helpers ----------

const $ = (sel) => document.querySelector(sel);

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
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
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
// Markdown rendering (safe: all input is HTML-escaped first, and only a
// fixed set of tags is emitted; link/image URLs are sanitized).
// ===================================================================

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function sanitizeUrl(url) {
  const u = url.trim();
  if (/^(https?:\/\/|mailto:|\/|#|\.\.?\/)/i.test(u)) return u;
  // Allow relative paths (no scheme); reject javascript:, data:, vbscript:, …
  if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  return '#';
}

function renderInline(text) {
  // `text` is already HTML-escaped. Protect inline code spans first so their
  // contents are not touched by the other transforms.
  const codeSpans = [];
  text = text.replace(/`([^`]+)`/g, (_, c) => {
    codeSpans.push(c);
    return '\x00C' + (codeSpans.length - 1) + '\x00';
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

  // Highlight #tags so they look clickable in rendered notes.
  text = text.replace(/(^|\s)#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu,
    (_, pre, tag) => `${pre}<span class="hashtag" data-tag="${tag.toLowerCase()}">#${tag}</span>`);

  // Autolink bare URLs (those not already inside a markdown link).
  text = text.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,
    (_, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);

  return text.replace(/\x00C(\d+)\x00/g, (_, i) => `<code>${codeSpans[+i]}</code>`);
}

function renderMarkdown(src) {
  if (!src) return '';
  src = src.replace(/\r\n?/g, '\n');

  // Pull fenced code blocks out first so their contents are left verbatim.
  const blocks = [];
  src = src.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return '\x00B' + (blocks.length - 1) + '\x00';
  });
  const blockToken = (l) => /^\x00B(\d+)\x00$/.exec(l.trim());

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

    let m = line.match(/^(#{1,6})\s+(.*)$/);
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

  return html.replace(/\x00B(\d+)\x00/g, (full, idx) =>
    blocks[+idx] !== undefined ? blocks[+idx] : full);
}

// ===================================================================
// Rendering the timeline
// ===================================================================

function iconButton(label, title, onClick) {
  const b = document.createElement('button');
  b.className = 'icon-btn';
  b.type = 'button';
  b.textContent = label;
  b.title = title;
  b.setAttribute('aria-label', title);
  b.addEventListener('click', onClick);
  return b;
}

function memoCard(m) {
  const el = document.createElement('article');
  el.className = 'memo' + (m.pinned ? ' pinned' : '');
  el.dataset.id = m.id;

  const body = document.createElement('div');
  body.className = 'markdown';
  body.innerHTML = renderMarkdown(m.content);
  body.querySelectorAll('.hashtag').forEach((tagEl) => {
    tagEl.addEventListener('click', () => filterByTag(tagEl.dataset.tag));
  });
  el.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'memo-footer';

  const meta = document.createElement('div');
  meta.className = 'memo-meta';
  const time = document.createElement('time');
  time.textContent = formatRelative(m.createdAt);
  time.dateTime = m.createdAt;
  time.title = new Date(m.createdAt).toLocaleString();
  meta.appendChild(time);
  if (m.updatedAt && m.updatedAt !== m.createdAt) {
    const edited = document.createElement('span');
    edited.className = 'edited';
    edited.textContent = '· edited';
    edited.title = 'Edited ' + new Date(m.updatedAt).toLocaleString();
    meta.appendChild(edited);
  }
  footer.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'memo-actions';
  actions.appendChild(iconButton(m.pinned ? '📌' : '📍', m.pinned ? 'Unpin' : 'Pin', () => togglePin(m)));
  actions.appendChild(iconButton('✏️', 'Edit', () => startEdit(el, m)));
  actions.appendChild(iconButton('🗑️', 'Delete', () => removeMemo(m)));
  footer.appendChild(actions);

  el.appendChild(footer);
  return el;
}

function renderList() {
  const list = $('#memo-list');
  list.innerHTML = '';
  state.memos.forEach((m) => list.appendChild(memoCard(m)));

  const empty = $('#empty');
  if (state.memos.length === 0) {
    empty.hidden = false;
    empty.textContent = state.query || state.tag
      ? 'No notes match your filter.'
      : 'No notes yet. Write your first one above ✍️';
  } else {
    empty.hidden = true;
  }
  $('#load-more').hidden = state.memos.length >= state.total;
}

function replaceMemo(m) {
  const idx = state.memos.findIndex((x) => x.id === m.id);
  if (idx >= 0) state.memos[idx] = m;
  const old = document.querySelector(`.memo[data-id="${m.id}"]`);
  if (old) old.replaceWith(memoCard(m));
}

// ===================================================================
// Editing in place
// ===================================================================

function startEdit(el, m) {
  el.classList.add('is-editing');
  el.innerHTML = '';

  const ta = document.createElement('textarea');
  ta.className = 'edit-area';
  ta.value = m.content;

  const bar = document.createElement('div');
  bar.className = 'edit-bar';
  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'ghost';
  cancel.textContent = 'Cancel';
  bar.append(save, cancel);

  save.addEventListener('click', async () => {
    const content = ta.value.trim();
    if (!content) return;
    try {
      replaceMemo(await api('PUT', '/memos/' + m.id, { content }));
      refreshSidebar();
    } catch (err) { alert(err.message); }
  });
  cancel.addEventListener('click', () => replaceMemo(m));
  ta.addEventListener('input', () => autosize(ta));
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save.click(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel.click(); }
  });

  el.append(ta, bar);
  autosize(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

// ===================================================================
// Actions
// ===================================================================

async function togglePin(m) {
  try {
    await api('POST', `/memos/${m.id}/pin`, { pinned: !m.pinned });
    await loadMemos(true); // re-sort (pinned float to the top)
  } catch (err) { alert(err.message); }
}

async function removeMemo(m) {
  if (!confirm('Delete this note? This cannot be undone.')) return;
  try {
    await api('DELETE', '/memos/' + m.id);
    state.memos = state.memos.filter((x) => x.id !== m.id);
    state.total = Math.max(0, state.total - 1);
    document.querySelector(`.memo[data-id="${m.id}"]`)?.remove();
    renderList();
    refreshSidebar();
  } catch (err) { alert(err.message); }
}

async function createMemo(content) {
  await api('POST', '/memos', { content });
  await loadMemos(true);
  refreshSidebar();
}

// ===================================================================
// Loading + filtering
// ===================================================================

async function loadMemos(reset = true) {
  if (reset) state.offset = 0;
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);
  if (state.tag) params.set('tag', state.tag);
  params.set('limit', PAGE_SIZE);
  params.set('offset', state.offset);

  const res = await api('GET', '/memos?' + params.toString());
  state.memos = reset ? res.memos : state.memos.concat(res.memos);
  state.total = res.total;
  state.offset = state.memos.length;
  renderList();
}

function updateFilterBar() {
  const bar = $('#filter-bar');
  const chip = $('#filter-chip');
  if (state.tag) {
    bar.hidden = false;
    chip.textContent = '#' + state.tag;
  } else if (state.query) {
    bar.hidden = false;
    chip.textContent = `“${state.query}”`;
  } else {
    bar.hidden = true;
  }
  document.querySelectorAll('#tag-cloud .tag').forEach((t) => {
    t.classList.toggle('active', t.dataset.tag === state.tag);
  });
}

function filterByTag(tag) {
  state.tag = state.tag === tag ? '' : tag;
  state.query = '';
  $('#search').value = '';
  updateFilterBar();
  loadMemos(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearFilter() {
  state.tag = '';
  state.query = '';
  $('#search').value = '';
  updateFilterBar();
  loadMemos(true);
}

async function refreshSidebar() {
  try {
    const [stats, tags] = await Promise.all([
      api('GET', '/stats'),
      api('GET', '/tags'),
    ]);
    $('#stats').innerHTML =
      `<span><strong>${stats.memos}</strong> notes</span><span><strong>${stats.tags}</strong> tags</span>`;

    const cloud = $('#tag-cloud');
    if (!tags.length) {
      cloud.innerHTML = '<span class="muted">No tags yet</span>';
    } else {
      cloud.innerHTML = '';
      tags.forEach((t) => {
        const b = document.createElement('button');
        b.className = 'tag';
        b.type = 'button';
        b.dataset.tag = t.name;
        b.innerHTML = `#${t.name}<span class="tag-count">${t.count}</span>`;
        b.addEventListener('click', () => filterByTag(t.name));
        cloud.appendChild(b);
      });
    }
    updateFilterBar();
  } catch (err) { /* sidebar is non-critical */ }
}

// ===================================================================
// Theme
// ===================================================================

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme
    || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('jot-theme', next);
  applyTheme(next);
}

// ===================================================================
// Wiring
// ===================================================================

function setupComposer() {
  const form = $('#composer');
  const editor = $('#editor');
  const preview = $('#preview');
  const previewToggle = $('#preview-toggle');

  editor.addEventListener('input', () => autosize(editor));

  previewToggle.addEventListener('click', () => {
    const show = preview.hidden;
    preview.hidden = !show;
    editor.hidden = show;
    previewToggle.textContent = show ? 'Edit' : 'Preview';
    if (show) preview.innerHTML = renderMarkdown(editor.value) || '<p class="muted">Nothing to preview.</p>';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = editor.value.trim();
    if (!content) return;
    try {
      await createMemo(content);
      editor.value = '';
      autosize(editor);
      preview.hidden = true;
      editor.hidden = false;
      previewToggle.textContent = 'Preview';
      editor.focus();
    } catch (err) { alert(err.message); }
  });

  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

async function init() {
  applyTheme(localStorage.getItem('jot-theme'));
  $('#theme-toggle').addEventListener('click', toggleTheme);

  try {
    const cfg = await api('GET', '/config');
    state.authEnabled = cfg.authEnabled;
    $('#logout').hidden = !cfg.authEnabled;
  } catch (err) { /* ignore */ }

  $('#logout').addEventListener('click', async () => {
    await api('POST', '/logout');
    window.location.href = '/login';
  });

  setupComposer();

  $('#search').addEventListener('input', debounce((e) => {
    state.query = e.target.value.trim();
    state.tag = '';
    updateFilterBar();
    loadMemos(true);
  }, 250));

  $('#clear-filter').addEventListener('click', clearFilter);
  $('#load-more').addEventListener('click', () => loadMemos(false));

  await loadMemos(true);
  await refreshSidebar();
}

init();
