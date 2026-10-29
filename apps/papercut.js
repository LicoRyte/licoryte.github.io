/* Papercut: a PDF viewer in the old Acrobat style. Open a PDF and read it. Nothing is saved or uploaded:
   the file is read in this browser tab and forgotten when you open another one or close the window.
   Uses Mozilla's pdf.js (Apache-2.0), bundled in apps/vendor/pdfjs/. Loaded the first time the window opens. */
(() => {
  'use strict';
  const BASE = 'apps/vendor/pdfjs/';
  const MAX_BYTES = 200 * 1024 * 1024;

  async function mount(root) {
    const pdfjs = await import('./vendor/pdfjs/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(BASE + 'pdf.worker.min.mjs', location.href).href;

    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const input = el('input', { type: 'file', accept: 'application/pdf,.pdf', hidden: true });
    const nameOut = el('span', { class: 'pc-name' }, 'No file open');
    const pageIn = el('input', { class: 'pc-page', 'aria-label': 'Page number', value: '', inputmode: 'numeric', size: 3, disabled: true });
    const pageCount = el('span', {}, '/ 0');
    const zoomSel = el('select', { 'aria-label': 'Zoom', disabled: true },
      ['fit', 'page', '0.5', '0.75', '1', '1.25', '1.5', '2', '3'].map(v => el('option', { value: v }, v === 'fit' ? 'Fit width' : v === 'page' ? 'Whole page' : Math.round(v * 100) + '%')));
    const btn = (label, title, fn) => el('button', { type: 'button', class: 'btn', title, 'aria-label': title, disabled: true, onclick: fn }, label);
    const prevB = btn('◂', 'Previous page', () => goto(cur - 1)), nextB = btn('▸', 'Next page', () => goto(cur + 1));
    const outB = btn('−', 'Zoom out', () => stepZoom(-1)), inB = btn('+', 'Zoom in', () => stepZoom(1));
    const tools = el('div', { class: 'pc-tools' },
      el('button', { type: 'button', class: 'btn', onclick: () => input.click() }, 'Open...'),
      el('span', { class: 'pc-sep' }), prevB, pageIn, pageCount, nextB,
      el('span', { class: 'pc-sep' }), outB, zoomSel, inB,
      nameOut, input);
    const pages = el('div', { class: 'pc-pages' });
    const view = el('div', { class: 'pc-view sunken', tabindex: '0' }, pages);
    const status = el('span', {}, 'Open a PDF to read it.'), status2 = el('span', {}, 'Nothing is saved');
    root.replaceChildren(tools, view, el('div', { class: 'statusbar' }, status, status2));
    showEmpty();
    function showEmpty(msg) {
      pages.replaceChildren(el('div', { class: 'pc-empty' }, el('div', { class: 'pc-big', 'aria-hidden': 'true' }, '📄'),
        el('p', {}, el('b', {}, msg || 'No PDF open.')), el('p', {}, 'Click ', el('b', {}, 'Open...'), ' or drop a PDF here.'),
        el('p', { class: 'pc-muted' }, 'The file stays in this window and is forgotten when you close it.')));
    }

    let pdf = null, task = null, cur = 1, zoom = 'fit', slots = [], baseSize = [], io = null, token = 0;
    input.addEventListener('change', () => { if (input.files[0]) openFile(input.files[0]); input.value = ''; });
    let depth = 0;
    const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    root.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; root.classList.add('pc-drop'); });
    root.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
    root.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; root.classList.remove('pc-drop'); } });
    root.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; root.classList.remove('pc-drop'); const f = [...e.dataTransfer.files].find(x => /\.pdf$/i.test(x.name) || x.type === 'application/pdf'); if (f) openFile(f); else status.textContent = 'That\'s not a PDF.'; });

    async function openFile(file) {
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { status.textContent = 'That\'s not a PDF.'; return; }
      if (file.size > MAX_BYTES) { status.textContent = 'That PDF is over 200 MB. Too thick.'; return; }
      const my = ++token;
      if (task) { try { await task.destroy(); } catch (e) {} }
      pdf = null; status.textContent = 'Opening ' + file.name + '...';
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        task = pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false, cMapUrl: BASE + 'cmaps/', cMapPacked: true, standardFontDataUrl: BASE + 'standard_fonts/' });
        task.onPassword = (update, reason) => { const pw = window.prompt(reason === 2 ? 'Wrong password. Try again:' : 'This PDF is password-protected. Password:'); if (pw == null) { task.destroy(); showEmpty('Locked PDF. Not opened.'); status.textContent = 'Cancelled.'; } else update(pw); };
        const doc = await task.promise;
        if (my !== token) return;
        pdf = doc;
      } catch (e) {
        if (my !== token) return;
        showEmpty('Couldn\'t open that PDF.'); status.textContent = 'That file looks damaged or isn\'t really a PDF.'; return;
      }
      nameOut.textContent = file.name; nameOut.title = file.name;
      [prevB, nextB, outB, inB, pageIn, zoomSel].forEach(b => { b.disabled = false; });
      pageCount.textContent = '/ ' + pdf.numPages;
      const first = await pdf.getPage(1);
      const vp = first.getViewport({ scale: 1 });
      baseSize = [vp.width, vp.height];
      buildSlots();
      view.scrollTop = 0; cur = 1; pageIn.value = '1';
      status.textContent = pdf.numPages + ' page' + (pdf.numPages === 1 ? '' : 's');
      view.focus({ preventScroll: true });
    }

    function scaleNow() {
      const avail = Math.max(120, view.clientWidth - 36);
      if (zoom === 'fit') return avail / baseSize[0];
      if (zoom === 'page') return Math.min(avail / baseSize[0], (view.clientHeight - 30) / baseSize[1]);
      return +zoom;
    }
    // one empty slot per page (sized from page 1 until the real page is loaded); pages render when they scroll near
    function buildSlots() {
      if (io) io.disconnect();
      const s = scaleNow();
      slots = Array.from({ length: pdf.numPages }, (_, i) => {
        const box = el('div', { class: 'pc-sheet', 'data-n': i + 1, style: `width:${Math.round(baseSize[0] * s)}px;height:${Math.round(baseSize[1] * s)}px` });
        return { box, size: null, rendered: 0, task: null };
      });
      pages.replaceChildren(...slots.map(x => x.box));
      io = new IntersectionObserver(entries => entries.forEach(en => {
        const i = +en.target.dataset.n - 1;
        if (en.isIntersecting) renderPage(i); else unrender(i);
      }), { root: view, rootMargin: '600px 0px' });
      slots.forEach(x => io.observe(x.box));
    }
    async function renderPage(i) {
      const slot = slots[i], s = scaleNow();
      if (!pdf || slot.rendered === s) return;
      slot.rendered = s;
      const page = await pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: s });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cv = el('canvas', { width: Math.floor(vp.width * dpr), height: Math.floor(vp.height * dpr), 'aria-label': 'Page ' + (i + 1), role: 'img' });
      cv.style.width = Math.floor(vp.width) + 'px'; cv.style.height = Math.floor(vp.height) + 'px';
      slot.box.style.width = Math.floor(vp.width) + 'px'; slot.box.style.height = Math.floor(vp.height) + 'px';
      if (slot.task) slot.task.cancel();
      slot.task = page.render({ canvasContext: cv.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
      try { await slot.task.promise; } catch (e) { return; }
      if (slot.rendered !== s) return;
      slot.box.replaceChildren(cv);
      page.cleanup();
    }
    function unrender(i) { const slot = slots[i]; if (!slot || !slot.rendered) return; if (slot.task) slot.task.cancel(); slot.rendered = 0; slot.box.replaceChildren(); }

    // which page is on screen
    view.addEventListener('scroll', () => {
      if (!pdf) return;
      const mid = view.scrollTop + view.clientHeight * .35;
      let n = 1;
      for (const x of slots) { if (x.box.offsetTop <= mid) n = +x.box.dataset.n; else break; }
      if (n !== cur) { cur = n; if (document.activeElement !== pageIn) pageIn.value = String(n); }
    }, { passive: true });
    function goto(n) {
      if (!pdf) return;
      n = Math.max(1, Math.min(pdf.numPages, n | 0));
      cur = n; pageIn.value = String(n);
      view.scrollTop = slots[n - 1].box.offsetTop - 12;
    }
    pageIn.addEventListener('change', () => goto(+pageIn.value));
    pageIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); goto(+pageIn.value); pageIn.blur(); } });
    const ZS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
    function stepZoom(d) {
      const s = scaleNow();
      const next = d > 0 ? ZS.find(z => z > s + .01) || 3 : [...ZS].reverse().find(z => z < s - .01) || 0.5;
      setZoom(String(next));
    }
    function setZoom(z) {
      zoom = z;
      zoomSel.value = [...zoomSel.options].some(o => o.value === z) ? z : 'fit';
      if (!pdf) return;
      const keep = cur;
      buildSlots(); goto(keep);
    }
    zoomSel.addEventListener('change', () => setZoom(zoomSel.value));
    view.addEventListener('keydown', e => {
      if (!pdf) return;
      if (e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); goto(cur + 1); }
      if (e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); goto(cur - 1); }
      if (e.key === 'Home') { e.preventDefault(); goto(1); }
      if (e.key === 'End') { e.preventDefault(); goto(pdf.numPages); }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); stepZoom(1); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); stepZoom(-1); }
    });
    // re-fit when the window is resized (only for the "fit" zooms)
    let rt = 0, lastW = 0;
    if ('ResizeObserver' in window) new ResizeObserver(() => {
      if (!pdf || (zoom !== 'fit' && zoom !== 'page') || Math.abs(view.clientWidth - lastW) < 8) return;
      lastW = view.clientWidth;
      clearTimeout(rt); rt = setTimeout(() => { const keep = cur; buildSlots(); goto(keep); }, 150);
    }).observe(view);
    return {};
  }
  window.Papercut = { mount };
})();
