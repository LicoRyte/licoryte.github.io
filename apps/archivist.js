/* Archivist: a Pomodoro timer that pays in fun facts. Finish a focus session, unlock one entry for your archive.
   Progress (which facts you've collected, today's count, settings, a running timer) is saved in this browser.
   Facts live in apps/archivist-facts.js. Loaded by index.html the first time the window opens. */
(() => {
  'use strict';
  const KEY = 'lico-archivist';
  const MODES = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const CAT_ICON = { Animals: '🐾', Space: '🪐', Body: '🫀', History: '📜', Science: '🧪', Food: '🍙', Words: '🔤', Earth: '🌏', Tech: '💾', Odd: '🦄', Study: '📚' };

  function mount(root, hooks) {
    hooks = hooks || {};
    const FACTS = window.ARCHIVIST_FACTS || [];
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- saved state ---------- */
    let S = { got: [], total: 0, minutes: 0, day: today(), todayN: 0, cycle: 0, set: { focus: 25, short: 5, long: 15, every: 4 }, run: null };
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.got)) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}) }); } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    const rollDay = () => { if (S.day !== today()) { S.day = today(); S.todayN = 0; } };
    rollDay();

    /* ---------- timer state ---------- */
    let mode = (S.run && S.run.mode) || 'focus';
    let running = false, endAt = 0, left = 0, tickT = 0;
    const length = m => S.set[m] * 60000;
    left = (S.run && S.run.left) || length(mode);

    /* ---------- UI ---------- */
    const tabTimer = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', onclick: () => tab('timer') }, '⏱ Timer');
    const tabArch = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('archive') }, '🗃 Archive');
    const modeBtns = Object.keys(MODES).map(m => el('button', { type: 'button', class: 'ar-mode', 'data-m': m, onclick: () => { if (!running) setMode(m); } }, MODES[m]));
    // the screen: a big status line ("Gathering Knowledge...") with the time underneath in plain text
    const bigText = el('span', {}), dots = el('span', { class: 'ar-dots', 'aria-hidden': 'true' });
    const timeText = el('div', { class: 'ar-time' }, '25:00');
    const clock = el('div', { class: 'ar-screen sunken', 'aria-live': 'off' }, el('div', { class: 'ar-big' }, bigText, dots), timeText);
    let dotN = 0, dotT = 0;
    function headline() {
      if (!running) return left > 0 && left < length(mode) ? 'Paused' : mode === 'focus' ? 'Ready when you are' : 'Break time';
      return mode === 'focus' ? 'Gathering Knowledge' : 'Recharging Data Archivist';
    }
    function drawDots() { // ".", "..", "..." while running; the unused dots stay invisible so the text doesn't wobble
      const n = running ? dotN % 4 : 0;
      dots.replaceChildren(...[0, 1, 2].map(i => el('i', { class: i < n ? '' : 'off' }, '.')));
    }
    const barFill = el('div', { class: 'ar-fill' });
    const bar = el('div', { class: 'ar-bar sunken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, barFill);
    const startB = el('button', { type: 'button', class: 'btn ar-go', onclick: () => running ? pause() : start() }, 'Start');
    const resetB = el('button', { type: 'button', class: 'btn', title: 'Start this session over (a focus session stopped early unlocks nothing)', onclick: () => reset() }, 'Reset');
    const skipB = el('button', { type: 'button', class: 'btn', title: 'Skip to the next part', onclick: () => skip() }, 'Skip');
    const hint = el('div', { class: 'ar-hint' });
    const card = el('div', { class: 'ar-card', hidden: true });
    const sel = (k, opts) => { const s = el('select', { 'aria-label': k }, opts.map(v => el('option', { value: v, selected: S.set[k] === v || null }, String(v)))); s.addEventListener('change', () => { S.set[k] = +s.value; save(); if (!running && mode === k) { left = length(mode); persistRun(); } draw(); }); return s; };
    const settings = el('details', { class: 'ar-set' }, el('summary', {}, 'Settings'),
      el('div', { class: 'ar-set-row' },
        el('label', {}, 'Focus ', sel('focus', [1, 10, 15, 20, 25, 30, 40, 45, 50, 60]), ' min'),
        el('label', {}, 'Short break ', sel('short', [3, 5, 10]), ' min'),
        el('label', {}, 'Long break ', sel('long', [10, 15, 20, 30]), ' min'),
        el('label', {}, 'Long break every ', sel('every', [2, 3, 4, 5, 6]), ' focus sessions')));
    const timerPane = el('div', { class: 'ar-pane' },
      el('div', { class: 'ar-modes' }, modeBtns), clock, bar,
      el('div', { class: 'ar-btns' }, startB, resetB, skipB), hint, card, settings);

    const find = el('input', { type: 'search', class: 'ar-find', placeholder: 'Search your archive...', 'aria-label': 'Search your archive' });
    const catSel = el('select', { 'aria-label': 'Category' });
    const archHead = el('div', { class: 'ar-ahead' });
    const archList = el('div', { class: 'ar-list' });
    const archPane = el('div', { class: 'ar-pane', hidden: true }, archHead, el('div', { class: 'ar-tools' }, catSel, find), archList);

    const status = el('span', {}), status2 = el('span', {});
    root.replaceChildren(el('div', { class: 'ar-tabs', role: 'tablist' }, tabTimer, tabArch), el('div', { class: 'ar-body sunken' }, timerPane, archPane), el('div', { class: 'statusbar' }, status, status2));

    function tab(t) {
      tabTimer.setAttribute('aria-selected', String(t === 'timer')); tabArch.setAttribute('aria-selected', String(t === 'archive'));
      timerPane.hidden = t !== 'timer'; archPane.hidden = t !== 'archive';
      if (t === 'archive') drawArchive();
    }

    /* ---------- timer ---------- */
    const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    function remaining() { return running ? Math.max(0, endAt - Date.now()) : left; }
    function persistRun() { S.run = { mode, left: remaining(), endAt: running ? endAt : 0, running }; save(); }
    function setMode(m) { mode = m; left = length(m); hint.textContent = ''; draw(); persistRun(); }
    function start() {
      if (running) return;
      if (left <= 0) left = length(mode);
      running = true; endAt = Date.now() + left;
      persistRun(); loop(); draw();
    }
    function pause() { if (!running) return; left = remaining(); running = false; clearInterval(tickT); persistRun(); draw(); }
    function reset() { running = false; clearInterval(tickT); left = length(mode); persistRun(); draw(); }
    function skip() {
      running = false; clearInterval(tickT);
      if (mode === 'focus') toBreak(); else setMode('focus');
      hint.textContent = mode === 'focus' ? 'Break skipped. Back to work.' : 'Skipped. No entry for that one.';
      persistRun();
    }
    function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
    function loop() {
      clearInterval(tickT);
      tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250);
    }
    function finish(quiet) {
      clearInterval(tickT); running = false; left = 0;
      if (mode === 'focus') {
        rollDay();
        S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus;
        const fact = unlock();
        if (!quiet && hooks.tada) hooks.tada();
        if (hooks.show) hooks.show();
        showCard(fact, true);
        toBreak();
        hint.textContent = fact != null ? 'Session done. Take your ' + MODES[mode].toLowerCase() + '. Stand up, drink some water.' : 'Session done, and you\'ve collected every entry. Show-off.';
      } else {
        if (!quiet && hooks.ding) hooks.ding();
        if (hooks.show) hooks.show();
        setMode('focus');
        hint.textContent = 'Break\'s over. Press Start when you\'re ready.';
      }
      persistRun(); draw();
    }
    // pick a random fact you don't have yet. The very first one is always the Pomodoro one.
    function unlock() {
      const have = new Set(S.got.map(g => g.id));
      const locked = FACTS.map((_, i) => i).filter(i => !have.has(i));
      if (!locked.length) return null;
      const id = !S.got.length && locked.includes(0) ? 0 : locked[Math.floor(Math.random() * locked.length)];
      S.got.push({ id, at: Date.now() });
      return id;
    }
    function showCard(id, isNew) {
      if (id == null || !FACTS[id]) { card.replaceChildren(); card.hidden = true; return; }
      const [cat, text] = FACTS[id];
      card.hidden = false;
      card.className = 'ar-card' + (isNew ? ' new' : '');
      card.replaceChildren(
        el('div', { class: 'ar-card-h' }, el('span', {}, (isNew ? '★ New entry · ' : 'Last entry · ') + '#' + String(id + 1).padStart(3, '0')), el('span', { class: 'ar-cat' }, (CAT_ICON[cat] || '•') + ' ' + cat)),
        el('p', {}, text));
    }

    function drawClock() {
      const r = remaining(), total = length(mode), pct = Math.min(100, Math.max(0, 100 - (r / total) * 100));
      timeText.textContent = fmt(r) + (running ? ' left' : '');
      const hl = headline(); if (bigText.textContent !== hl) bigText.textContent = hl;
      if (running && !dotT) dotT = setInterval(() => { dotN++; drawDots(); }, 450);
      if (!running && dotT) { clearInterval(dotT); dotT = 0; dotN = 0; }
      drawDots();
      barFill.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', Math.round(pct));
      if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? 'Focus' : 'Break') : 'Archivist');
    }
    function draw() {
      drawClock();
      root.dataset.mode = mode;
      modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
      startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : 'Start');
      if (!hint.textContent) hint.textContent = mode === 'focus' ? 'Finish a focus session to unlock an entry.' : 'Break time.';
      const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
      status.textContent = 'Today: ' + S.todayN + ' session' + (S.todayN === 1 ? '' : 's') + ' · round ' + round + ' of ' + S.set.every;
      status2.textContent = 'Archive ' + S.got.length + ' / ' + FACTS.length;
      tabArch.textContent = '🗃 Archive (' + S.got.length + ')';
    }

    /* ---------- archive ---------- */
    let catsBuilt = false;
    function drawArchive() {
      const cats = [...new Set(FACTS.map(f => f[0]))].sort();
      if (!catsBuilt) { catSel.replaceChildren(el('option', { value: '' }, 'All categories'), ...cats.map(c => el('option', { value: c }, (CAT_ICON[c] || '') + ' ' + c))); catsBuilt = true; }
      const q = find.value.trim().toLowerCase(), cat = catSel.value;
      const pct = FACTS.length ? Math.round(S.got.length / FACTS.length * 100) : 0;
      archHead.replaceChildren(
        el('div', {}, el('b', {}, S.got.length + ' / ' + FACTS.length + ' entries collected'), ' (' + pct + '%)'),
        el('div', { class: 'ar-bar thin sunken' }, el('div', { class: 'ar-fill', style: 'width:' + pct + '%' })),
        el('div', { class: 'ar-muted' }, S.total + ' focus session' + (S.total === 1 ? '' : 's') + ' all-time · ' + Math.round(S.minutes / 60 * 10) / 10 + ' hours focused'));
      const list = S.got.slice().reverse().filter(g => FACTS[g.id] && (!cat || FACTS[g.id][0] === cat) && (!q || FACTS[g.id][1].toLowerCase().includes(q)));
      if (!S.got.length) { archList.replaceChildren(el('p', { class: 'ar-empty' }, 'Nothing here yet. Finish a focus session on the Timer tab to unlock your first entry.')); return; }
      if (!list.length) { archList.replaceChildren(el('p', { class: 'ar-empty' }, 'No entries match.')); return; }
      archList.replaceChildren(...list.map(g => {
        const [c, text] = FACTS[g.id], d = new Date(g.at);
        return el('div', { class: 'ar-entry' },
          el('div', { class: 'ar-card-h' }, el('span', {}, '#' + String(g.id + 1).padStart(3, '0')), el('span', { class: 'ar-cat' }, (CAT_ICON[c] || '•') + ' ' + c + ' · ' + d.toLocaleDateString())),
          el('p', {}, text));
      }));
      const lockedN = FACTS.length - S.got.length;
      if (lockedN && !q && !cat) archList.append(el('p', { class: 'ar-empty' }, '🔒 ' + lockedN + ' more entr' + (lockedN === 1 ? 'y' : 'ies') + ' still locked.'));
    }
    find.addEventListener('input', drawArchive);
    catSel.addEventListener('change', drawArchive);

    /* ---------- resume a timer that was running when the page closed ---------- */
    if (S.run && S.run.running) {
      if (S.run.endAt > Date.now()) { running = true; endAt = S.run.endAt; loop(); }
      else { const was = S.run.mode; mode = was; finish(true); hint.textContent = was === 'focus' ? 'A focus session finished while you were away. Entry unlocked.' : 'Your break finished while you were away.'; }
    }
    if (S.got.length && card.hidden) showCard(S.got[S.got.length - 1].id, false);
    draw();
    // keep the clock honest when the tab comes back from the background
    document.addEventListener('visibilitychange', () => { if (!document.hidden && running && remaining() <= 0) finish(); });
    return { running: () => running };
  }
  window.Archivist = { mount };
})();
