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
        // $$ ... $$ on its own lines = display math
        { name: 'rwMathBlock', level: 'block', start: s => { const i = s.indexOf('$$'); return i < 0 ? undefined : i; },
          tokenizer(src) { const m = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n+|$)/.exec(src); if (m) return { type: 'rwMathBlock', raw: m[0], tex: m[1].trim() }; },
          renderer(t) { return `<div class="rw-math rw-math-d" data-tex="${esc(t.tex)}" data-display="1">${esc(t.tex)}</div>`; } },
        // $$ ... $$ inside a line = display math, $ ... $ = inline math
        { name: 'rwMath', level: 'inline', start: s => { const i = s.indexOf('$'); return i < 0 ? undefined : i; },
          tokenizer(src) {
            let m = /^\$\$([\s\S]+?)\$\$/.exec(src);
            if (m) return { type: 'rwMath', raw: m[0], tex: m[1].trim(), display: true };
            m = /^\$(?![\s$])((?:\\.|[^\\$\n`])+?)(?<!\s)\$(?!\d)/.exec(src);
            // "$5 and $10" is money, not math: math that starts with a number can't contain spaces
            if (m && !(/^\d/.test(m[1]) && /\s/.test(m[1]))) return { type: 'rwMath', raw: m[0], tex: m[1], display: false };
          },
          renderer(t) { return t.display ? `<span class="rw-math rw-math-d" data-tex="${esc(t.tex)}" data-display="1">${esc(t.tex)}</span>` : `<span class="rw-math" data-tex="${esc(t.tex)}">${esc(t.tex)}</span>`; } },
        // ![[picture.png]] = image, ![[Some note]] = embed that note (if it's open too)
        { name: 'rwEmbed', level: 'inline', start: s => s.indexOf('![['),
          tokenizer(src) { const m = /^!\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/.exec(src); if (m) return { type: 'rwEmbed', raw: m[0], target: m[1].trim(), hash: (m[2] || '').slice(1), alt: (m[3] || '').trim() }; },
          renderer(t) {
            if (IMG_RE.test(t.target)) return `<img data-rw-src="${esc(t.target)}" alt="${esc(t.alt || t.target)}">`;
            return `<span class="rw-embed" data-embed="${esc(t.target)}" data-hash="${esc(t.hash)}"></span>`;
          } },
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

    function buildHtml(body, depth, selfName) {
      let html = marked.parse(body);
      html = DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style'], ADD_ATTR: ['data-rw-src'] });
      const frag = document.createRange().createContextualFragment(html);
      const wrap = el('div', {}); wrap.append(frag);
      diagrams(wrap); callouts(wrap); fixImages(wrap); fixLinks(wrap);
      wrap.querySelectorAll('input[type="checkbox"]').forEach(c => { c.disabled = true; c.closest('li') && c.closest('li').classList.add('rw-task'); });
      wrap.querySelectorAll('table:not(.rw-flow)').forEach(t => { const box = el('div', { class: 'rw-table' }); t.replaceWith(box); box.append(t); });
      embeds(wrap, depth, selfName);
      return wrap;
    }
    function render(text, name) {
      const { props, body } = frontmatter(text);
      const wrap = buildHtml(body, 0, name);
      const kids = [];
      if (props) kids.push(el('div', { class: 'rw-props' }, el('div', { class: 'rw-props-h' }, 'Properties'), el('dl', {}, props.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v || '—')]))));
      doc.replaceChildren(...kids, ...wrap.childNodes);
      buildOutline();
      markWikis();
      typesetMath();
      scroller.scrollTop = 0;
      const words = (body.replace(/```[\s\S]*?```/g, ' ').match(/[\p{L}\p{N}]+/gu) || []).length;
      status.textContent = words.toLocaleString() + ' words · about ' + Math.max(1, Math.round(words / 230)) + ' min read';
      scroller.focus({ preventScroll: true });
    }

    /* ![[Other note]] -> that note's content in a box (if it's open), up to 2 levels deep */
    function embeds(wrap, depth, selfName) {
      wrap.querySelectorAll('.rw-embed[data-embed]').forEach(sp => {
        const target = sp.dataset.embed, f = findNote(target);
        const head = el('div', { class: 'rw-embed-h' }, '📄 ', f ? el('span', { class: 'rw-wiki ok', 'data-wiki': target + (sp.dataset.hash ? '#' + sp.dataset.hash : ''), role: 'link', tabindex: 0, title: 'Open ' + target }, target) : target);
        sp.removeAttribute('data-embed');
        if (!f) { sp.replaceChildren(head, el('div', { class: 'rw-muted' }, 'This note isn\'t open. Open it too and it shows up here.')); sp.classList.add('missing'); return; }
        if (depth >= 2 || baseName(f.path) === baseName(selfName || '')) { sp.replaceChildren(head, el('div', { class: 'rw-muted' }, 'Embedded too deep to show here.')); return; }
        let body = frontmatter(f.text).body;
        if (sp.dataset.hash) { // only one section: from that heading to the next heading of the same or higher level
          const want = slug(sp.dataset.hash), lines = body.split(/\r?\n/);
          const start = lines.findIndex(l => /^#{1,6}\s/.test(l) && slug(l.replace(/^#+\s*/, '')) === want);
          if (start >= 0) { const lvl = lines[start].match(/^#+/)[0].length; let end = lines.findIndex((l, i) => i > start && (l.match(/^#{1,6}(?=\s)/) || [''])[0].length && l.match(/^#+/)[0].length <= lvl); body = lines.slice(start, end < 0 ? undefined : end).join('\n'); }
        }
        sp.replaceChildren(head, el('div', { class: 'rw-embed-b' }, ...buildHtml(body, depth + 1, f.name).childNodes));
      });
    }

    /* Math: $...$ and $$...$$ typeset with KaTeX (loaded only when a note has math) */
    let katexLoading = null;
    function loadKatex() {
      if (katexLoading) return katexLoading;
      const css = el('link', { rel: 'stylesheet', href: 'apps/vendor/katex/katex.min.css?v=0.16.47' });
      document.head.append(css);
      katexLoading = new Promise((ok, no) => { const sc = el('script', { src: 'apps/vendor/katex/katex.min.js?v=0.16.47' }); sc.onload = ok; sc.onerror = no; document.head.append(sc); })
        .catch(() => { katexLoading = null; throw new Error('katex'); });
      return katexLoading;
    }
    function typesetMath() {
      const nodes = [...doc.querySelectorAll('.rw-math[data-tex]')];
      if (!nodes.length) return;
      loadKatex().then(() => nodes.forEach(n => {
        if (!n.isConnected || !n.dataset.tex) return;
        try { window.katex.render(n.dataset.tex, n, { displayMode: n.dataset.display === '1', throwOnError: false, trust: false, strict: 'ignore' }); n.removeAttribute('data-tex'); }
        catch (e) { n.classList.add('rw-math-err'); n.title = 'Couldn\'t typeset this math'; }
      })).catch(() => { nodes.forEach(n => n.classList.add('rw-math-err')); });
    }

    /* Mermaid code blocks -> a table of who connects to whom (no diagram library needed) */
    function diagrams(wrap) {
      wrap.querySelectorAll('pre > code.language-mermaid').forEach(code => {
        const src = code.textContent, pre = code.parentElement;
        let box = null;
        try { box = mermaidTable(src); } catch (e) { box = null; }
        const kids = [];
        if (box) kids.push(box);
        else kids.push(el('div', { class: 'rw-flow-cap' }, 'Diagram (shown as code)'));
        const det = el('details', { class: 'rw-flow-code' }, el('summary', {}, box ? 'Show diagram code' : 'Code'), el('pre', {}, el('code', {}, src)));
        if (!box) det.open = true;
        kids.push(det);
        pre.replaceWith(el('div', { class: 'rw-flow-box' }, ...kids));
      });
    }
    function mermaidTable(src) {
      const lines = src.split(/\r?\n/).map(l => l.replace(/%%.*$/, '').trim()).filter(Boolean);
      if (!lines.length) return null;
      const head = lines[0];
      if (/^(graph|flowchart)\b/i.test(head)) return flowTable(head, lines.slice(1));
      if (/^sequenceDiagram\b/i.test(head)) return seqTable(lines.slice(1));
      return null;
    }
    function flowTable(head, lines) {
      const labels = new Map(), order = [], edges = [];
      let masks = [];
      const unmask = t => t.replace(/\u0001(\d+)\u0002/g, (_, i) => masks[+i]);
      const node = expr => {
        expr = unmask(expr);
        const m = /^([^\s\[\](){}<>|"&]+)\s*(?:(\(\(|\[\[|\[\(|\(\[|\{\{|\[\/|\[\\|\[|\(|\{|>)\s*"?([\s\S]*?)"?\s*(\)\)|\]\]|\)\]|\]\)|\}\}|\/\]|\\\]|\]|\)|\}))?\s*(?::::[\w-]+)?$/.exec(expr.trim());
        if (!m) return null;
        const id = m[1];
        if (m[3] != null && m[3] !== '') labels.set(id, m[3].replace(/<br\s*\/?>/gi, ' ').trim());
        if (!order.includes(id)) order.push(id);
        return id;
      };
      for (let line of lines) {
        if (/^(subgraph|end$|style|classDef|class |linkStyle|click|direction)/i.test(line)) continue;
        // "A -- text --> B" style labels -> "A -->|text| B"
        masks = [];
        line = line.replace(/(\[[^\]]*\]|\([^)]*\)|\{[^}]*\}|"[^"]*")/g, m => '\u0001' + (masks.push(m) - 1) + '\u0002');
        line = line.replace(/--\s+([^-|>][^>]*?)\s+-->/g, '-->|$1|').replace(/-\.\s+([^.|>][^>]*?)\s+\.->/g, '-.->|$1|').replace(/==\s+([^=|>][^>]*?)\s+==>/g, '==>|$1|');
        const ARROW = /\s*(<?(?:-\.+-?>?|-{2,}>?|={2,}>?|~~~)[ox]?)\s*(?:\|([^|]*)\|)?\s*/g;
        const parts = []; let last = 0, mm;
        while ((mm = ARROW.exec(line))) { parts.push(line.slice(last, mm.index)); parts.push({ a: mm[1], t: (mm[2] || '').trim() }); last = ARROW.lastIndex; }
        parts.push(line.slice(last));
        const groups = parts.filter((_, i) => i % 2 === 0).map(g => g.split('&').map(node).filter(Boolean));
        const arrows = parts.filter((_, i) => i % 2 === 1);
        arrows.forEach((ar, i) => { for (const a of groups[i] || []) for (const b of groups[i + 1] || []) edges.push({ a, b, kind: ar.a, text: unmask(ar.t).replace(/^"|"$/g, '') }); });
      }
      if (!edges.length && !order.length) return null;
      const name = id => labels.get(id) || id;
      const sym = k => (k.includes('.') ? '⇢' : k.includes('=') ? '⇒' : k.includes('~') ? '·' : (k.endsWith('>') || /[ox]$/.test(k)) ? '→' : '—');
      const tip = k => k.includes('.') ? 'dotted link' : k.includes('=') ? 'thick link' : k.includes('~') ? 'invisible link' : k.endsWith('>') ? 'arrow' : 'line';
      const dir = (head.split(/\s+/)[1] || '').toUpperCase();
      const rows = [];
      edges.forEach((e, i) => {
        const first = i === 0 || edges[i - 1].a !== e.a;
        let span = 1; if (first) while (edges[i + span] && edges[i + span].a === e.a) span++;
        rows.push(el('tr', {}, first ? el('td', { rowspan: span > 1 ? span : null, class: 'from' }, name(e.a)) : null,
          el('td', { class: 'arr', title: tip(e.kind) }, sym(e.kind)), el('td', {}, name(e.b)), el('td', { class: 'lab' }, e.text)));
      });
      const linked = new Set(edges.flatMap(e => [e.a, e.b]));
      const alone = order.filter(id => !linked.has(id));
      alone.forEach(id => rows.push(el('tr', {}, el('td', { class: 'from' }, name(id)), el('td', { class: 'arr' }), el('td', { class: 'rw-muted' }, '(no links)'), el('td', {}))));
      const hasLabels = edges.some(e => e.text);
      return el('div', {}, el('div', { class: 'rw-flow-cap' }, 'Flowchart' + (dir ? ' (' + dir + ')' : '') + ' · ' + edges.length + ' link' + (edges.length === 1 ? '' : 's')),
        el('div', { class: 'rw-table' }, el('table', { class: 'rw-flow' + (hasLabels ? '' : ' nolab') },
          el('thead', {}, el('tr', {}, el('th', {}, 'From'), el('th', {}, ''), el('th', {}, 'To'), el('th', { class: 'lab' }, 'Label'))),
          el('tbody', {}, rows))));
    }
    function seqTable(lines) {
      const alias = new Map(), msgs = [];
      for (const line of lines) {
        let m = /^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/i.exec(line);
        if (m) { if (m[2]) alias.set(m[1], m[2].trim()); continue; }
        m = /^([^-+\s>]+?)\s*(-{1,2}>>|-{1,2}>|-{1,2}x|-{1,2}\))\s*[+-]?\s*([^:]+?)\s*:\s*(.*)$/.exec(line);
        if (m) msgs.push({ a: m[1], b: m[3], kind: m[2], text: m[4] });
      }
      if (!msgs.length) return null;
      const nm = id => alias.get(id) || id;
      return el('div', {}, el('div', { class: 'rw-flow-cap' }, 'Sequence · ' + msgs.length + ' message' + (msgs.length === 1 ? '' : 's')),
        el('div', { class: 'rw-table' }, el('table', { class: 'rw-flow' },
          el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, 'From'), el('th', {}, ''), el('th', {}, 'To'), el('th', {}, 'Message'))),
          el('tbody', {}, msgs.map((x, i) => el('tr', {}, el('td', { class: 'rw-muted' }, i + 1), el('td', { class: 'from' }, nm(x.a)), el('td', { class: 'arr', title: x.kind.startsWith('--') ? 'reply (dashed)' : 'message' }, x.kind.startsWith('--') ? '⇢' : '→'), el('td', {}, nm(x.b)), el('td', {}, x.text)))))));
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
      const hs = [...doc.querySelectorAll('h1, h2, h3, h4')].filter(h => !h.closest('.rw-embed')); // embedded notes' headings don't belong to this note
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
