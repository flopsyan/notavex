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

// view: 'active' | 'archived' | 'trash'
const state = { authEnabled: false, all: [], query: '', label: '', view: 'active' };

// Composer scratch state (reset after each note is committed).
let composerColor = '';
let composerLabels = [];
let composerChecklist = false;
let composerItems = []; // [{checked,text}] when the composer is in checklist mode

let stats = { notes: 0, archived: 0, trashed: 0, labels: 0 };
let labels = []; // [{name, count}] from /api/labels

let grids = []; // [{ container, cards }] — kept so we can re-layout on resize

// ---------- DOM refs ----------
const $ = (s) => document.querySelector(s);
const searchInput = $('#search');
const themeToggle = $('#theme-toggle');
const logoutBtn = $('#logout');
const navToggle = $('#nav-toggle');
const sidebar = $('#sidebar');
const scrim = $('#scrim');
const navList = $('#nav-views');
const labelList = $('#label-list');
const composer = $('#composer');
const composerCollapsed = $('#composer-collapsed');
const composerNewList = $('#composer-newlist');
const composerTitle = $('#composer-title');
const editor = $('#editor');
const composerChecklistEl = $('#composer-checklist');
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
  theme: '<path d="M12 3a9 9 0 1 0 0 18 6.5 6.5 0 0 1 0-13 6.5 6.5 0 0 1 0-5z"/>',
  logout: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
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
        const task = item.match(/^\[([ xX])\]\s+(.*)$/);
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
    const m = lines[k].match(/^(\s*[-*+]\s+\[)([ xX])(\]\s+.*)$/);
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
// Checklist model (Phase B) — markdown task lines as structured items.
// Canonical order in `content`: all unchecked first (in order), then all
// checked (in order). The pure helpers below preserve that invariant so the
// card preview, the modal and a reload always agree.
// ===================================================================

// parseChecklist(content) -> [{checked, text}], reading "- [ ] x" / "- [x] x"
// task lines (fenced code is ignored, matching toggleTaskInContent). Non-task
// lines are dropped — a checklist note's content is exclusively task lines.
function parseChecklist(content) {
  const lines = (content || '').replace(/\r\n?/g, '\n').split('\n');
  const items = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/);
    if (!m) continue;
    items.push({ checked: m[1].toLowerCase() === 'x', text: m[2] });
  }
  return items;
}

// buildChecklistContent(items) -> markdown, enforcing the unchecked-first /
// checked-last invariant regardless of the input array's order.
function buildChecklistContent(items) {
  const unchecked = items.filter((it) => !it.checked);
  const checked = items.filter((it) => it.checked);
  return [...unchecked, ...checked]
    .map((it) => `- [${it.checked ? 'x' : ' '}] ${it.text}`)
    .join('\n');
}

// Toggle the item at display-index `index` (0-based over the unchecked-first
// ordering) and return new content with the invariant restored: a newly-checked
// item sinks to the TOP of the completed group, a newly-unchecked item rises to
// the BOTTOM of the unchecked group.
function toggleChecklistItem(content, index) {
  const items = parseChecklist(content);
  if (index < 0 || index >= items.length) return content;
  const unchecked = items.filter((it) => !it.checked);
  const checked = items.filter((it) => it.checked);
  const ordered = [...unchecked, ...checked];
  const target = ordered[index];
  if (!target) return content;
  const rest = ordered.filter((it) => it !== target);
  target.checked = !target.checked;
  if (target.checked) {
    // Newly checked -> top of completed group (i.e. right after all unchecked).
    const u = rest.filter((it) => !it.checked);
    const c = rest.filter((it) => it.checked);
    return buildChecklistContent([...u, target, ...c]);
  }
  // Newly unchecked -> bottom of the unchecked group.
  const u = rest.filter((it) => !it.checked);
  const c = rest.filter((it) => it.checked);
  return buildChecklistContent([...u, target, ...c]);
}

// Append a new unchecked item at the bottom of the unchecked group.
function appendChecklistItem(content, text) {
  const items = parseChecklist(content);
  const unchecked = items.filter((it) => !it.checked);
  const checked = items.filter((it) => it.checked);
  return buildChecklistContent([...unchecked, { checked: false, text }, ...checked]);
}

