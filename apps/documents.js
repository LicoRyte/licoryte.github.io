/* Documents: a folder on the desktop that keeps .md, .pdf, .txt and image files in this browser (IndexedDB).
   Double-click opens notes in Readworm, PDFs in Papercut and pictures in the picture viewer.
   Files are copies: nothing is uploaded, and only this browser on this device has them.
   Loaded by index.html the first time the Documents window opens. */
(() => {
  'use strict';
  const DB = 'lico-docs', META = 'items', BLOBS = 'blobs';
  const MAX_FILE = 200 * 1024 * 1024;
  const MD_RE = /\.(md|markdown|mdown|mkd|txt)$/i, PDF_RE = /\.pdf$/i, IMG_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
  const kindOf = name => MD_RE.test(name) ? 'note' : PDF_RE.test(name) ? 'pdf' : IMG_RE.test(name) ? 'image' : null;
  const ICON = { folder: 'img/icons/ftype-folder.png', note: 'img/icons/readworm.png', pdf: 'img/icons/papercut.png', image: 'img/icons/ftype-image.png' };

  /* tiny IndexedDB helpers: "items" holds names/folders (small), "blobs" holds the file contents */
  let dbp = null;
  function db() {
    return dbp || (dbp = new Promise((ok, no) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore(META, { keyPath: 'id' }); d.createObjectStore(BLOBS); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    }));
  }
  const req = r => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function store(names, mode) { const d = await db(); const t = d.transaction(names, mode); return { t, s: n => t.objectStore(n), done: new Promise((ok, no) => { t.oncomplete = ok; t.onerror = () => no(t.error); t.onabort = () => no(t.error); }) }; }

  function mount(root, hooks) {
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const fileIn = el('input', { type: 'file', multiple: true, hidden: true, accept: '.md,.markdown,.mdown,.mkd,.txt,.pdf,image/*' });
    const folderIn = el('input', { type: 'file', multiple: true, hidden: true, webkitdirectory: true });
    const upBtn = el('button', { type: 'button', class: 'btn dk-up', title: 'Up one folder (Backspace). You can also drop files here to move them up.', onclick: () => goUp() }, '⬆ Up');
    const addr = el('div', { class: 'dk-addr' });
    const tools = el('div', { class: 'dk-tools' },
      upBtn, addr,
      el('button', { type: 'button', class: 'btn', onclick: () => fileIn.click() }, 'Add files...'),
      el('button', { type: 'button', class: 'btn', title: 'Copy a whole folder (with subfolders) in here', onclick: () => folderIn.click() }, 'Add folder...'),
      el('button', { type: 'button', class: 'btn', onclick: () => newFolder() }, 'New folder'),
      el('button', { type: 'button', class: 'btn', title: 'Delete the selected item (Del)', onclick: () => sel && remove(sel) }, 'Delete'),
      fileIn, folderIn);
    const grid = el('div', { class: 'dk-grid sunken', tabindex: '0', role: 'listbox', 'aria-label': 'Files' });
    const status = el('span', {}, 'Loading...'), status2 = el('span', {}, 'Saved in this browser');
    root.replaceChildren(tools, grid, el('div', { class: 'statusbar' }, status, status2));

    let items = new Map(), cwd = 'root', sel = null, renaming = null;
    const kids = p => [...items.values()].filter(x => x.parent === p).sort((a, b) => (a.kind === 'folder') !== (b.kind === 'folder') ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const pathOf = id => { const out = []; let x = items.get(id); while (x) { out.unshift(x.name); x = items.get(x.parent); } return out; };
    const fmt = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    async function load() {
      try { const { s } = await store([META], 'readonly'); const all = await req(s(META).getAll()); items = new Map(all.map(x => [x.id, x])); }
      catch (e) { status.textContent = 'Your browser blocked storage here (private mode?). Documents can\'t save files.'; return; }
      render();
    }

    function render() {
      if (cwd !== 'root' && !items.has(cwd)) cwd = 'root';
      const list = kids(cwd);
      upBtn.disabled = cwd === 'root';
      addr.replaceChildren(el('img', { src: 'img/icons/ftype-folder-16.png', alt: '' }), ['Documents', ...pathOf(cwd)].join(' \\ '));
      if (!list.length) grid.replaceChildren(el('div', { class: 'dk-empty' }, el('p', {}, el('b', {}, cwd === 'root' ? 'Your Documents folder is empty.' : 'This folder is empty.')),
        el('p', {}, 'Drop .md, .pdf, .txt or image files here, or use ', el('b', {}, 'Add files...'), ' / ', el('b', {}, 'Add folder...'), '.'),
        el('p', { class: 'dk-muted' }, 'Files are copied into this browser only. Edit a note somewhere else? Add it again to update it here.')));
      else grid.replaceChildren(...list.map(itemEl));
      const total = [...items.values()].reduce((a, x) => a + (x.size || 0), 0);
      status.textContent = list.length + ' object(s)' + (items.size ? ' · ' + fmt(total) + ' in Documents' : '');
    }
    function itemEl(x) {
      const b = el('button', { type: 'button', class: 'dk-item' + (x.id === sel ? ' sel' : ''), 'data-id': x.id, role: 'option', 'aria-selected': String(x.id === sel), title: x.name + (x.kind === 'folder' ? '' : ' (' + fmt(x.size) + ')'), draggable: 'true' },
        el('img', { src: ICON[x.kind] || 'img/icons/ftype-unknown.png', alt: '' }), el('span', {}, x.name));
      return b;
    }
    function select(id) { sel = id; grid.querySelectorAll('.dk-item').forEach(b => { const on = b.dataset.id === id; b.classList.toggle('sel', on); b.setAttribute('aria-selected', String(on)); }); }
    const coarse = matchMedia('(pointer: coarse)').matches;
    grid.addEventListener('click', e => {
      const b = e.target.closest('.dk-item'); if (!b || renaming) { if (!b && !renaming) select(null); return; }
      if (coarse && sel === b.dataset.id) { open(b.dataset.id); return; } // phones: tap to select, tap again to open
      select(b.dataset.id);
    });
    grid.addEventListener('dblclick', e => { const b = e.target.closest('.dk-item'); if (b && !renaming) open(b.dataset.id); });
    grid.addEventListener('keydown', e => {
      if (renaming || e.target.tagName === 'INPUT') return;
      const list = kids(cwd), i = list.findIndex(x => x.id === sel);
      if (e.key === 'Enter' && sel) { e.preventDefault(); open(sel); }
      else if (e.key === 'Delete' && sel) { e.preventDefault(); remove(sel); }
      else if (e.key === 'F2' && sel) { e.preventDefault(); rename(sel); }
      else if (e.key === 'Backspace') { e.preventDefault(); goUp(); }
      else if (/^Arrow(Right|Down)$/.test(e.key) && list.length) { e.preventDefault(); select(list[Math.min(list.length - 1, i + 1)].id); }
      else if (/^Arrow(Left|Up)$/.test(e.key) && list.length) { e.preventDefault(); select(list[Math.max(0, i - 1)].id); }
    });
    grid.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      const b = e.target.closest('.dk-item');
      if (!b) { hooks.menu(e.clientX, e.clientY, [{ label: 'Add files...', run: () => fileIn.click() }, { label: 'Add folder...', run: () => folderIn.click() }, { label: 'New folder', icon: 'img/icons/ftype-folder-16.png', run: () => newFolder() }]); return; }
      const x = items.get(b.dataset.id); select(x.id);
      const menu = [{ label: x.kind === 'folder' ? 'Open' : x.kind === 'note' ? 'Open in Readworm' : x.kind === 'pdf' ? 'Open in Papercut' : 'View', bold: true, run: () => open(x.id) }];
      if (x.kind === 'folder') menu.push({ label: 'Open all notes in Readworm', icon: 'img/icons/readworm-16.png', run: () => openFolderNotes(x.id) });
      menu.push('-', { label: 'Rename', run: () => rename(x.id) }, { label: 'Delete', run: () => remove(x.id) });
      hooks.menu(e.clientX, e.clientY, menu);
    });

    async function blobOf(id) { const { s } = await store([BLOBS], 'readonly'); return req(s(BLOBS).get(id)); }
    async function asFile(x, prefix) { const blob = await blobOf(x.id); const f = new File([blob], x.name, { type: x.type || blob.type || '' }); f.rwPath = (prefix || ['Documents', ...pathOf(x.parent)].join('/')) + '/' + x.name; return f; }
    async function allImages() { return Promise.all([...items.values()].filter(x => x.kind === 'image').slice(0, 300).map(x => asFile(x))); }
    async function open(id) {
      const x = items.get(id); if (!x) return;
      if (x.kind === 'folder') { cwd = id; sel = null; render(); grid.focus(); return; }
      status.textContent = 'Opening ' + x.name + '...';
      try {
        if (x.kind === 'note') await hooks.openNotes([await asFile(x), ...(await allImages())]);
        else if (x.kind === 'pdf') await hooks.openPdf(await asFile(x));
        else if (x.kind === 'image') hooks.viewImage(URL.createObjectURL(await blobOf(id)), x.name);
        render();
      } catch (e) { status.textContent = 'Couldn\'t open ' + x.name + '.'; }
    }
    async function openFolderNotes(id) {
      const out = [];
      const walk = p => kids(p).forEach(x => { if (x.kind === 'folder') walk(x.id); else if (x.kind === 'note') out.push(x); });
      walk(id);
      if (!out.length) { status.textContent = 'No notes in that folder.'; return; }
      await hooks.openNotes([...(await Promise.all(out.map(x => asFile(x)))), ...(await allImages())]);
      status.textContent = 'Opened ' + out.length + ' note' + (out.length > 1 ? 's' : '') + ' in Readworm.';
    }
    function goUp() { if (cwd === 'root') return; const p = items.get(cwd); sel = cwd; cwd = p ? p.parent : 'root'; render(); select(sel); grid.focus(); }

    /* adding files (from the buttons or dropped from your computer) */
    let asked = false;
    async function addFiles(entries) { // entries: [{ file, dirs: ['sub', 'folder'] }]
      const ok = entries.filter(e => kindOf(e.file.name));
      const skipped = entries.length - ok.length;
      if (!ok.length) { status.textContent = entries.length ? 'Only .md, .txt, .pdf and image files go in Documents.' : ''; return; }
      if (!asked && navigator.storage && navigator.storage.persist) { asked = true; navigator.storage.persist().catch(() => {}); } // ask the browser not to auto-clean
      let added = 0, replaced = 0, tooBig = 0;
      const base = cwd;
      try {
        const { s, done } = await store([META, BLOBS], 'readwrite');
        const folderFor = dirs => {
          let p = base;
          for (const d of dirs) {
            let f = [...items.values()].find(x => x.parent === p && x.kind === 'folder' && x.name === d);
            if (!f) { f = { id: uid(), parent: p, name: d, kind: 'folder', added: Date.now() }; items.set(f.id, f); s(META).put(f); }
            p = f.id;
          }
          return p;
        };
        for (const { file, dirs } of ok) {
          if (file.size > MAX_FILE) { tooBig++; continue; }
          const parent = folderFor(dirs);
          const old = [...items.values()].find(x => x.parent === parent && x.kind !== 'folder' && x.name === file.name);
          const meta = { id: old ? old.id : uid(), parent, name: file.name, kind: kindOf(file.name), type: file.type, size: file.size, added: Date.now() };
          items.set(meta.id, meta); s(META).put(meta); s(BLOBS).put(file, meta.id);
          old ? replaced++ : added++;
        }
        await done;
      } catch (e) { status.textContent = /quota/i.test(String(e && e.name)) ? 'Your browser is out of space for Documents.' : 'Couldn\'t save those files.'; await load(); return; }
      render();
      const bits = [];
      if (added) bits.push('Added ' + added); if (replaced) bits.push('updated ' + replaced);
      if (skipped) bits.push(skipped + ' skipped (not .md/.txt/.pdf/image)'); if (tooBig) bits.push(tooBig + ' too big (over 200 MB)');
      status.textContent = bits.join(', ') + '.';
    }
    fileIn.addEventListener('change', () => { addFiles([...fileIn.files].map(file => ({ file, dirs: [] }))); fileIn.value = ''; });
    folderIn.addEventListener('change', () => { addFiles([...folderIn.files].map(file => ({ file, dirs: (file.webkitRelativePath || '').split('/').slice(0, -1) }))); folderIn.value = ''; });

    // drag & drop: files from your computer get added; items dragged inside the window get moved
    let dragId = null, depth = 0;
    grid.addEventListener('dragstart', e => { const b = e.target.closest('.dk-item'); if (!b) return; dragId = b.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', items.get(dragId).name); });
    grid.addEventListener('dragend', () => { dragId = null; root.classList.remove('dk-drop'); });
    const isFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    root.addEventListener('dragenter', e => { if (isFiles(e)) { e.preventDefault(); depth++; root.classList.add('dk-drop'); } });
    root.addEventListener('dragleave', () => { if (--depth <= 0) { depth = 0; root.classList.remove('dk-drop'); } });
    root.addEventListener('dragover', e => {
      if (isFiles(e)) { e.preventDefault(); return; }
      if (dragId && (e.target.closest('.dk-item') || e.target.closest('.dk-up'))) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    });
    root.addEventListener('drop', async e => {
      if (isFiles(e)) {
        e.preventDefault(); depth = 0; root.classList.remove('dk-drop');
        const entries = [];
        const its = [...(e.dataTransfer.items || [])].map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
        if (its.length) { for (const en of its) await walkEntry(en, [], entries); }
        else [...e.dataTransfer.files].forEach(file => entries.push({ file, dirs: [] }));
        addFiles(entries);
        return;
      }
      if (!dragId) return;
      e.preventDefault();
      const tgt = e.target.closest('.dk-item'), up = e.target.closest('.dk-up');
      const dest = up ? (cwd === 'root' ? null : (items.get(cwd) || {}).parent) : tgt && items.get(tgt.dataset.id).kind === 'folder' ? tgt.dataset.id : null;
      if (dest) move(dragId, dest);
      dragId = null;
    });
    function walkEntry(en, dirs, out) {
      return new Promise(res => {
        if (en.isFile) en.file(file => { out.push({ file, dirs }); res(); }, () => res());
        else if (en.isDirectory) {
          const rd = en.createReader(), all = [];
          const more = () => rd.readEntries(async batch => { if (!batch.length) { for (const c of all) await walkEntry(c, [...dirs, en.name], out); res(); } else { all.push(...batch); more(); } }, () => res());
          more();
        } else res();
      });
    }

    async function move(id, dest) {
      const x = items.get(id); if (!x || x.parent === dest || id === dest) return;
      for (let p = dest; p && p !== 'root'; p = (items.get(p) || {}).parent) if (p === id) { status.textContent = 'Can\'t move a folder into itself.'; return; }
      if ([...items.values()].some(y => y.parent === dest && y.name === x.name && y.id !== id)) { status.textContent = 'There\'s already something called ' + x.name + ' there.'; return; }
      x.parent = dest;
      const { s, done } = await store([META], 'readwrite'); s(META).put(x); await done;
      render(); status.textContent = 'Moved ' + x.name + '.';
    }
    async function newFolder() {
      const names = new Set(kids(cwd).map(x => x.name));
      let name = 'New Folder', n = 2; while (names.has(name)) name = 'New Folder (' + n++ + ')';
      const f = { id: uid(), parent: cwd, name, kind: 'folder', added: Date.now() };
      items.set(f.id, f);
      try { const { s, done } = await store([META], 'readwrite'); s(META).put(f); await done; } catch (e) { items.delete(f.id); status.textContent = 'Couldn\'t make a folder.'; return; }
      render(); select(f.id); rename(f.id);
    }
    function rename(id) {
      const x = items.get(id), b = grid.querySelector(`.dk-item[data-id="${id}"]`); if (!x || !b) return;
      const label = b.querySelector('span');
      const inp = el('input', { class: 'dk-rename', value: x.name, 'aria-label': 'New name', spellcheck: 'false', maxlength: 120 });
      renaming = id; label.replaceWith(inp); b.draggable = false;
      const dot = x.kind === 'folder' ? -1 : x.name.lastIndexOf('.');
      inp.focus(); inp.setSelectionRange(0, dot > 0 ? dot : x.name.length);
      let done = false;
      const finish = async keep => {
        if (done) return; done = true; renaming = null;
        let v = inp.value.trim().replace(/[\\/:*?"<>|]/g, '');
        if (keep && v && v !== x.name) {
          if (x.kind !== 'folder' && kindOf(v) !== x.kind) v += x.name.slice(x.name.lastIndexOf('.')); // keep the file type
          if (kids(x.parent).some(y => y.name === v && y.id !== id)) status.textContent = 'There\'s already something called ' + v + ' here.';
          else { x.name = v; const { s, done: d } = await store([META], 'readwrite'); s(META).put(x); await d; }
        }
        render(); select(id); grid.focus();
      };
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
      inp.addEventListener('blur', () => finish(true));
      inp.addEventListener('click', e => e.stopPropagation()); inp.addEventListener('dblclick', e => e.stopPropagation());
    }
    async function remove(id) {
      const x = items.get(id); if (!x) return;
      const all = []; const walk = i => { all.push(i); kids(i).forEach(k => walk(k.id)); }; walk(id);
      const files = all.filter(i => items.get(i).kind !== 'folder').length;
      if (!window.confirm(x.kind === 'folder' ? `Delete the folder "${x.name}"` + (files ? ` and the ${files} file(s) in it` : '') + '? This can\'t be undone.' : `Delete "${x.name}"? This can't be undone.`)) return;
      try { const { s, done } = await store([META, BLOBS], 'readwrite'); all.forEach(i => { s(META).delete(i); s(BLOBS).delete(i); }); await done; }
      catch (e) { status.textContent = 'Couldn\'t delete that.'; return; }
      all.forEach(i => items.delete(i)); if (all.includes(sel)) sel = null;
      render(); status.textContent = 'Deleted ' + x.name + '.';
    }
    load();
    return { refresh: load };
  }
  window.Documents = { mount };
})();
