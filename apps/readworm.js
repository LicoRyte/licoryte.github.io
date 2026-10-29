/* Readworm: open Markdown files (or a whole folder) and read them in the site's theme. Nothing is saved or uploaded:
   the files live in this window's list until you remove them or close the window/tab.
   Uses marked (MIT) to turn Markdown into HTML and DOMPurify (Apache-2.0/MPL-2.0) to strip anything unsafe.
   Loaded by index.html the first time the Readworm window opens. */
(() => {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024, MAX_FILES = 500;
  const IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
  const MD_RE = /\.(md|markdown|mdown|mkd|txt)$/i;

  function mount(root) {
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const { marked } = window;
    const DOMPurify = window.DOMPurify;

    /* Obsidian-style extras: ==highlight==, [[wikilink|alias]], ![[embed.png]] */
    let images = new Map(); // file name (lowercase) -> object URL, for images picked together with the .md
    marked.use({
      gfm: true, breaks: false,
      extensions: [
        { name: 'rwEmbed', level: 'inline', start: s => s.indexOf('![['),
          tokenizer(src) { const m = /^!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/.exec(src); if (m) return { type: 'rwEmbed', raw: m[0], target: m[1].trim(), alt: (m[2] || '').trim() }; },
          renderer(t) { return `<img data-rw-src="${esc(t.target)}" alt="${esc(t.alt || t.target)}">`; } },
        { name: 'rwWiki', level: 'inline', start: s => s.indexOf('[['),
          tokenizer(src) { const m = /^\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/.exec(src); if (m) return { type: 'rwWiki', raw: m[0], target: m[1].trim(), alias: (m[2] || '').trim() }; },
          renderer(t) { const shown = t.alias || t.target.replace(/#/, ' › '); return `<span class="rw-wiki" data-wiki="${esc(t.target)}" title="Link to the note: ${esc(t.target)}">${esc(shown)}</span>`; } },
        { name: 'rwMark', level: 'inline', start: s => s.indexOf('=='),
          tokenizer(src) { const m = /^==(?=\S)([\s\S]*?\S)==/.exec(src); if (m) return { type: 'rwMark', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) }; },
          renderer(t) { return '<mark>' + this.parser.parseInline(t.tokens) + '</mark>'; } },
      ],
    });
    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    /* UI */
    const accept = '.md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain,image/*';
    const input = el('input', { type: 'file', accept, multiple: true, hidden: true });
    const folderInput = el('input', { type: 'file', multiple: true, hidden: true, webkitdirectory: true });
    const fileSel = el('select', { class: 'rw-name', 'aria-label': 'Open file', disabled: true }, el('option', {}, 'No file open'));
    const sideBtn = el('button', { type: 'button', class: 'btn rw-sidebtn', 'aria-pressed': 'true', title: 'Show or hide the sidebar', onclick: () => { const on = sideBtn.getAttribute('aria-pressed') !== 'true'; sideBtn.setAttribute('aria-pressed', String(on)); main.classList.toggle('no-outline', !on); } }, 'Sidebar');
    const tools = el('div', { class: 'rw-tools' },
      el('button', { type: 'button', class: 'btn', title: 'Open one or more Markdown files (and their images)', onclick: () => input.click() }, 'Open files...'),
      el('button', { type: 'button', class: 'btn', title: 'Open every Markdown file in a folder, like an Obsidian vault', onclick: () => folderInput.click() }, 'Open folder...'),
      sideBtn, fileSel, input, folderInput);
    const fileHead = el('div', { class: 'rw-ol-h rw-fh' }, el('span', {}, 'Files'), el('button', { type: 'button', class: 'rw-clear', title: 'Remove every file from the list', onclick: () => removeAll() }, 'Remove all'));
    const fileList = el('ul', { class: 'rw-files' });
    const outline = el('nav', { class: 'rw-ol', 'aria-label': 'Outline' });
    const side = el('aside', { class: 'rw-outline' }, el('div', { class: 'rw-filebox' }, fileHead, fileList), outline);
    const doc = el('article', { class: 'rw-doc' });
    const scroller = el('div', { class: 'rw-scroll sunken', tabindex: '0' }, doc);
    const main = el('div', { class: 'rw-main' }, side, scroller);
    const status = el('span', {}, 'Open Markdown files to read them.'), status2 = el('span', {}, 'Nothing is saved');
    root.replaceChildren(tools, main, el('div', { class: 'statusbar' }, status, status2));

    let files = [], current = null, seq = 0; // files: { id, name, path, text, scroll }
    renderFileList(); showEmpty();

    function showEmpty(msg) {
      outline.replaceChildren();
      doc.replaceChildren(el('div', { class: 'rw-empty' },
        el('div', { class: 'rw-worm', 'aria-hidden': 'true' }, '~~~(o.o)'),
        el('p', {}, el('b', {}, msg || 'Feed me some Markdown.')),
        el('p', {}, 'Click ', el('b', {}, 'Open files...'), ' (pick as many as you like), ', el('b', {}, 'Open folder...'), ', or drop .md files here.'),
        el('p', { class: 'rw-muted' }, 'Pick notes together with their images to see them too. Nothing is saved or uploaded: the files only live in this window until you remove them or close it.')));
    }

    input.addEventListener('change', () => { openFiles([...input.files]); input.value = ''; });
    folderInput.addEventListener('change', () => { openFiles([...folderInput.files]); folderInput.value = ''; });
    fileSel.addEventListener('change', () => show(fileSel.value));
    let dragDepth = 0;
    root.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; root.classList.add('rw-drop'); });
    root.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
    root.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; root.classList.remove('rw-drop'); } });
    root.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; root.classList.remove('rw-drop'); openFiles([...e.dataTransfer.files]); });
    const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    const pathOf = f => f.webkitRelativePath || f.name;
    const baseName = n => n.split('/').pop().replace(/\.(md|markdown|mdown|mkd|txt)$/i, '').toLowerCase();

    async function openFiles(list) {
      const imgs = list.filter(f => IMG_RE.test(f.name) || /^image\//.test(f.type));
      for (const f of imgs) { const k = f.name.toLowerCase(); if (images.has(k)) URL.revokeObjectURL(images.get(k)); images.set(k, URL.createObjectURL(f)); }
      const mds = list.filter(f => MD_RE.test(f.name) || (/^text\//.test(f.type) && !IMG_RE.test(f.name)));
      if (!mds.length) {
        if (imgs.length) { status.textContent = 'Added ' + imgs.length + ' image' + (imgs.length > 1 ? 's' : '') + '.'; if (current) show(current, true); }
        else status.textContent = list.length ? 'No Markdown files in there. Pick .md files.' : '';
        return;
      }
      let added = 0, updated = 0, skipped = 0, firstNew = null;
      for (const f of mds) {
        if (f.size > MAX_BYTES) { skipped++; continue; }
        let text; try { text = await f.text(); } catch (e) { skipped++; continue; }
        const path = pathOf(f);
        const old = files.find(x => x.path === path);
        if (old) { old.text = text; updated++; firstNew = firstNew || old.id; continue; }
        if (files.length >= MAX_FILES) { skipped++; continue; }
        const nf = { id: 'f' + (++seq), name: f.name, path, text, scroll: 0 };
        files.push(nf); added++; firstNew = firstNew || nf.id;
      }
      files.sort((x, y) => x.path.localeCompare(y.path, undefined, { numeric: true, sensitivity: 'base' }));
      renderFileList();
      if (firstNew) show(firstNew, firstNew === current);
      const bits = [];
      if (added) bits.push('Added ' + added + ' file' + (added > 1 ? 's' : ''));
      if (updated) bits.push('reloaded ' + updated);
      if (skipped) bits.push(skipped + ' skipped (too big, unreadable or over ' + MAX_FILES + ' files)');
      if (bits.length) setTimeout(() => { status.textContent = bits.join(', ') + '.'; }, 1600);
    }
    function renderFileList() {
      fileHead.firstChild.textContent = files.length ? 'Files (' + files.length + ')' : 'Files';
      fileHead.lastChild.hidden = files.length < 2;
      if (!files.length) fileList.replaceChildren(el('li', { class: 'rw-muted' }, 'No files open.'));
      else fileList.replaceChildren(...files.map(f => el('li', { class: f.id === current ? 'cur' : '' },
        el('button', { type: 'button', class: 'rw-fn', title: f.path, onclick: () => show(f.id), 'aria-current': f.id === current ? 'true' : null }, f.name.replace(/\.(md|markdown|mdown|mkd)$/i, '')),
        el('button', { type: 'button', class: 'rw-x', title: 'Remove ' + f.name + ' from the list', 'aria-label': 'Remove ' + f.name, onclick: () => remove(f.id) }, '×'))));
      fileSel.disabled = !files.length;
      fileSel.replaceChildren(...(files.length ? files.map(f => el('option', { value: f.id, selected: f.id === current || null }, f.path)) : [el('option', {}, 'No file open')]));
    }
    function remove(id) {
      const i = files.findIndex(f => f.id === id); if (i < 0) return;
      const [gone] = files.splice(i, 1);
      if (current === id) { current = null; const next = files[i] || files[i - 1]; if (next) show(next.id); }
      if (!files.length) { removeAll(); return; }
      renderFileList();
      status.textContent = 'Removed ' + gone.name + '.';
    }
    function removeAll() {
      files = []; current = null;
      for (const u of images.values()) URL.revokeObjectURL(u);
      images = new Map();
      renderFileList(); showEmpty();
      status.textContent = 'List cleared.';
    }
    function show(id, keepScroll) {
      const f = files.find(x => x.id === id); if (!f) return;
      const prev = files.find(x => x.id === current);
      if (prev && prev !== f) prev.scroll = scroller.scrollTop;
      const y = keepScroll ? scroller.scrollTop : f.scroll;
      current = f.id;
      render(f.text, f.name);
      scroller.scrollTop = y || 0;
      renderFileList();
      const cur = fileList.querySelector('li.cur'); if (cur) cur.scrollIntoView({ block: 'nearest' });
    }
    // Alt + ↑ / ↓ switches files
    root.addEventListener('keydown', e => {
      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') || !files.length) return;
      e.preventDefault();
      const i = files.findIndex(f => f.id === current);
      const n = files[(i + (e.key === 'ArrowDown' ? 1 : -1) + files.length) % files.length];
      show(n.id);
    });

    function frontmatter(text) {
      const m = /^﻿?---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)\r?\n?/.exec(text);
      if (!m) return { props: null, body: text };
      const props = []; let last = null;
      for (const line of m[1].split(/\r?\n/)) {
        const kv = /^([A-Za-z0-9_\- ]+):\s*(.*)$/.exec(line);
        if (kv) { last = [kv[1].trim(), kv[2].trim().replace(/^["']|["']$/g, '')]; props.push(last); }
        else if (last && /^\s*-\s+/.test(line)) last[1] = (last[1] ? last[1] + ', ' : '') + line.replace(/^\s*-\s+/, '').replace(/^["']|["']$/g, '');
      }
      return { props: props.length ? props : null, body: text.slice(m[0].length) };
    }

    function render(text, name) {
      const { props, body } = frontmatter(text);
      let html = marked.parse(body);
      html = DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style'], ADD_ATTR: ['data-rw-src'] });
      const frag = document.createRange().createContextualFragment(html);
      const wrap = el('div', {}); wrap.append(frag);
      callouts(wrap); fixImages(wrap); fixLinks(wrap);
      wrap.querySelectorAll('input[type="checkbox"]').forEach(c => { c.disabled = true; c.closest('li') && c.closest('li').classList.add('rw-task'); });
      wrap.querySelectorAll('table').forEach(t => { const box = el('div', { class: 'rw-table' }); t.replaceWith(box); box.append(t); });
      const kids = [];
      if (props) kids.push(el('div', { class: 'rw-props' }, el('div', { class: 'rw-props-h' }, 'Properties'), el('dl', {}, props.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v || '—')]))));
      doc.replaceChildren(...kids, ...wrap.childNodes);
      buildOutline();
      markWikis();
      scroller.scrollTop = 0;
      const words = (body.replace(/```[\s\S]*?```/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
      status.textContent = words.toLocaleString() + ' words · about ' + Math.max(1, Math.round(words / 230)) + ' min read';
      scroller.focus({ preventScroll: true });
    }

    /* > [!note] Title   ->  colored callout box (Obsidian style). [!x]- / [!x]+ make it foldable. */
    const CALLOUT_ICON = { note: 'i', info: 'i', abstract: '≡', summary: '≡', tldr: '≡', tip: '✦', hint: '✦', important: '✦', success: '✔', check: '✔', done: '✔', question: '?', help: '?', faq: '?', warning: '!', caution: '!', attention: '!', failure: '✖', fail: '✖', missing: '✖', danger: '⚡', error: '⚡', bug: '✱', example: '☰', quote: '❝', cite: '❝', todo: '☐' };
    const CALLOUT_KIND = { note: 'blue', info: 'blue', todo: 'blue', abstract: 'teal', summary: 'teal', tldr: 'teal', tip: 'teal', hint: 'teal', important: 'teal', success: 'green', check: 'green', done: 'green', question: 'yellow', help: 'yellow', faq: 'yellow', warning: 'orange', caution: 'orange', attention: 'orange', failure: 'red', fail: 'red', missing: 'red', danger: 'red', error: 'red', bug: 'red', example: 'purple', quote: 'gray', cite: 'gray' };
    function callouts(wrap) {
      wrap.querySelectorAll('blockquote').forEach(bq => {
        const p = bq.firstElementChild; if (!p || p.tagName !== 'P') return;
        const m = /^\[!([A-Za-z-]+)\]([+-]?)[ \t]*([^\n]*)\n?/.exec(p.textContent); if (!m) return;
        const type = m[1].toLowerCase(), fold = m[2];
        // remove the [!type] marker (and title line) from the first paragraph, keeping the rest of its HTML
        const nl = p.innerHTML.indexOf('\n');
        const restHtml = nl >= 0 ? p.innerHTML.slice(nl + 1) : '';
        const title = m[3].trim() || type.charAt(0).toUpperCase() + type.slice(1);
        if (restHtml.trim()) p.innerHTML = restHtml; else p.remove();
        const head = el(fold ? 'summary' : 'div', { class: 'rw-co-h' }, el('span', { class: 'rw-co-i', 'aria-hidden': 'true' }, CALLOUT_ICON[type] || 'i'), title);
        const box = el(fold ? 'details' : 'div', { class: 'rw-co rw-co-' + (CALLOUT_KIND[type] || 'blue'), open: fold === '+' || null }, head, el('div', { class: 'rw-co-b' }, ...bq.childNodes));
        bq.replaceWith(box);
      });
    }
    function fixImages(wrap) {
      wrap.querySelectorAll('img').forEach(img => {
        const raw = img.getAttribute('data-rw-src') || img.getAttribute('src') || '';
        img.removeAttribute('data-rw-src');
        if (/^(https?:|data:image\/)/i.test(raw)) { img.src = raw; img.loading = 'lazy'; return; }
        const base = decodeURIComponent(raw.split(/[?#]/)[0].split('/').pop() || '').toLowerCase();
        const url = images.get(base);
        if (url) { img.src = url; return; }
        img.replaceWith(el('span', { class: 'rw-missing', title: 'Open this note together with its images to see them.' }, '🖼 ' + (img.alt || base || 'image')));
      });
    }
    function fixLinks(wrap) {
      wrap.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (/^(https?:|mailto:)/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        else if (href.startsWith('#')) a.dataset.jump = href.slice(1);
        else { const target = decodeURIComponent(href.split(/[?#]/)[0].split('/').pop() || ''); const hash = href.includes('#') ? '#' + href.split('#')[1] : ''; a.removeAttribute('href'); a.className = 'rw-wiki'; a.dataset.wiki = target + hash; a.title = 'Link to another file: ' + href; }
      });
    }
    const slug = s => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
    function buildOutline() {
      const hs = [...doc.querySelectorAll('h1, h2, h3, h4')];
      const used = new Set();
      hs.forEach(h => { let id = 'rw-' + (slug(h.textContent) || 'h'); while (used.has(id)) id += '-'; used.add(id); h.id = id; });
      if (!hs.length) { outline.replaceChildren(el('div', { class: 'rw-ol-h' }, 'Outline'), el('p', { class: 'rw-muted' }, 'No headings in this file.')); return; }
      outline.replaceChildren(el('div', { class: 'rw-ol-h' }, 'Outline'), el('ul', {}, hs.map(h => el('li', { class: 'lv' + h.tagName[1] },
        el('button', { type: 'button', title: h.textContent, onclick: () => jumpTo(h) }, h.textContent)))));
    }
    function jumpTo(h) { scroller.scrollTo({ top: h.offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    // [[wikilinks]] and links to other .md files open that file if it's in the list
    function findNote(target) { const want = baseName(target); return want ? files.find(f => baseName(f.path) === want) : null; }
    function markWikis() {
      doc.querySelectorAll('.rw-wiki[data-wiki]').forEach(w => {
        const [t, h] = w.dataset.wiki.split('#');
        const ok = !t ? true : !!findNote(t);
        w.classList.toggle('ok', ok);
        if (ok) { w.setAttribute('role', 'link'); w.tabIndex = 0; w.title = 'Open ' + (t || 'heading') + (h ? ' › ' + h : ''); }
        else w.title = (t || '') + ' isn\'t open. Open it too and this link will work.';
      });
    }
    function followWiki(w) {
      const [t, h] = w.dataset.wiki.split('#');
      if (t) { const f = findNote(t); if (!f) return; if (f.id !== current) show(f.id); }
      if (h) { const want = slug(h); const hd = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].find(x => slug(x.textContent) === want); if (hd) jumpTo(hd); }
    }
    doc.addEventListener('keydown', e => { const w = e.target.closest && e.target.closest('.rw-wiki.ok'); if (w && e.key === 'Enter') followWiki(w); });
    doc.addEventListener('click', e => {
      const w = e.target.closest('.rw-wiki.ok'); if (w) { e.preventDefault(); followWiki(w); return; }
      const a = e.target.closest('a[data-jump]'); if (!a) return;
      e.preventDefault();
      const want = slug(decodeURIComponent(a.dataset.jump));
      const h = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].find(x => x.id === 'rw-' + want || slug(x.textContent) === want);
      if (h) jumpTo(h);
    });
    return { open: () => {} };
  }
  window.Readworm = { mount };
})();