// Remove the item at display-index `index` (over the unchecked-first ordering).
function removeChecklistItem(content, index) {
  const items = parseChecklist(content);
  const unchecked = items.filter((it) => !it.checked);
  const checked = items.filter((it) => it.checked);
  const ordered = [...unchecked, ...checked];
  if (index < 0 || index >= ordered.length) return content;
  ordered.splice(index, 1);
  return buildChecklistContent(ordered);
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
    sw.title = c.label;
    sw.setAttribute('aria-label', c.label);
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
  head.textContent = 'Label note';
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
      empty.textContent = 'No labels yet';
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
  input.placeholder = 'Create label';
  input.maxLength = 50;
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'icon-btn';
  addBtn.title = 'Create label';
  addBtn.setAttribute('aria-label', 'Create label');
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

// Build checklist rows into `host` from a structured item array.
// `items` are in canonical order (unchecked-first). Indices passed to the
// callbacks are display indices over that ordering.
//   opts = {
//     interactive,            // checkboxes are clickable
//     collapsed,              // completed group collapsed?
//     showRemove,             // show a hover × on each row
//     onToggle(index),
//     onRemove(index),
//     onCollapse(),           // header click (omit to make header inert)
//   }
function buildChecklistRows(host, items, opts) {
  const o = opts || {};
  const unchecked = items.filter((it) => !it.checked);
  const checked = items.filter((it) => it.checked);
  // Display index maps to the unchecked-first ordering used by the pure helpers.
  let idx = 0;

  const makeRow = (item, displayIndex) => {
    const row = document.createElement('div');
    row.className = 'cl-item' + (item.checked ? ' is-checked' : '');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'cl-check';
    cb.checked = item.checked;
    if (o.interactive && o.onToggle) {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', (e) => { e.stopPropagation(); o.onToggle(displayIndex); });
    } else {
      cb.disabled = true;
    }
    const text = document.createElement('span');
    text.className = 'cl-text';
    text.innerHTML = renderInline(escapeHtml(item.text));
    row.append(cb, text);
    if (o.showRemove && o.onRemove) {
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'cl-remove';
      rm.title = 'Delete item';
      rm.setAttribute('aria-label', 'Delete item');
      rm.innerHTML = icon('close', 16);
      rm.addEventListener('click', (e) => { e.stopPropagation(); o.onRemove(displayIndex); });
      row.appendChild(rm);
    }
    return row;
  };

  unchecked.forEach((item) => host.appendChild(makeRow(item, idx++)));

  if (checked.length) {
    const header = document.createElement('div');
    header.className = 'cl-completed-head' + (o.onCollapse ? ' is-clickable' : '');
    const chev = document.createElement('span');
    chev.className = 'cl-chevron' + (o.collapsed ? '' : ' is-open');
    chev.innerHTML = icon('chevron', 18);
    const label = document.createElement('span');
    label.className = 'cl-completed-label';
    label.textContent = `${checked.length} completed item${checked.length === 1 ? '' : 's'}`;
    header.append(chev, label);
    if (o.onCollapse) {
      header.addEventListener('click', (e) => { e.stopPropagation(); o.onCollapse(); });
    }
    host.appendChild(header);

    if (!o.collapsed) {
      const group = document.createElement('div');
      group.className = 'cl-completed-group';
      checked.forEach((item) => group.appendChild(makeRow(item, idx++)));
      host.appendChild(group);
    } else {
      idx += checked.length; // keep display indices aligned even when hidden
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
    collapsed: !!m.completedCollapsed,
    showRemove: !!extra.showRemove,
    onToggle: interactive ? (index) => toggleChecklistAt(m, index) : null,
    onRemove: extra.showRemove ? (index) => removeChecklistAt(m, index) : null,
    onCollapse: interactive ? () => toggleChecklistCollapse(m) : null,
  });

  if (extra.showAdd) {
    wrap.appendChild(makeAddItemRow((text) => {
      // Remember to re-focus the (rebuilt) add input after the async persist,
      // so the modal supports fast sequential item entry.
      modalAddFocusPending = true;
      addChecklistItem(m, text);
    }));
  }
  return wrap;
}

// The "+ List item" row. `onSubmit(text)` is called on Enter / button click.
// The input is cleared before onSubmit (callers typically re-render the list and
// own re-focusing the fresh add input); if the same input is still connected
// after onSubmit, keep focus on it for fast sequential entry.
function makeAddItemRow(onSubmit) {
  const row = document.createElement('div');
  row.className = 'cl-add';
  const plus = document.createElement('span');
  plus.className = 'cl-add-ico';
  plus.innerHTML = icon('plus', 18);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cl-add-input';
  input.placeholder = 'List item';
  const submit = () => {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    onSubmit(text);
    if (input.isConnected) input.focus(); // not re-rendered away -> keep focus
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    e.stopPropagation();
  });
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
  try {
    const upd = await api('PUT', '/memos/' + cur.id, { content });
    patchMemo(upd);
    rebuildCard(upd);
    if (modalMemo && modalMemo.id === upd.id) refreshModalBody(upd);
  } catch (err) { alert(err.message); }
}

