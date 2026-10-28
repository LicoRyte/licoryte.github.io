/* Readworm: open a Markdown file and read it in the site's theme. Nothing is saved or uploaded anywhere:
   the file is read in the browser and forgotten when you open another one or close the window.
   Uses marked (MIT) to turn Markdown into HTML and DOMPurify (Apache-2.0/MPL-2.0) to strip anything unsafe.
   Loaded by index.html the first time the Readworm window opens. */
(() => {
  'use strict';
  const MAX_BYTES = 5 * 1024 * 1024;
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
          renderer(t) { const shown = t.alias || t.target.replace(/#/, ' › '); return `<span class="rw-wiki" title="Link to the note: ${esc(t.target)}">${esc(shown)}</span>`; } },
        { name: 'rwMark', level: 'inline', start: s => s.indexOf('=='),
          tokenizer(src) { const m = /^==(?=\S)([\s\S]*?\S)==/.exec(src); if (m) return { type: 'rwMark', raw: m[0], tokens: this.lexer.inlineTokens(m[1]) }; },
          renderer(t) { return '<mark>' + this.parser.parseInline(t.tokens) + '</mark>'; } },
      ],
    });
    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    /* UI */
    const input = el('input', { type: 'file', accept: '.md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain,image/*', multiple: true, hidden: true });
    const nameOut = el('span', { class: 'rw-name' }, 'No file open');
    const outlineBtn = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'true', title: 'Show or hide the outline', onclick: () => { const on = outlineBtn.getAttribute('aria-pressed') !== 'true'; outlineBtn.setAttribute('aria-pressed', String(on)); main.classList.toggle('no-outline', !on); } }, 'Outline');
    const tools = el('div', { class: 'rw-tools' },
      el('button', { type: 'button', class: 'btn', onclick: () => input.click() }, 'Open...'), outlineBtn, nameOut, input);
    const outline = el('nav', { class: 'rw-outline', 'aria-label': 'Outline' });
    const doc = el('article', { class: 'rw-doc' });
    const scroller = el('div', { class: 'rw-scroll sunken', tabindex: '0' }, doc);
    const main = el('div', { class: 'rw-main' }, outline, scroller);
    const status = el('span', {}, 'Open a Markdown file to read it.'), status2 = el('span', {}, 'Nothing is saved');
    root.replaceChildren(tools, main, el('div', { class: 'statusbar' }, status, status2));
    showEmpty();

    function showEmpty(msg) {
      outline.replaceChildren(el('p', { class: 'rw-muted' }, 'Headings show up here.'));
      doc.replaceChildren(el('div', { class: 'rw-empty' },
        el('div', { class: 'rw-worm', 'aria-hidden': 'true' }, '~~~(o.o)'),
        el('p', {}, el('b', {}, msg || 'Feed me a Markdown file.')),
        el('p', {}, 'Click ', el('b', {}, 'Open...'), ' or drop a .md file here.'),
        el('p', { class: 'rw-muted' }, 'Pick the note together with its images to see them too. Nothing is saved or uploaded: the file only lives in this window until you close it.')));
    }

    input.addEventListener('change', () => { openFiles([...input.files]); input.value = ''; });
    let dragDepth = 0;
    root.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; root.classList.add('rw-drop'); });
    root.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
    root.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; root.classList.remove('rw-drop'); } });
    root.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth = 0; root.classList.remove('rw-drop'); openFiles([...e.dataTransfer.files]); });
    const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');

    async function openFiles(files) {
      const md = files.find(f => MD_RE.test(f.name)) || files.find(f => /^text\//.test(f.type));
      if (!md) { status.textContent = files.length ? 'That\'s not a Markdown file. Pick a .md file.' : ''; return; }
      if (md.size > MAX_BYTES) { status.textContent = 'That file is over 5 MB. Too big to chew.'; return; }
      for (const u of images.values()) URL.revokeObjectURL(u);
      images = new Map(files.filter(f => IMG_RE.test(f.name) || /^image\//.test(f.type)).map(f => [f.name.toLowerCase(), URL.createObjectURL(f)]));
      let text;
      try { text = await md.text(); } catch (e) { status.textContent = 'Couldn\'t read that file.'; return; }
      render(text, md.name);
    }

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
      scroller.scrollTop = 0;
      nameOut.textContent = name; nameOut.title = name;
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
        else { a.removeAttribute('href'); a.className = 'rw-wiki'; a.title = 'Link to another file: ' + href; }
      });
    }
    const slug = s => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
    function buildOutline() {
      const hs = [...doc.querySelectorAll('h1, h2, h3, h4')];
      const used = new Set();
      hs.forEach(h => { let id = 'rw-' + (slug(h.textContent) || 'h'); while (used.has(id)) id += '-'; used.add(id); h.id = id; });
      if (!hs.length) { outline.replaceChildren(el('p', { class: 'rw-muted' }, 'No headings in this file.')); return; }
      outline.replaceChildren(el('div', { class: 'rw-ol-h' }, 'Outline'), el('ul', {}, hs.map(h => el('li', { class: 'lv' + h.tagName[1] },
        el('button', { type: 'button', title: h.textContent, onclick: () => jumpTo(h) }, h.textContent)))));
    }
    function jumpTo(h) { scroller.scrollTo({ top: h.offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    doc.addEventListener('click', e => {
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
