/* Network Man: a small network simulator for learning (PC, Switch, Router, Server, IPv4, ARP, ICMP ping).
   Loaded by index.html the first time the Network Man window opens. Everything is saved in the visitor's browser.
   Made for Lico's Not-So-Awesome Archive. */
(() => {
  'use strict';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const KEY = 'lico-netman';
  const BCAST = 'FF:FF:FF:FF:FF:FF';
  const MAX_FRAMES = 250; // safety stop for switch loops

  const TYPES = {
    pc: { label: 'PC', ports: 1, port: i => 'Eth' + i, l3: true },
    server: { label: 'Server', ports: 1, port: i => 'Eth' + i, l3: true },
    switch: { label: 'Switch', ports: 8, port: i => 'Fa0/' + (i + 1), l3: false },
    router: { label: 'Router', ports: 4, port: i => 'G0/' + i, l3: true },
  };

  /* Pixel-art devices (original, 30x24 each). Letters map to the colors in PIX_PAL; '.' is transparent. */
  const PIX_PAL = {"k": "#000000", "w": "#FFFFFF", "l": "#DFDFDF", "g": "#C0C0C0", "d": "#808080", "s": "#404040", "G": "#0B4A12", "L": "#5BE35B", "M": "#2E8B22", "y": "#FFD600", "r": "#E8352A", "c": "#2462D8", "b": "#96C4F0"};
  const PIX = {"pc": ["..kkkkkkkkkkkkkkkkkkkkkkkk....", "..kwwwwwwwwwwwwwwwwwwwwwgk....", "..kwgggggggggggggggggggdgk....", "..kwgkkkkkkkkkkkkkkkkkkgdk....", "..kwgkGGGGGGGGGGGGGGGGkgdk....", "..kwgkGLLGGGGGGGGGGGGGkgdk....", "..kwgkGLGGGGGGGGGGGGGGkgdk....", "..kwgkGGLLLLLGGGGGGGGGkgdk....", "..kwgkGGGGGGGGGGGGGGGGkgdk....", "..kwgkGGLLLLLLLLGGGGGGkgdk....", "..kwgkGGGGGGGGGGGGGGGGkgdk....", "..kwgkGGLLLMGGGGGGGGGGkgdk....", "..kwgkkkkkkkkkkkkkkkkkkgdk....", "..kwgggggggggggggggggyggdk....", "..kddddddddddddddddddddddk....", "..kkkkkkkkkkkkkkkkkkkkkkkk....", "..........kwggddk.............", "......kkkkkkkkkkkkkkk.........", ".kkkkkkkkkkkkkkkkkkkkkkkkkk...", ".kwwwwwwwwwwwwwwwwwwwwwwwgk...", ".kwglglglglglglglglglglgdgk...", ".kwgglglglglglglglglglglggk...", ".kwdddddddddddddddddddddddk...", ".kkkkkkkkkkkkkkkkkkkkkkkkkk..."], "server": [".........kkkkkkkkkkkk.........", ".........kwwwwwwwwwgk.........", ".........kwgggggggdgk.........", ".........kwkkkkkkkkgk.........", ".........kwkdddddddgk.........", ".........kwkwwwwwgdgk.........", ".........kwkkkkkkkkgk.........", ".........kwkdddddddgk.........", ".........kwkwwwwwgdgk.........", ".........kwkkkkkkkkgk.........", ".........kwggggggggdk.........", ".........kwgdgdgdgddk.........", ".........kwggggggggdk.........", ".........kwgdgdgdgddk.........", ".........kwggggggggdk.........", ".........kwgdgdgdgddk.........", ".........kwggggggggdk.........", ".........kwggggLgyrdk.........", ".........kwggggggggdk.........", ".........kwggggggggdk.........", ".........kddddddddddk.........", ".........kkkkkkkkkkkk.........", "..........kdk......kdk........", "..........kkk......kkk........"], "switch": ["..............................", "..............................", "..............................", "..............................", "..............................", "..............................", "..............................", ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.", ".kwwwwwwwwwwwwwwwwwwwwwwwwwgk.", ".kwggggggggggggggggggggggggdk.", ".kwgLgLgLgLgLgLgLgLggggMMMgdk.", ".kwggggggggggggggggggggggggdk.", ".kwgkkgkkgkkgkkgkkgkkgkkgkkdk.", ".kwgksgksgksgksgksgksgksgksdk.", ".kwggggggggggggggggggggggggdk.", ".kddddddddddddddddddddddddddk.", ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.", "..............................", "..............................", "..............................", "..............................", "..............................", "..............................", ".............................."], "router": ["..............................", "..............................", "..............................", "...kk..................kk.....", "...kk..................kk.....", "...kk..................kk.....", "...kk..................kk.....", "...kk..................kk.....", "...kk..................kk.....", "..kddk................kddk....", ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.", ".kwwwwwwwwwwwwwwwwwwwwwwwwwgk.", ".kwbbbbbbbbbbbbbbbbbbbbbbbbdk.", ".kwbccccccccccccccccccccccbdk.", ".kwbcwcccccccccccccccccccdbdk.", ".kwbcccccccccccccccccccccdbdk.", ".kwbbbbbbbbbbbbbbbbbbbbbbbbdk.", ".kwgLgygLgrgggggggkkgkkgkkgdk.", ".kwggggggggggggggggggggggggdk.", ".kddddddddddddddddddddddddddk.", ".kkkkkkkkkkkkkkkkkkkkkkkkkkkk.", "..............................", "..............................", ".............................."]};
  const pixCache = {};
  function pixURL(type) {
    if (pixCache[type]) return pixCache[type];
    const rows = PIX[type], c = document.createElement('canvas'); c.width = 30; c.height = 24;
    const x = c.getContext('2d');
    rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = PIX_PAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
    return (pixCache[type] = c.toDataURL());
  }

  /* ---------- small helpers ---------- */
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) { if (k == null || k === false || k === '') continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
    return e;
  }
  function sv(tag, attrs, ...kids) {
    const e = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) e.setAttribute(k, v);
    for (const k of kids) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---------- IPv4 math ---------- */
  function ipInt(s) {
    const m = String(s || '').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const p = m.slice(1).map(Number);
    if (p.some(x => x > 255)) return null;
    return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
  }
  const ipStr = n => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  function prefixOf(s) {
    s = String(s || '').trim().replace(/^\//, '');
    if (/^\d{1,2}$/.test(s)) { const n = +s; return n <= 32 ? n : null; }
    const v = ipInt(s); if (v == null) return null;
    const inv = (~v) >>> 0;
    if ((inv & (inv + 1)) !== 0) return null; // ones must be contiguous
    let n = 0; for (let i = 31; i >= 0; i--) { if ((v >>> i) & 1) n++; else break; }
    return n;
  }
  const maskInt = p => p === 0 ? 0 : ((0xFFFFFFFF << (32 - p)) >>> 0);
  const maskStr = p => ipStr(maskInt(p));
  const netOf = (ip, p) => (ip & maskInt(p)) >>> 0;
  const sameNet = (a, b, p) => netOf(a, p) === netOf(b, p);
  function ifaceInfo(port) { // valid ip/prefix of a port, or null
    const ip = ipInt(port.ip), p = prefixOf(port.mask);
    if (ip == null || p == null || p === 0) return null;
    return { ip, p };
  }

  /* ---------- the network model ---------- */
  function blank() { return { devices: [], links: [], seq: 1 }; }
  function mac(n) { const h = n.toString(16).toUpperCase().padStart(6, '0'); return '0A:00:00:' + h.slice(0, 2) + ':' + h.slice(2, 4) + ':' + h.slice(4, 6); }
  function newDevice(net, type, x, y) {
    const t = TYPES[type];
    const count = net.devices.filter(d => d.type === type).length + 1;
    let name = t.label + count;
    while (net.devices.some(d => d.name === name)) name += "'";
    const d = { id: 'd' + (net.seq++), type, name, x, y, ports: [] };
    for (let i = 0; i < t.ports; i++) d.ports.push({ n: t.port(i), mac: mac(net.seq++), ip: '', mask: type === 'switch' ? '' : '255.255.255.0' });
    if (type === 'pc' || type === 'server') d.gw = '';
    if (type === 'router') d.routes = [];
    net.devices.push(d);
    return d;
  }
  function example() {
    const net = blank();
    const pc1 = newDevice(net, 'pc', 70, 80), pc2 = newDevice(net, 'pc', 70, 290);
    const sw1 = newDevice(net, 'switch', 200, 185), r1 = newDevice(net, 'router', 340, 185);
    const sw2 = newDevice(net, 'switch', 470, 185), sv1 = newDevice(net, 'server', 590, 120);
    const pc3 = newDevice(net, 'pc', 590, 280);
    Object.assign(pc1.ports[0], { ip: '192.168.1.10', mask: '255.255.255.0' }); pc1.gw = '192.168.1.1';
    Object.assign(pc2.ports[0], { ip: '192.168.1.11', mask: '255.255.255.0' }); pc2.gw = '192.168.1.1';
    Object.assign(r1.ports[0], { ip: '192.168.1.1', mask: '255.255.255.0' });
    Object.assign(r1.ports[1], { ip: '10.0.0.1', mask: '255.255.255.0' });
    Object.assign(sv1.ports[0], { ip: '10.0.0.10', mask: '255.255.255.0' }); sv1.gw = '10.0.0.1';
    Object.assign(pc3.ports[0], { ip: '10.0.0.20', mask: '255.255.255.0' }); pc3.gw = '10.0.0.1';
    const link = (a, ap, b, bp) => net.links.push({ id: 'l' + (net.seq++), a: { d: a.id, p: ap }, b: { d: b.id, p: bp } });
    link(pc1, 0, sw1, 0); link(pc2, 0, sw1, 1); link(sw1, 7, r1, 0); link(r1, 1, sw2, 7); link(sw2, 0, sv1, 0); link(sw2, 1, pc3, 0);
    return net;
  }

  /* ---------- mount: builds the whole app inside root ---------- */
  function mount(root, hooks = {}) {
    let net;
    try { net = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!net || !Array.isArray(net.devices)) net = example();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(net)); } catch (e) {} };
    const dev = id => net.devices.find(d => d.id === id);
    const linkAt = (d, p) => net.links.find(l => (l.a.d === d && l.a.p === p) || (l.b.d === d && l.b.p === p));
    const otherEnd = (l, d, p) => (l.a.d === d && l.a.p === p) ? l.b : l.a;
    const portName = end => { const d = dev(end.d); return d ? d.name + ' ' + d.ports[end.p].n : '?'; };

    /* UI skeleton */
    const tools = el('div', { class: 'nm-tools' });
    const svg = sv('svg', { class: 'nm-svg', role: 'application', 'aria-label': 'Network diagram. Click to select, Delete removes, Esc cancels a cable.', tabindex: '0' });
    const gLinks = sv('g'), gDevs = sv('g'), gLabels = sv('g', { class: 'nm-labels' }), gFx = sv('g');
    svg.append(gLinks, gDevs, gLabels, gFx);
    const hint = el('div', { class: 'nm-hint' });
    const stage = el('div', { class: 'nm-stage sunken' }, svg, hint);
    const tabBtns = {}, tabPanes = {};
    const tabsBar = el('div', { class: 'nm-tabs', role: 'tablist' });
    ['Device', 'Packet', 'Log'].forEach(t => {
      tabBtns[t] = el('button', { type: 'button', role: 'tab', onclick: () => showTab(t) }, t);
      tabPanes[t] = el('div', { class: 'nm-pane', role: 'tabpanel', hidden: true });
      tabsBar.append(tabBtns[t]);
    });
    const side = el('aside', { class: 'nm-side' }, tabsBar, ...Object.values(tabPanes));
    const status = el('span', {}, ''), status2 = el('span', {}, '');
    root.replaceChildren(tools, el('div', { class: 'nm-main' }, stage, side), el('div', { class: 'statusbar' }, status, status2));
    function showTab(t) { for (const k in tabBtns) { tabBtns[k].setAttribute('aria-selected', String(k === t)); tabPanes[k].hidden = k !== t; } }

    /* toolbar */
    let tool = 'select', cableFrom = null, selected = null; // selected: {kind:'dev'|'link', id}
    const addBtn = type => el('button', { type: 'button', class: 'btn nm-add', title: 'Add a ' + TYPES[type].label, onclick: () => addDevice(type) }, iconSmall(type), TYPES[type].label);
    const cableBtn = el('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', title: 'Connect two devices: click one, then the other', onclick: () => setTool(tool === 'cable' ? 'select' : 'cable') }, '〰 Cable');
    const delBtn = el('button', { type: 'button', class: 'btn', title: 'Delete the selected device or cable (Delete key)', onclick: () => deleteSelected() }, '✕ Delete');
    const srcSel = el('select', { 'aria-label': 'Ping from' });
    const dstIn = el('input', { 'aria-label': 'Ping destination IP', placeholder: 'destination IP', list: 'nmIps', spellcheck: 'false', size: 13 });
    const ipList = el('datalist', { id: 'nmIps' });
    const sendBtn = el('button', { type: 'button', class: 'btn', onclick: () => startPing() }, 'Ping');
    const stepBtn = el('button', { type: 'button', class: 'btn', title: 'Next step', onclick: () => step() }, 'Step ▸');
    const playBtn = el('button', { type: 'button', class: 'btn', title: 'Play all steps', onclick: () => togglePlay() }, 'Play ▸▸');
    const speedSel = el('select', { 'aria-label': 'Speed', title: 'Animation speed' }, el('option', { value: '1400' }, 'Slow'), el('option', { value: '750', selected: true }, 'Normal'), el('option', { value: '300' }, 'Fast'));
    const moreSel = el('select', { 'aria-label': 'More actions', class: 'nm-more' },
      el('option', { value: '' }, 'More...'), el('option', { value: 'tables' }, 'Clear ARP/MAC tables'), el('option', { value: 'example' }, 'Load example network'), el('option', { value: 'clear' }, 'Empty workspace'));
    moreSel.addEventListener('change', () => {
      const v = moreSel.value; moreSel.value = '';
      if (v === 'tables') { clearTables(); setStatus('ARP and MAC tables cleared. Next ping starts from zero.'); }
      if (v === 'example') { if (confirmReplace()) { net = example(); afterTopologyChange(); } }
      if (v === 'clear') { if (confirmReplace()) { net = blank(); afterTopologyChange(); } }
    });
    function confirmReplace() { return net.devices.length === 0 || window.confirm('Replace the current network? It can\'t be undone.'); }
    tools.append(
      el('span', { class: 'nm-group' }, addBtn('pc'), addBtn('switch'), addBtn('router'), addBtn('server')),
      el('span', { class: 'nm-group' }, cableBtn, delBtn),
      el('span', { class: 'nm-group nm-ping' }, el('label', {}, 'Ping from ', srcSel), el('label', {}, ' to ', dstIn), ipList, sendBtn),
      el('span', { class: 'nm-group' }, stepBtn, playBtn, speedSel, moreSel));

    function setTool(t) {
      tool = t; cableFrom = null;
      cableBtn.setAttribute('aria-pressed', String(t === 'cable'));
      stage.classList.toggle('cabling', t === 'cable');
      renderAll();
    }
    function setStatus(s) { status.textContent = s; }

    /* ---------- drawing ---------- */
    function iconSmall(type) {
      return el('img', { src: pixURL(type), width: 30, height: 24, alt: '', class: 'nm-ico' });
    }
    function glyph(type) {
      const im = sv('image', { width: 60, height: 48, class: 'nm-pix' });
      im.setAttribute('href', pixURL(type));
      return im;
    }
    const W = () => svg.clientWidth || 600, H = () => svg.clientHeight || 400;
    // The drawing zooms out to fit when the window is smaller than the network (phones); 1:1 otherwise.
    let vb = { w: 600, h: 400 };
    function clampDev(d) { d.x = Math.max(34, Math.min(1600, d.x)); d.y = Math.max(30, Math.min(1200, d.y)); }
    function fitView() {
      if (drag) return; // keep the zoom steady while dragging
      let mx = 0, my = 0;
      for (const d of net.devices) { mx = Math.max(mx, d.x + 40); my = Math.max(my, d.y + 82); }
      vb = { w: Math.max(W(), mx), h: Math.max(H(), my) };
      svg.setAttribute('viewBox', `0 0 ${vb.w} ${vb.h}`);
      svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    }
    function toSvg(e) {
      const m = svg.getScreenCTM();
      if (!m) { const r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return { x: pt.x, y: pt.y };
    }
    function devLabel(d) {
      if (d.type === 'pc' || d.type === 'server') {
        const info = ifaceInfo(d.ports[0]);
        return info ? ipStr(info.ip) + '/' + info.p : 'no IP';
      }
      return '';
    }
    function renderAll() {
      gLinks.replaceChildren(); gDevs.replaceChildren(); gLabels.replaceChildren();
      for (const l of net.links) {
        const a = dev(l.a.d), b = dev(l.b.d); if (!a || !b) continue;
        const sel = selected && selected.kind === 'link' && selected.id === l.id;
        const g = sv('g', { class: 'nm-link' + (sel ? ' sel' : ''), 'data-id': l.id });
        g.append(sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'wire' }), sv('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'hit' }));
        for (const [end, me, them] of [[l.a, a, b], [l.b, b, a]]) {
          const dx = them.x - me.x, dy = them.y - me.y, len = Math.hypot(dx, dy) || 1;
          const off = Math.min(0.32, 44 / len);
          gLabels.append(sv('text', { x: me.x + dx * off, y: me.y + dy * off - 4, class: 'port' + (me.type === 'router' ? ' rport' : '') }, me.ports[end.p].n));
          if (me.type === 'router') {
            const info = ifaceInfo(me.ports[end.p]);
            const f = Math.min(0.42, Math.max(off + 0.12, 70 / len));
            if (info) gLabels.append(sv('text', { x: me.x + dx * f, y: me.y + dy * f + 13, class: 'port rport rip' }, ipStr(info.ip)));
          }
        }
        gLinks.append(g);
      }
      net.devices.forEach(clampDev);
      fitView();
      for (const d of net.devices) {
        const sel = selected && selected.kind === 'dev' && selected.id === d.id;
        const g = sv('g', { class: 'nm-dev' + (sel ? ' sel' : '') + (cableFrom === d.id ? ' from' : ''), transform: `translate(${d.x - 30},${d.y - 24})`, 'data-id': d.id, tabindex: 0, role: 'button', 'aria-label': TYPES[d.type].label + ' ' + d.name });
        g.append(sv('rect', { x: -4, y: -4, width: 68, height: 56, class: 'halo', rx: 4 }), glyph(d.type),
          sv('text', { x: 30, y: 60, class: 'name' }, d.name));
        const lab = devLabel(d);
        if (lab) g.append(sv('text', { x: 30, y: 72, class: 'ip' + (lab === 'no IP' ? ' warn' : '') }, lab));
        gDevs.append(g);
      }
      hint.textContent = tool === 'cable' ? (cableFrom ? 'Now click the device to connect to. (Esc cancels)' : 'Cable: click the first device.') : (net.devices.length ? '' : 'Empty. Add a PC, Switch, Router or Server from the toolbar.');
      hint.hidden = !hint.textContent;
      refreshPingSources();
    }

    /* ---------- editing ---------- */
    function addDevice(type) {
      const n = net.devices.length;
      const d = newDevice(net, type, 80 + (n * 70) % Math.max(140, W() - 160), 70 + (Math.floor(n * 70 / Math.max(140, W() - 160)) * 90) % Math.max(100, H() - 120));
      selected = { kind: 'dev', id: d.id };
      afterTopologyChange(); showTab('Device');
    }
    function deleteSelected() {
      if (!selected) { setStatus('Select a device or cable first.'); return; }
      if (selected.kind === 'dev') {
        const d = dev(selected.id); if (!d) return;
        net.links = net.links.filter(l => l.a.d !== d.id && l.b.d !== d.id);
        net.devices = net.devices.filter(x => x !== d);
        setStatus('Deleted ' + d.name + '.');
      } else {
        net.links = net.links.filter(l => l.id !== selected.id); setStatus('Cable removed.');
      }
      selected = null; afterTopologyChange();
    }
    function connect(a, b) {
      if (a.id === b.id) return 'Pick a different device.';
      if (net.links.some(l => (l.a.d === a.id && l.b.d === b.id) || (l.a.d === b.id && l.b.d === a.id))) return 'Those two are already connected.';
      const free = d => d.ports.findIndex((p, i) => !linkAt(d.id, i));
      const pa = free(a), pb = free(b);
      if (pa < 0) return a.name + ' has no free ports (' + a.ports.length + ' max).';
      if (pb < 0) return b.name + ' has no free ports (' + b.ports.length + ' max).';
      net.links.push({ id: 'l' + (net.seq++), a: { d: a.id, p: pa }, b: { d: b.id, p: pb } });
      return null;
    }
    function afterTopologyChange() { save(); clearTables(); stopSim(true); renderAll(); renderDevicePane(); }

    // pointer: select, drag, cable
    let drag = null;
    svg.addEventListener('pointerdown', e => {
      try { svg.focus({ preventScroll: true }); } catch (err) {}
      const g = e.target.closest('.nm-dev'), lk = e.target.closest('.nm-link');
      if (g) {
        const d = dev(g.dataset.id);
        if (tool === 'cable') {
          if (!cableFrom) { cableFrom = d.id; renderAll(); return; }
          const err = connect(dev(cableFrom), d);
          if (err) { setStatus(err); if (cableFrom === d.id) { cableFrom = null; renderAll(); } return; }
          setStatus('Connected ' + dev(cableFrom).name + ' to ' + d.name + '.');
          cableFrom = null; afterTopologyChange(); return;
        }
        selected = { kind: 'dev', id: d.id }; renderAll(); renderDevicePane(); showTab('Device');
        const q = toSvg(e);
        drag = { d, ox: q.x - d.x, oy: q.y - d.y, moved: false };
        svg.setPointerCapture(e.pointerId);
      } else if (lk) {
        selected = { kind: 'link', id: lk.dataset.id }; renderAll(); renderDevicePane(); showTab('Device');
      } else {
        if (tool === 'cable' && cableFrom) { cableFrom = null; renderAll(); return; }
        selected = null; renderAll(); renderDevicePane();
      }
    });
    svg.addEventListener('pointermove', e => {
      if (!drag) return;
      const q = toSvg(e);
      drag.d.x = Math.max(34, Math.min(vb.w - 34, q.x - drag.ox)); drag.d.y = Math.max(30, Math.min(vb.h - 44, q.y - drag.oy)); drag.moved = true;
      renderAll();
    });
    const endDrag = () => { if (drag && drag.moved) save(); drag = null; fitView(); };
    svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
    root.addEventListener('keydown', e => {
      if (e.target.closest('input, select, textarea')) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); deleteSelected(); }
      if (e.key === 'Escape' && tool === 'cable') { e.stopPropagation(); setTool('select'); }
      if (e.key === 'Enter' && e.target.closest('.nm-dev')) { selected = { kind: 'dev', id: e.target.closest('.nm-dev').dataset.id }; renderAll(); renderDevicePane(); showTab('Device'); }
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => renderAll()).observe(stage);

    /* ---------- device pane ---------- */
    function field(label, value, onchange, opts = {}) {
      const inp = el('input', { value: value || '', spellcheck: 'false', placeholder: opts.placeholder || '', 'aria-label': label });
      const msg = el('small', { class: 'nm-msg' });
      const check = () => { const m = opts.check ? opts.check(inp.value) : ''; msg.textContent = m || ''; inp.classList.toggle('bad', !!m); };
      inp.addEventListener('change', () => { onchange(inp.value.trim()); check(); save(); clearTables(); renderAll(); });
      inp.addEventListener('input', check);
      check();
      return el('label', { class: 'nm-field' }, el('span', {}, label), inp, msg);
    }
    const ipCheck = v => !v.trim() ? '' : ipInt(v) == null ? 'Not an IPv4 address (like 192.168.1.10)' : '';
    const maskCheck = v => !v.trim() ? '' : prefixOf(v) == null ? 'Use 255.255.255.0 or /24' : '';
    function table(head, rows, empty) {
      if (!rows.length) return el('p', { class: 'nm-empty' }, empty);
      return el('table', { class: 'nm-table' }, el('thead', {}, el('tr', {}, head.map(x => el('th', {}, x)))), el('tbody', {}, rows.map(r => el('tr', {}, r.map(c => el('td', {}, c))))));
    }
    function renderDevicePane() {
      const P = tabPanes.Device;
      if (!selected) {
        P.replaceChildren(el('div', { class: 'nm-help' },
          el('p', {}, el('b', {}, 'Network Man'), ' - build a network, give things IP addresses, then ping and watch every frame.'),
          el('ol', {}, el('li', {}, 'Add devices from the toolbar, drag them around.'), el('li', {}, 'Click ', el('b', {}, 'Cable'), ', then two devices to connect them.'),
            el('li', {}, 'Click a device to set its IP, mask and gateway.'), el('li', {}, 'Pick a PC, type a destination IP, press ', el('b', {}, 'Ping'), ', then ', el('b', {}, 'Step'), '.')),
          el('p', {}, 'Every cable and port just works: no hardware settings here.')));
        return;
      }
      if (selected.kind === 'link') {
        const l = net.links.find(x => x.id === selected.id); if (!l) { selected = null; return renderDevicePane(); }
        P.replaceChildren(el('h3', {}, 'Cable'), el('p', {}, portName(l.a), ' ↔ ', portName(l.b)),
          el('p', { class: 'nm-empty' }, 'A straight Ethernet cable. Frames go both ways.'),
          el('button', { type: 'button', class: 'btn', onclick: deleteSelected }, 'Remove cable'));
        return;
      }
      const d = dev(selected.id); if (!d) { selected = null; return renderDevicePane(); }
      const kids = [el('h3', {}, TYPES[d.type].label), field('Name', d.name, v => { d.name = v || d.name; })];
      const t = tables();
      if (d.type === 'pc' || d.type === 'server') {
        const p = d.ports[0];
        kids.push(field('IP address', p.ip, v => { p.ip = v; }, { check: ipCheck, placeholder: '192.168.1.10' }),
          field('Subnet mask', p.mask, v => { p.mask = v; }, { check: maskCheck, placeholder: '255.255.255.0' }),
          field('Default gateway', d.gw, v => { d.gw = v; }, { check: ipCheck, placeholder: 'router IP, like 192.168.1.1' }),
          el('p', { class: 'nm-kv' }, el('span', {}, 'MAC'), el('code', {}, p.mac)),
          el('p', { class: 'nm-kv' }, el('span', {}, 'Cable'), linkAt(d.id, 0) ? portName(otherEnd(linkAt(d.id, 0), d.id, 0)) : 'not connected'));
        kids.push(el('h4', {}, 'ARP table'), table(['IP', 'MAC'], Object.entries(t.arp[d.id] || {}).map(([ip, m]) => [ip, m]), 'Empty. Fills up when this device talks to others.'));
      } else if (d.type === 'router') {
        kids.push(el('h4', {}, 'Ports'));
        d.ports.forEach((p, i) => {
          const l = linkAt(d.id, i);
          kids.push(el('fieldset', { class: 'nm-port' + (l ? '' : ' off') }, el('legend', {}, p.n + (l ? ' → ' + portName(otherEnd(l, d.id, i)) : ' (no cable)')),
            field('IP address', p.ip, v => { p.ip = v; }, { check: ipCheck, placeholder: 'like 192.168.1.1' }),
            field('Subnet mask', p.mask, v => { p.mask = v; }, { check: maskCheck }),
            el('p', { class: 'nm-kv' }, el('span', {}, 'MAC'), el('code', {}, p.mac))));
        });
        kids.push(el('h4', {}, 'Static routes'), el('p', { class: 'nm-empty' }, 'For networks that aren\'t plugged straight into this router. Next hop = the IP of the next router.'));
        d.routes.forEach((r, i) => kids.push(el('div', { class: 'nm-route' }, el('code', {}, r.net + ' ' + r.mask + ' via ' + r.via),
          el('button', { type: 'button', class: 'btn', title: 'Remove route', onclick: () => { d.routes.splice(i, 1); save(); clearTables(); renderDevicePane(); } }, '×'))));
        const rn = el('input', { placeholder: 'network, like 172.16.0.0', 'aria-label': 'Route network', spellcheck: 'false' });
        const rm = el('input', { placeholder: 'mask, like 255.255.0.0', 'aria-label': 'Route mask', spellcheck: 'false' });
        const rv = el('input', { placeholder: 'next hop, like 10.0.0.2', 'aria-label': 'Route next hop', spellcheck: 'false' });
        const rmsg = el('small', { class: 'nm-msg' });
        kids.push(el('div', { class: 'nm-addroute' }, rn, rm, rv, el('button', { type: 'button', class: 'btn', onclick: () => {
          const n = ipInt(rn.value), p = prefixOf(rm.value), v = ipInt(rv.value);
          if (n == null || p == null || v == null) { rmsg.textContent = 'Fill all three with valid IPv4 values. 0.0.0.0 + 0.0.0.0 = default route.'; return; }
          d.routes.push({ net: ipStr(netOf(n, p)), mask: maskStr(p), via: ipStr(v) }); save(); clearTables(); renderDevicePane();
        } }, 'Add route'), rmsg));
        kids.push(el('h4', {}, 'Routing table'), table(['Network', 'Via', 'Port'], routeTable(d).map(r => [ipStr(r.net) + '/' + r.p, r.kind === 'connected' ? 'directly connected' : r.via, r.port != null ? d.ports[r.port].n : '(no port)']), 'Empty. Give a connected port an IP address.'));
        kids.push(el('h4', {}, 'ARP table'), table(['IP', 'MAC'], Object.entries(t.arp[d.id] || {}), 'Empty.'));
      } else {
        kids.push(el('p', { class: 'nm-empty' }, 'A switch has no IP. It just reads MAC addresses and sends each frame out the right port.'));
        kids.push(el('h4', {}, 'Ports'), table(['Port', 'Connected to'], d.ports.map((p, i) => { const l = linkAt(d.id, i); return l ? [p.n, portName(otherEnd(l, d.id, i))] : null; }).filter(Boolean), 'Nothing plugged in yet.'));
        kids.push(el('h4', {}, 'MAC address table'), table(['MAC', 'Port'], Object.entries(t.mac[d.id] || {}).map(([m, p]) => [m, d.ports[p].n]), 'Empty. The switch learns as frames come in.'));
      }
      kids.push(el('p', {}, el('button', { type: 'button', class: 'btn', onclick: deleteSelected }, 'Delete ' + d.name)));
      P.replaceChildren(...kids);
    }

    /* ---------- routing ---------- */
    function routeTable(r) {
      const out = [];
      r.ports.forEach((p, i) => { const info = ifaceInfo(p); if (info && linkAt(r.id, i)) out.push({ net: netOf(info.ip, info.p), p: info.p, port: i, kind: 'connected' }); });
      for (const rt of r.routes || []) {
        const n = ipInt(rt.net), p = prefixOf(rt.mask), v = ipInt(rt.via);
        if (n == null || p == null || v == null) continue;
        const port = out.find(c => c.kind === 'connected' && sameNet(v, c.net, c.p));
        out.push({ net: netOf(n, p), p, via: rt.via, viaInt: v, port: port ? port.port : null, kind: 'static' });
      }
      return out;
    }
    function lookup(r, dst) {
      let best = null;
      for (const rt of routeTable(r)) if (netOf(dst, rt.p) === rt.net && (!best || rt.p > best.p)) best = rt;
      return best;
    }

    /* ---------- simulation ---------- */
    let T = { arp: {}, mac: {} };
    function tables() { return T; }
    function clearTables() { T = { arp: {}, mac: {} }; if (selected) renderDevicePane(); }
    let sim = null, playing = false, animating = false;
    const hostsList = () => net.devices.filter(d => d.type === 'pc' || d.type === 'server');
    function refreshPingSources() {
      const keep = srcSel.value;
      srcSel.replaceChildren(...hostsList().map(d => el('option', { value: d.id }, d.name)));
      if (keep && dev(keep)) srcSel.value = keep;
      const ips = [];
      for (const d of net.devices) d.ports.forEach(p => { const i = ifaceInfo(p); if (i) ips.push([ipStr(i.ip), d.name + ' ' + p.n]); });
      ipList.replaceChildren(...ips.map(([ip, who]) => el('option', { value: ip }, who)));
      if (!dstIn.value) { const s = hostsList().find(d => d.id !== srcSel.value && ifaceInfo(d.ports[0])); if (s) dstIn.value = ipStr(ifaceInfo(s.ports[0]).ip); }
    }
    function stopSim(silent) {
      playing = false; playBtn.textContent = 'Play ▸▸';
      sim = null; gFx.replaceChildren();
      if (!silent) setStatus('Stopped.');
    }
    let uidSeq = 1;
    function startPing() {
      const src = dev(srcSel.value);
      if (!src) { setStatus('Add a PC or Server first, then pick it in "Ping from".'); return; }
      const dst = ipInt(dstIn.value);
      if (dst == null) { setStatus('Type a destination IPv4 address, like 10.0.0.10.'); dstIn.focus(); return; }
      stopSim(true);
      sim = { queue: [], steps: [], frames: 0, pending: {}, waitingArp: {}, src: src.id, dst, result: null, pingId: 0x1000 + (uidSeq % 4000), finished: false };
      const lines = [];
      const info = ifaceInfo(src.ports[0]);
      const packet = { uid: uidSeq++, src: info ? info.ip : 0, dst, ttl: 64, icmp: { type: 8, code: 0, id: sim.pingId, seq: 1 } };
      lines.push(`${src.name} wants to ping ${ipStr(dst)}. It builds an ICMP Echo Request ("are you there?") inside an IPv4 packet.`);
      originate(src, packet, lines);
      record({ title: 'Ping starts at ' + src.name, packet: clone(packet), lines });
      showTab('Packet'); renderStep(sim.steps.length - 1); renderLog();
      setStatus('Press Step to move the first frame, or Play to run it all.');
      if (!sim.queue.length) finish();
    }
    function record(s) { s.n = sim.steps.length; sim.steps.push(s); }

    // a device (host or router) sends an IP packet toward nextHop out of port pi
    function ipSend(d, pi, packet, nextHop, lines) {
      const port = d.ports[pi];
      const arp = T.arp[d.id] || (T.arp[d.id] = {});
      const known = arp[ipStr(nextHop)];
      if (known) {
        lines.push(`${d.name}'s ARP table already has ${ipStr(nextHop)} → ${known}, so it wraps the packet in an Ethernet frame to that MAC and sends it out ${port.n}.`);
        sendFrame(d, pi, { eth: { dst: known, src: port.mac, type: 'IPv4' }, ip: packet }, lines);
        return;
      }
      const key = d.id + '|' + nextHop;
      (sim.pending[key] || (sim.pending[key] = [])).push({ packet, pi });
      if (sim.waitingArp[key]) { lines.push(`${d.name} is still waiting for the ARP answer for ${ipStr(nextHop)}; the packet waits in line.`); return; }
      sim.waitingArp[key] = true;
      const me = ifaceInfo(port);
      lines.push(`${d.name} needs the MAC address of ${ipStr(nextHop)} but its ARP table has no entry. So the packet waits, and ${d.name} broadcasts an ARP Request out ${port.n}: "Who has ${ipStr(nextHop)}? Tell ${me ? ipStr(me.ip) : '?'}." The destination MAC is FF:FF:FF:FF:FF:FF, which means everyone on this network.`);
      sendFrame(d, pi, { eth: { dst: BCAST, src: port.mac, type: 'ARP' }, arp: { op: 1, senderMac: port.mac, senderIp: me ? me.ip : 0, targetMac: '00:00:00:00:00:00', targetIp: nextHop } }, lines);
    }
    function sendFrame(d, pi, frame, lines) {
      const l = linkAt(d.id, pi);
      if (!l) { lines.push(`...but ${d.name} ${d.ports[pi].n} has no cable plugged in, so the frame goes nowhere.`); return; }
      sim.queue.push({ frame, from: { d: d.id, p: pi }, to: otherEnd(l, d.id, pi), link: l.id });
    }
    // a host or router creates a brand-new IP packet
    function originate(d, packet, lines) {
      if (d.type === 'router') {
        const rt = lookup(d, packet.dst);
        if (!rt || rt.port == null) { lines.push(`${d.name} has no route to ${ipStr(packet.dst)}, so it can't send this.`); return; }
        if (!packet.src) packet.src = ifaceInfo(d.ports[rt.port]).ip;
        ipSend(d, rt.port, packet, rt.kind === 'connected' ? packet.dst : rt.viaInt, lines);
        return;
      }
      const port = d.ports[0], me = ifaceInfo(port);
      if (!me) { lines.push(`But ${d.name} has no valid IP address and subnet mask, so it can't send anything. Click it and set them.`); fail('no IP on ' + d.name); return; }
      if (packet.dst === me.ip) { lines.push(`That's ${d.name}'s own address, so the packet never leaves the computer (loopback). Nothing to see on the wire.`); sim.result = 'success'; return; }
      if (sameNet(packet.dst, me.ip, me.p)) {
        lines.push(`${d.name} compares: its network is ${ipStr(netOf(me.ip, me.p))}/${me.p} and ${ipStr(packet.dst)} is in the same network. So it can deliver directly, no router needed.`);
        ipSend(d, 0, packet, packet.dst, lines);
      } else {
        const gw = ipInt(d.gw);
        if (gw == null) { lines.push(`${ipStr(packet.dst)} is NOT in ${d.name}'s network (${ipStr(netOf(me.ip, me.p))}/${me.p}), so it must go through a router. But ${d.name} has no default gateway set, so it gives up. Set the gateway to the router's IP.`); fail('no default gateway'); return; }
        if (!sameNet(gw, me.ip, me.p)) { lines.push(`The default gateway ${ipStr(gw)} isn't in ${d.name}'s own network, so ${d.name} can't reach it. The gateway must be in the same network as the PC.`); fail('gateway in a different network'); return; }
        lines.push(`${ipStr(packet.dst)} is NOT in ${d.name}'s network (${ipStr(netOf(me.ip, me.p))}/${me.p}). So ${d.name} sends it to its default gateway ${ipStr(gw)} (the router). The IP packet still says the final destination; only the Ethernet frame is addressed to the router.`);
        ipSend(d, 0, packet, gw, lines);
      }
    }
    function fail(why) { if (sim && !sim.result) sim.result = 'fail:' + why; }

    function deliver(ev, lines) {
      const d = dev(ev.to.d), pi = ev.to.p, f = ev.frame;
      if (!d) return;
      const port = d.ports[pi];
      if (d.type === 'switch') {
        const mt = T.mac[d.id] || (T.mac[d.id] = {});
        if (mt[f.eth.src] !== pi) lines.push(`${d.name} learns: MAC ${f.eth.src} lives on port ${port.n}. (Saved in its MAC table.)`);
        mt[f.eth.src] = pi;
        const others = d.ports.map((_, i) => i).filter(i => i !== pi && linkAt(d.id, i));
        if (f.eth.dst === BCAST) {
          lines.push(`The destination is the broadcast MAC, so ${d.name} copies the frame out every other port (${others.length ? others.map(i => d.ports[i].n).join(', ') : 'none'}). This is called flooding.`);
          others.forEach(i => sendFrame(d, i, clone(f), []));
        } else if (mt[f.eth.dst] != null) {
          const out = mt[f.eth.dst];
          if (out === pi) { lines.push(`${f.eth.dst} is on the same port it came from, so ${d.name} drops it (filtering).`); return; }
          lines.push(`${d.name} looks up ${f.eth.dst} in its MAC table: port ${d.ports[out].n}. It forwards the frame only there.`);
          sendFrame(d, out, clone(f), []);
        } else {
          lines.push(`${d.name} doesn't know where ${f.eth.dst} is yet, so it floods the frame out every other port (${others.map(i => d.ports[i].n).join(', ') || 'none'}). Only the owner of that MAC will keep it.`);
          others.forEach(i => sendFrame(d, i, clone(f), []));
        }
        return;
      }
      // PC / server / router port
      if (f.eth.dst !== BCAST && f.eth.dst !== port.mac) { lines.push(`${d.name} sees the destination MAC is ${f.eth.dst}, not its own (${port.mac}), so it ignores the frame.`); return; }
      const me = ifaceInfo(port);
      const arp = T.arp[d.id] || (T.arp[d.id] = {});
      if (f.arp) {
        const a = f.arp;
        if (a.op === 1) {
          if (!me || a.targetIp !== me.ip) { lines.push(`${d.name} reads the ARP Request: "Who has ${ipStr(a.targetIp)}?" That's not ${d.name}'s IP, so it ignores it.`); return; }
          arp[ipStr(a.senderIp)] = a.senderMac;
          lines.push(`${d.name} reads the ARP Request: "Who has ${ipStr(a.targetIp)}?" That's me! It saves ${ipStr(a.senderIp)} → ${a.senderMac} in its ARP table, then answers with an ARP Reply sent straight back (unicast) to ${a.senderMac}.`);
          sendFrame(d, pi, { eth: { dst: a.senderMac, src: port.mac, type: 'ARP' }, arp: { op: 2, senderMac: port.mac, senderIp: me.ip, targetMac: a.senderMac, targetIp: a.senderIp } }, lines);
        } else {
          arp[ipStr(a.senderIp)] = a.senderMac;
          lines.push(`${d.name} gets the ARP Reply: ${ipStr(a.senderIp)} is at ${a.senderMac}. Saved in its ARP table.`);
          const key = d.id + '|' + a.senderIp;
          const waiting = sim.pending[key] || [];
          delete sim.pending[key]; delete sim.waitingArp[key];
          if (waiting.length) lines.push(`Now ${d.name} can send the packet that was waiting.`);
          waiting.forEach(w => sendFrame(d, w.pi, { eth: { dst: a.senderMac, src: d.ports[w.pi].mac, type: 'IPv4' }, ip: w.packet }, lines));
        }
        renderDevicePane();
        return;
      }
      const pk = f.ip;
      const mine = d.ports.some(p => { const i = ifaceInfo(p); return i && i.ip === pk.dst; });
      if (mine) { handleIcmp(d, pk, lines); return; }
      if (d.type !== 'router') { lines.push(`The packet is for ${ipStr(pk.dst)}, not ${d.name}. Computers don't forward packets, so it's dropped.`); return; }
      // router forwarding
      lines.push(`${d.name} opens the frame: the IP packet is for ${ipStr(pk.dst)}, which is not the router itself, so it forwards it.`);
      const fwd = clone(pk); fwd.ttl -= 1;
      if (fwd.ttl <= 0) {
        lines.push(`TTL drops to 0, so the packet is thrown away (this stops packets looping forever). ${d.name} sends an ICMP Time Exceeded back to ${ipStr(pk.src)}.`);
        if (pk.icmp && pk.icmp.type === 8) originate(d, { uid: uidSeq++, src: me ? me.ip : 0, dst: pk.src, ttl: 64, icmp: { type: 11, code: 0, id: pk.icmp.id, seq: pk.icmp.seq } }, lines);
        return;
      }
      const rt = lookup(d, pk.dst);
      if (!rt || rt.port == null) {
        lines.push(`${d.name} checks its routing table: no route to ${ipStr(pk.dst)}. It drops the packet and sends ICMP Destination Unreachable back to ${ipStr(pk.src)}.`);
        if (pk.icmp && pk.icmp.type === 8) originate(d, { uid: uidSeq++, src: me ? me.ip : 0, dst: pk.src, ttl: 64, icmp: { type: 3, code: 1, id: pk.icmp.id, seq: pk.icmp.seq } }, lines);
        else fail('no route');
        return;
      }
      lines.push(`Routing table: ${ipStr(rt.net)}/${rt.p} → ${rt.kind === 'connected' ? 'directly connected on ' + d.ports[rt.port].n : 'next hop ' + rt.via + ' via ' + d.ports[rt.port].n}. TTL goes ${pk.ttl} → ${fwd.ttl}. The IP addresses stay the same; the router builds a NEW Ethernet frame with new MAC addresses.`);
      ipSend(d, rt.port, fwd, rt.kind === 'connected' ? pk.dst : rt.viaInt, lines);
    }
    function handleIcmp(d, pk, lines) {
      const ic = pk.icmp;
      if (ic.type === 8) {
        lines.push(`The packet is for ${d.name}! It's an ICMP Echo Request, so ${d.name} answers with an Echo Reply back to ${ipStr(pk.src)}.`);
        originate(d, { uid: uidSeq++, src: pk.dst, dst: pk.src, ttl: 64, icmp: { type: 0, code: 0, id: ic.id, seq: ic.seq } }, lines);
      } else if (ic.type === 0) {
        if (d.id === sim.src) { lines.push(`${d.name} gets the Echo Reply from ${ipStr(pk.src)}. Ping successful!`); sim.result = 'success'; }
        else lines.push(`${d.name} got an Echo Reply it didn't ask for. Ignored.`);
      } else if (ic.type === 3) { lines.push(`${d.name} gets ICMP Destination Unreachable from ${ipStr(pk.src)}: a router had no route. Ping failed.`); fail('destination unreachable'); }
      else if (ic.type === 11) { lines.push(`${d.name} gets ICMP Time Exceeded from ${ipStr(pk.src)}: the TTL ran out. Ping failed.`); fail('TTL exceeded'); }
    }
    function finish() {
      if (!sim || sim.finished) return;
      sim.finished = true;
      const lines = [];
      if (sim.result === 'success') lines.push('Ping successful. ' + (sim.steps.length - 1) + ' frames crossed the wires. Ping again to see how the ARP and MAC tables make it shorter, or clear the tables (More...) to start fresh.');
      else {
        const waiting = Object.keys(sim.pending);
        if (waiting.length) { const ip = +waiting[0].split('|')[1]; lines.push(`Nobody answered the ARP Request for ${ipStr(ip)}. Either no device has that IP, or it's not on this network. Ping failed.`); }
        else if (sim.result && sim.result.startsWith('fail:')) lines.push('Ping failed: ' + sim.result.slice(5) + '.');
        else lines.push('The packet was lost along the way. Ping failed.');
      }
      record({ title: sim.result === 'success' ? 'Done: success' : 'Done: failed', lines, done: true, ok: sim.result === 'success' });
      renderStep(sim.steps.length - 1); renderLog();
      setStatus(sim.result === 'success' ? 'Ping successful.' : 'Ping failed. Check the last step for why.');
      playing = false; playBtn.textContent = 'Play ▸▸';
      if (hooks.onDone) hooks.onDone(sim.result === 'success');
    }
    function step() {
      if (animating) return Promise.resolve();
      if (!sim) { startPing(); return Promise.resolve(); }
      if (sim.finished) { setStatus('This ping is done. Press Ping to send another.'); playing = false; playBtn.textContent = 'Play ▸▸'; return Promise.resolve(); }
      if (!sim.queue.length) { finish(); return Promise.resolve(); }
      const ev = sim.queue.shift();
      if (++sim.frames > MAX_FRAMES) {
        record({ title: 'Stopped: broadcast storm', lines: ['Too many frames! Switches are connected in a loop, so broadcasts circle forever (a broadcast storm). Real switches use Spanning Tree Protocol (STP) to block loops. Remove one cable from the loop.'], done: true, ok: false });
        sim.finished = true; sim.queue = []; renderStep(sim.steps.length - 1); renderLog(); playing = false; playBtn.textContent = 'Play ▸▸'; setStatus('Stopped: switch loop.');
        return Promise.resolve();
      }
      const kind = ev.frame.arp ? (ev.frame.arp.op === 1 ? 'ARP Request' : 'ARP Reply') : icmpName(ev.frame.ip.icmp.type);
      animating = true;
      return animate(ev, kind).then(() => {
        animating = false;
        if (!sim) return;
        const lines = [`The frame travels ${portName(ev.from)} → ${portName(ev.to)}.`];
        deliver(ev, lines);
        record({ title: kind + ': ' + dev(ev.from.d).name + ' → ' + dev(ev.to.d).name, frame: clone(ev.frame), lines, link: ev.link });
        renderStep(sim.steps.length - 1); renderLog();
        setStatus('Step ' + (sim.steps.length - 1) + ' · ' + kind + ' · ' + sim.queue.length + ' frame(s) still waiting');
        if (!sim.queue.length) finish();
      });
    }
    async function togglePlay() {
      if (playing) { playing = false; playBtn.textContent = 'Play ▸▸'; return; }
      if (!sim || sim.finished) startPing();
      if (!sim) return;
      playing = true; playBtn.textContent = 'Pause ❚❚';
      while (playing && sim && !sim.finished) {
        await step();
        if (playing) await new Promise(r => setTimeout(r, Math.min(400, +speedSel.value / 3)));
      }
      playing = false; playBtn.textContent = 'Play ▸▸';
    }
    function icmpName(t) { return { 8: 'Echo Request', 0: 'Echo Reply', 3: 'Dest. Unreachable', 11: 'Time Exceeded' }[t] || 'ICMP'; }
    function animate(ev, kind) {
      const a = dev(ev.from.d), b = dev(ev.to.d);
      if (!a || !b || matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
      const cls = kind.startsWith('ARP') ? 'arp' : 'icmp';
      const dot = sv('g', { class: 'nm-pkt ' + cls }, sv('rect', { x: -15, y: -8, width: 30, height: 16, rx: 3 }), sv('text', { x: 0, y: 4 }, cls === 'arp' ? 'ARP' : 'IP'));
      gFx.append(dot);
      const lk = gLinks.querySelector(`.nm-link[data-id="${ev.link}"]`); if (lk) lk.classList.add('busy');
      const dur = +speedSel.value;
      return new Promise(res => {
        const t0 = performance.now();
        const tick = now => {
          const t = Math.min(1, (now - t0) / dur), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          dot.setAttribute('transform', `translate(${a.x + (b.x - a.x) * e},${a.y + (b.y - a.y) * e})`);
          if (t < 1 && dot.isConnected) requestAnimationFrame(tick);
          else { dot.remove(); if (lk) lk.classList.remove('busy'); res(); }
        };
        requestAnimationFrame(tick);
      });
    }

    /* ---------- packet inspector + log ---------- */
    const FIELD_HELP = {
      'Destination MAC': 'Who this frame is for on the local network. FF:FF:FF:FF:FF:FF = everyone (broadcast).',
      'Source MAC': 'The network card that sent this frame on this cable.',
      'Type': 'What is inside: 0x0806 = ARP, 0x0800 = IPv4.',
      'Operation': '1 = request (who has this IP?), 2 = reply (I do!).',
      'Sender MAC': 'MAC of the device asking or answering.', 'Sender IP': 'IP of the device asking or answering.',
      'Target MAC': 'Unknown in a request (all zeros). Filled in by the reply.', 'Target IP': 'The IP address being looked up.',
      'Version': 'IPv4.', 'TTL': 'Time To Live: every router subtracts 1. At 0 the packet is dropped.', 'Protocol': '1 = ICMP (used by ping).',
      'Source IP': 'Who originally sent the packet. Stays the same across routers.', 'Destination IP': 'The final destination. Stays the same across routers.',
      'ICMP type': '8 = Echo Request, 0 = Echo Reply, 3 = Destination Unreachable, 11 = Time Exceeded.', 'Code': 'Extra detail for the ICMP type.',
      'Identifier': 'Matches a reply to its request.', 'Sequence': 'Counts pings: 1, 2, 3...',
    };
    function layersOf(s) {
      const L = [];
      const f = s.frame;
      if (f) L.push({ name: 'Ethernet II', cls: 'eth', bytes: 14, fields: [['Destination MAC', f.eth.dst], ['Source MAC', f.eth.src], ['Type', f.eth.type === 'ARP' ? '0x0806 (ARP)' : '0x0800 (IPv4)']] });
      if (f && f.arp) L.push({ name: 'ARP', cls: 'arp', bytes: 28, fields: [['Operation', f.arp.op === 1 ? '1 (request)' : '2 (reply)'], ['Sender MAC', f.arp.senderMac], ['Sender IP', ipStr(f.arp.senderIp)], ['Target MAC', f.arp.targetMac], ['Target IP', ipStr(f.arp.targetIp)]] });
      const pk = f ? f.ip : s.packet;
      if (pk) {
        L.push({ name: 'IPv4', cls: 'ip', bytes: 20, fields: [['Version', '4'], ['TTL', String(pk.ttl)], ['Protocol', '1 (ICMP)'], ['Source IP', ipStr(pk.src)], ['Destination IP', ipStr(pk.dst)]] });
        L.push({ name: 'ICMP', cls: 'icmp', bytes: 8, fields: [['ICMP type', pk.icmp.type + ' (' + icmpName(pk.icmp.type) + ')'], ['Code', String(pk.icmp.code)], ['Identifier', '0x' + pk.icmp.id.toString(16).toUpperCase()], ['Sequence', String(pk.icmp.seq)]] });
        L.push({ name: 'Data', cls: 'data', bytes: 32, fields: [['Payload', '32 bytes: abcdefghijklmnopqrstuvwabcdefghi']] });
      }
      if (f && f.arp) L.push({ name: 'Padding', cls: 'data', bytes: 18, fields: [['Padding', '18 zero bytes (frames must be at least 64 bytes)']] });
      if (f) L.push({ name: 'FCS', cls: 'fcs', bytes: 4, fields: [['Checksum', 'CRC-32, lets the receiver spot damaged frames']] });
      return L;
    }
    let viewing = -1;
    function prevSameUid(i) {
      const s = sim.steps[i]; const uid = s.frame && s.frame.ip ? s.frame.ip.uid : null;
      for (let j = i - 1; j >= 0; j--) { const t = sim.steps[j]; if (uid != null && t.frame && t.frame.ip && t.frame.ip.uid === uid) return t; if (uid != null && t.packet && t.packet.uid === uid) return t; }
      return null;
    }
    function renderStep(i) {
      viewing = i;
      const P = tabPanes.Packet;
      if (!sim || !sim.steps[i]) { P.replaceChildren(el('p', { class: 'nm-empty' }, 'No packet yet. Pick a PC in "Ping from", type a destination IP and press Ping.')); return; }
      const s = sim.steps[i];
      const nav = el('div', { class: 'nm-nav' },
        el('button', { type: 'button', class: 'btn', disabled: i === 0, onclick: () => renderStep(i - 1) }, '◂'),
        el('b', {}, 'Step ' + i + ' of ' + (sim.steps.length - 1)),
        el('button', { type: 'button', class: 'btn', disabled: i >= sim.steps.length - 1, onclick: () => renderStep(i + 1) }, '▸'));
      const kids = [nav, el('h3', { class: s.done ? (s.ok ? 'ok' : 'bad') : '' }, s.title)];
      if (s.frame || s.packet) {
        const L = layersOf(s);
        const total = L.reduce((a, l) => a + l.bytes, 0);
        kids.push(el('p', { class: 'nm-cap' }, s.frame ? 'The frame on the wire (' + total + ' bytes):' : 'The IP packet (not on the wire yet, so no Ethernet frame):'));
        kids.push(el('div', { class: 'nm-frame' }, L.map(l => el('span', { class: 'seg ' + l.cls, style: 'flex-grow:' + l.bytes, title: l.name + ', ' + l.bytes + ' bytes' }, el('b', {}, l.name), el('small', {}, l.bytes + ' B')))));
        const prev = prevSameUid(i);
        const prevVals = prev ? Object.fromEntries(layersOf(prev).flatMap(l => l.fields.map(([k, v]) => [l.name + k, v]))) : null;
        for (const l of L) {
          if (l.cls === 'data' || l.cls === 'fcs') continue;
          kids.push(el('div', { class: 'nm-layer ' + l.cls }, el('div', { class: 'lh' }, l.name),
            el('dl', {}, l.fields.flatMap(([k, v]) => {
              const changed = prevVals && prevVals[l.name + k] != null && prevVals[l.name + k] !== v;
              return [el('dt', { title: FIELD_HELP[k] || '' }, k), el('dd', { class: changed ? 'changed' : '', title: changed ? 'Changed since the last hop (was ' + prevVals[l.name + k] + ')' : '' }, v)];
            }))));
        }
        if (prevVals) kids.push(el('p', { class: 'nm-cap' }, el('span', { class: 'chg-key' }, 'yellow'), ' = changed since this packet\'s previous hop. Hover a field name for what it means.'));
        else kids.push(el('p', { class: 'nm-cap' }, 'Hover a field name for what it means.'));
      }
      kids.push(el('div', { class: 'nm-explain' }, s.lines.map(t => el('p', {}, t))));
      P.replaceChildren(...kids);
      tabPanes.Log.querySelectorAll('li').forEach((li, k) => li.classList.toggle('cur', k === i));
    }
    function renderLog() {
      const P = tabPanes.Log;
      if (!sim) { P.replaceChildren(el('p', { class: 'nm-empty' }, 'Every step of a ping shows up here.')); return; }
      P.replaceChildren(el('ol', { class: 'nm-log', start: 0 }, sim.steps.map((s, i) => el('li', { class: (s.done ? (s.ok ? 'ok' : 'bad') : '') + (i === viewing ? ' cur' : ''), onclick: () => { renderStep(i); showTab('Packet'); } }, s.title))));
    }

    /* start */
    showTab('Device'); renderAll(); renderDevicePane(); renderStep(-1); renderLog();
    setStatus('Ready. Ping from a PC, then press Step.');
    status2.textContent = 'IPv4 · ARP · ICMP';
    return { refresh: () => renderAll() };
  }

  window.NetMan = { mount, _test: { ipInt, ipStr, prefixOf, sameNet } };
})();