function toggleChecklistAt(m, index) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, toggleChecklistItem(cur.content, index));
}

function addChecklistItem(m, text) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, appendChecklistItem(cur.content, text));
}

function removeChecklistAt(m, index) {
  const cur = liveMemo(m);
  persistChecklistContent(cur, removeChecklistItem(cur.content, index));
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
// Note cards
// ===================================================================

function noteCard(m) {
  const el = document.createElement('article');
  el.className = 'note';
  el.dataset.id = m.id;
  if (m.color) el.dataset.color = m.color;

  // Pin (active view only).
  if (state.view === 'active') {
    const pin = iconButton(m.pinned ? 'pinFilled' : 'pin', m.pinned ? 'Unpin' : 'Pin',
      (e) => { e.stopPropagation(); togglePin(m); }, 'note-pin');
    if (m.pinned) pin.classList.add('is-pinned');
    el.appendChild(pin);
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

  // Click a card -> open the modal editor. Trash stays read-only. Ignore clicks
  // that started on an interactive control (buttons, links, inputs, the action
  // rows, label chips, the checklist) so those keep their own behavior.
  if (state.view !== 'trash') {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button,a,input,textarea,.note-actions,.note-labels,.note-checklist')) return;
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
    actions.appendChild(iconButton('restore', 'Restore',
      (e) => { e.stopPropagation(); restoreFromTrash(m); }));
    actions.appendChild(iconButton('trash', 'Delete forever',
      (e) => { e.stopPropagation(); deleteForever(m); }));
  } else {
    // color
    actions.appendChild(iconButton('palette', 'Background color', (e) => {
      e.stopPropagation();
      openColorPopover(e.currentTarget, m.color, (color) => setColor(m, color));
    }));
    // add label
    actions.appendChild(iconButton('label', 'Add label', (e) => {
      e.stopPropagation();
      openLabelPopover(e.currentTarget, m.labels || [], (next) => setLabels(m, next));
    }));

    if (state.view === 'archived') {
      actions.appendChild(iconButton('unarchive', 'Unarchive',
        (e) => { e.stopPropagation(); setArchived(m, false); }));
    } else {
      actions.appendChild(iconButton('archive', 'Archive',
        (e) => { e.stopPropagation(); setArchived(m, true); }));
    }

    // ⋮ more
    actions.appendChild(iconButton('more', 'More', (e) => {
      e.stopPropagation();
      openMenu(e.currentTarget, [
        { label: 'Make a copy', icon: 'copy', onClick: () => duplicateMemo(m) },
        { label: 'Delete', icon: 'trash', onClick: () => trashMemo(m) },
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
    note.textContent = 'Notes in Trash are deleted after they are emptied.';
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.className = 'text-btn danger';
    empty.textContent = 'Empty trash';
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
  if (state.all.length > 0) return 'No matching notes.';
  if (state.view === 'archived') return 'Your archive is empty.';
  if (state.view === 'trash') return 'Trash is empty.';
  return 'Notes you add appear here.';
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
  if (!confirm('Delete this note forever? This cannot be undone.')) return;
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
  if (!confirm('Empty trash? All notes in trash will be permanently deleted.')) return;
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
  title.placeholder = 'Title';
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

  surface.append(title, bodyHost, chips, bar);
  backdrop.appendChild(surface);
  document.body.appendChild(backdrop);
  modalBackdrop = backdrop;
  document.body.classList.add('modal-open');

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
    host.appendChild(renderChecklist(m, { interactive: true }, { showAdd: true, showRemove: true }));
  } else {
    const ta = document.createElement('textarea');
    ta.className = 'modal-textarea';
    ta.placeholder = 'Take a note…';
    ta.value = m.content;
    ta.addEventListener('input', () => autosize(ta));
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
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

// The modal's bottom action bar. Reuses the same per-view mutations as a card
// (color / label / archive-or-unarchive / pin / ⋮ copy+delete) plus Close.
function buildModalActions(surface) {
  const bar = document.createElement('div');
  bar.className = 'modal-actions';

  const liveRefresh = (upd) => { if (upd && modalMemo && upd.id === modalMemo.id) refreshModalBody(upd); };

  // color
  bar.appendChild(iconButton('palette', 'Background color', (e) => {
    e.stopPropagation();
    openColorPopover(e.currentTarget, modalMemo.color, async (color) => {
      await setColor(modalMemo, color);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) liveRefresh(cur);
    });
  }));
  // add label
  bar.appendChild(iconButton('label', 'Add label', (e) => {
    e.stopPropagation();
    openLabelPopover(e.currentTarget, modalMemo.labels || [], async (next) => {
      await setLabels(modalMemo, next);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) liveRefresh(cur);
    });
  }));
  // archive / unarchive (leaves the current view -> close the modal first)
  if (state.view === 'archived') {
    bar.appendChild(iconButton('unarchive', 'Unarchive', async (e) => {
      e.stopPropagation();
      const m = modalMemo; await closeModal(); setArchived(m, false);
    }));
  } else {
    bar.appendChild(iconButton('archive', 'Archive', async (e) => {
      e.stopPropagation();
      const m = modalMemo; await closeModal(); setArchived(m, true);
    }));
  }
  // pin / unpin (active view only, mirroring the card's floating pin)
  if (state.view === 'active') {
    bar.appendChild(iconButton('pin', 'Pin', async (e) => {
      e.stopPropagation();
      await togglePin(modalMemo);
      const cur = state.all.find((x) => x.id === modalMemo.id);
      if (cur) { modalMemo = cur; e.currentTarget.innerHTML = icon(cur.pinned ? 'pinFilled' : 'pin'); }
    }, modalMemo.pinned ? 'is-pinned' : ''));
    if (modalMemo.pinned) bar.lastChild.innerHTML = icon('pinFilled');
  }
  // ⋮ more
  bar.appendChild(iconButton('more', 'More', (e) => {
    e.stopPropagation();
    openMenu(e.currentTarget, [
      { label: 'Make a copy', icon: 'copy', onClick: async () => { const m = modalMemo; await closeModal(); duplicateMemo(m); } },
      { label: 'Delete', icon: 'trash', onClick: async () => { const m = modalMemo; await closeModal(); trashMemo(m); } },
    ]);
  }));

  const spacer = document.createElement('span');
  spacer.className = 'spacer';
  bar.appendChild(spacer);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'text-btn';
  close.textContent = 'Close';
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
  { id: 'active', label: 'Notes', icon: 'notes', stat: 'notes' },
  { id: 'archived', label: 'Archive', icon: 'archive', stat: 'archived' },
  { id: 'trash', label: 'Trash', icon: 'trash', stat: 'trashed' },
];

function renderNav() {
  navList.innerHTML = '';
  VIEWS.forEach((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item' + (state.view === v.id && state.label === '' ? ' active' : '');
    b.dataset.view = v.id;
    const count = stats[v.stat] || 0;
    b.innerHTML = `<span class="nav-ico">${icon(v.icon)}</span><span class="nav-text">${v.label}</span>` +
      (count ? `<span class="nav-count">${count}</span>` : '');
    b.addEventListener('click', () => switchView(v.id));
    navList.appendChild(b);
  });
}

function renderLabels() {
  labelList.innerHTML = '';
  if (labels.length === 0) {
    labelList.innerHTML = '<div class="nav-empty">No labels yet</div>';
    return;
  }
  labels.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-item' + (state.label.toLowerCase() === l.name.toLowerCase() ? ' active' : '');
    b.dataset.label = l.name;
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
    const [lbls, st] = await Promise.all([
      api('GET', '/labels'),
      api('GET', '/stats'),
    ]);
    labels = lbls || [];
    stats = st || stats;
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
  }
  setComposerChecklist(!!asChecklist);
  if (composerChecklist) {
    const inp = composerChecklistEl.querySelector('.cl-add-input');
    if (inp) inp.focus(); else editor.focus();
  } else {
    editor.focus();
  }
}

function renderComposerColors() {
  composerColorsEl.innerHTML = '';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (c.name === '' ? ' is-default' : '') + (composerColor === c.name ? ' is-selected' : '');
    if (c.name) sw.dataset.color = c.name;
    sw.title = c.label;
    sw.setAttribute('aria-label', c.label);
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

// Render the composer's interactive checklist editor (items + add-row) from the
// in-memory composerItems. Toggles and adds update local state only (the note is
// not created until commit) and keep the unchecked-first / checked-last order.
function renderComposerChecklist() {
  composerChecklistEl.innerHTML = '';
  // Normalize order so the preview/commit and the UI agree.
  composerItems = parseChecklist(buildChecklistContent(composerItems));
  buildChecklistRows(composerChecklistEl, composerItems, {
    interactive: true,
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
  });
  composerChecklistEl.appendChild(makeAddItemRow((text) => {
    composerItems.push({ checked: false, text });
    renderComposerChecklist();
    // Refocus the (re-rendered) add input for fast sequential entry.
    const inp = composerChecklistEl.querySelector('.cl-add-input');
    if (inp) inp.focus();
  }));
}

// Seed composerItems from whatever the user typed in the plain textarea (so the
// "New list" toggle never loses in-progress lines), then switch to list mode.
function syncTextareaToItems() {
  const lines = editor.value.split('\n').map((l) => l.trim()).filter((l) => l !== '');
  composerItems = lines.map((l) => {
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
  resetComposer();

  if (content || title) {
    try {
      const m = await api('POST', '/memos', { title, content, color, labels: labelsToSend, checklist });
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
  composerPreviewBtn.textContent = 'Preview';
  editor.value = '';
  composerTitle.value = '';
  autosize(editor);
  composerColor = '';
  composerLabels = [];
  composerChecklist = false;
  composerItems = [];
  composerChecklistEl.hidden = true;
  composerChecklistEl.innerHTML = '';
  delete composer.dataset.color;
  composerChips.hidden = true;
  composerChips.innerHTML = '';
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

function paintStaticIcons() {
  navToggle.innerHTML = icon('menu', 22);
  themeToggle.innerHTML = icon('theme', 20);
  logoutBtn.innerHTML = icon('logout', 20);
  $('#brand-logo').innerHTML = icon('logo', 24);
  composerNewList.innerHTML = icon('checklist', 20);
  composerLabelBtn.innerHTML = icon('label', 18);
  composerListBtn.innerHTML = icon('checklist', 18);
}

async function init() {
  applyTheme(localStorage.getItem('jot-theme'));
  paintStaticIcons();
  themeToggle.addEventListener('click', toggleTheme);

  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
  });
  scrim.addEventListener('click', closeSidebar);

  // Composer wiring.
  composerCollapsed.addEventListener('click', () => expandComposer(false));
  composerCollapsed.addEventListener('focus', () => expandComposer(false));
  composerNewList.addEventListener('click', (e) => { e.stopPropagation(); expandComposer(true); });
  composerCloseBtn.addEventListener('click', commitComposer);
  composer.addEventListener('submit', (e) => { e.preventDefault(); commitComposer(); });
  editor.addEventListener('input', () => autosize(editor));
  editor.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); commitComposer(); }
    if (e.key === 'Escape') { e.preventDefault(); resetComposer(); }
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
    composerPreviewBtn.textContent = show ? 'Edit' : 'Preview';
    if (show) {
      const { content } = composerPayload();
      composerPreviewBox.innerHTML = renderMarkdown(content) || '<p class="muted">Nothing to preview.</p>';
    }
  });

  searchInput.addEventListener('input', debounce(() => {
    state.query = searchInput.value.trim();
    state.label = '';
    renderNav();
    renderLabels();
    render();
  }, 200));

  logoutBtn.addEventListener('click', async () => {
    try { await api('POST', '/logout'); } catch (err) { /* ignore */ }
    window.location.href = '/login';
  });

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

  window.addEventListener('resize', debounce(() => { closePopovers(); relayoutAll(); }, 150));
  // Popovers are anchored in page coordinates; drop them on scroll to avoid drift.
  window.addEventListener('scroll', () => closePopovers(), { passive: true });

  try {
    const cfg = await api('GET', '/config');
    state.authEnabled = cfg.authEnabled;
    logoutBtn.hidden = !cfg.authEnabled;
  } catch (err) { /* ignore */ }

  renderNav();
  renderLabels();
  await loadMemos();
  render();
  await loadMeta();
}

init();
