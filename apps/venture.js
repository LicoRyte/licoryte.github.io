/* Venture: a little pixel planetarium. The Sun and 8 planets sit where they really are today
   (computed from NASA JPL's approximate orbital elements), then keep orbiting. Click one to lock on.
   Loaded by index.html the first time the Venture window opens. Distances and sizes are NOT to scale. */
(() => {
  'use strict';
  const DEG = Math.PI / 180;
  const AU_KM = 149597870.7;
  const GM_SUN = 1.32712440018e11; // km^3/s^2

  /* Orbital elements, J2000, valid 1800-2050 (JPL "Approximate Positions of the Planets", Table 1).
     a (AU), e, I (deg), L mean longitude (deg), w long. of perihelion (deg), O long. of ascending node (deg); second number = change per century */
  const EL = {
    mercury: [[0.38709927, 0.00000037], [0.20563593, 0.00001906], [7.00497902, -0.00594749], [252.25032350, 149472.67411175], [77.45779628, 0.16047689], [48.33076593, -0.12534081]],
    venus:   [[0.72333566, 0.00000390], [0.00677672, -0.00004107], [3.39467605, -0.00078890], [181.97909950, 58517.81538729], [131.60246718, 0.00268329], [76.67984255, -0.27769418]],
    earth:   [[1.00000261, 0.00000562], [0.01671123, -0.00004392], [-0.00001531, -0.01294668], [100.46457166, 35999.37244981], [102.93768193, 0.32327364], [0, 0]],
    mars:    [[1.52371034, 0.00001847], [0.09339410, 0.00007882], [1.84969142, -0.00813131], [-4.55343205, 19140.30268499], [-23.94362959, 0.44441088], [49.55953891, -0.29257343]],
    jupiter: [[5.20288700, -0.00011607], [0.04838624, -0.00013253], [1.30439695, -0.00183714], [34.39644051, 3034.74612775], [14.72847983, 0.21252668], [100.47390909, 0.20469106]],
    saturn:  [[9.53667594, -0.00125060], [0.05386179, -0.00050991], [2.48599187, 0.00193609], [49.95424423, 1222.49362201], [92.59887831, -0.41897216], [113.66242448, -0.28867794]],
    uranus:  [[19.18916464, -0.00196176], [0.04725744, -0.00004397], [0.77263783, -0.00242939], [313.23810451, 428.48202785], [170.95427630, 0.40805281], [74.01692503, 0.04240589]],
    neptune: [[30.06992276, 0.00026291], [0.00859048, 0.00005105], [1.77004347, 0.00035372], [-55.12002969, 218.45945325], [44.96476227, -0.32241464], [131.78422574, -0.00508664]],
  };
  function helio(id, jd) {
    const T = (jd - 2451545.0) / 36525;
    const v = EL[id].map(([x0, dx]) => x0 + dx * T);
    const [a, e, I, L, wbar, O] = v;
    const w = wbar - O;
    let M = ((L - wbar) % 360 + 540) % 360 - 180;
    M *= DEG;
    let E = M + e * Math.sin(M);
    for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(w * DEG), sw = Math.sin(w * DEG), cO = Math.cos(O * DEG), sO = Math.sin(O * DEG), cI = Math.cos(I * DEG), sI = Math.sin(I * DEG);
    const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
    const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
    const z = (sw * sI) * xp + (cw * sI) * yp;
    const r = Math.hypot(x, y, z);
    const speed = Math.sqrt(GM_SUN * (2 / (r * AU_KM) - 1 / (a * AU_KM))); // vis-viva, km/s
    return { x, y, z, r, a, e, speed };
  }
  const jdOf = ms => ms / 86400000 + 2440587.5;

  /* Facts: NASA planetary fact sheets. Moon counts as of 2026 (they keep growing). */
  const BODIES = [
    { id: 'sun', name: 'Sun', kind: 'Star (yellow dwarf, G2V)', size: 11,
      stats: [['Diameter', '1,392,700 km (109 Earths)'], ['Mass', '1.989 × 10³⁰ kg (333,000 Earths)'], ['Surface gravity', '274 m/s² (28× Earth)'], ['Spins once', 'about 25 days (equator)'], ['Surface', 'about 5,500 °C'], ['Core', 'about 15 million °C'], ['Age', 'about 4.6 billion years']],
      moons: 'Not a planet, but 8 planets, 5 known dwarf planets and millions of asteroids and comets orbit it.',
      facts: ['The Sun holds about 99.8% of all the mass in the solar system.', 'Sunlight takes about 8 minutes 20 seconds to reach Earth. You always see the Sun as it was 8 minutes ago.', 'About 1.3 million Earths could fit inside the Sun.', 'The Sun turns about 600 million tonnes of hydrogen into helium every second.'] },
    { id: 'mercury', name: 'Mercury', kind: 'Terrestrial planet', size: 2.2,
      stats: [['Diameter', '4,879 km (0.38 Earths)'], ['Mass', '0.055 Earths'], ['Gravity', '3.7 m/s² (0.38 g)'], ['Day (sunrise to sunrise)', '176 Earth days'], ['Year', '88 Earth days'], ['Temperature', '−173 °C to 427 °C']],
      moons: 'No moons.',
      facts: ['One day on Mercury (sunrise to sunrise) lasts two of its years.', 'It\'s the smallest planet, only a bit bigger than our Moon.', 'Even this close to the Sun, there\'s water ice hiding in craters at its poles that never see sunlight.', 'With almost no air to hold heat, nights drop to −173 °C.'] },
    { id: 'venus', name: 'Venus', kind: 'Terrestrial planet', size: 3.2,
      stats: [['Diameter', '12,104 km (0.95 Earths)'], ['Mass', '0.815 Earths'], ['Gravity', '8.9 m/s² (0.9 g)'], ['Spins once', '243 Earth days (backwards)'], ['Year', '225 Earth days'], ['Temperature', 'about 464 °C everywhere']],
      moons: 'No moons.',
      facts: ['Venus is the hottest planet, hotter than Mercury, because its thick CO₂ air traps heat.', 'It spins backwards, so the Sun rises in the west there.', 'It spins so slowly that one rotation takes longer than its year.', 'The air pressure on the surface is about 92 times Earth\'s, like being 900 m under the sea.'] },
    { id: 'earth', name: 'Earth', kind: 'Terrestrial planet', size: 3.3,
      stats: [['Diameter', '12,756 km'], ['Mass', '5.97 × 10²⁴ kg'], ['Gravity', '9.8 m/s² (1 g)'], ['Day', '24 hours'], ['Year', '365.25 days'], ['Temperature', 'about 15 °C average']],
      moons: '1 moon: the Moon.',
      facts: ['The only place we know of with life. So far.', 'Earth isn\'t a perfect ball: it bulges a little at the equator.', 'The Moon drifts about 3.8 cm farther from Earth every year.', 'About 71% of the surface is covered by water.'] },
    { id: 'mars', name: 'Mars', kind: 'Terrestrial planet', size: 2.6,
      stats: [['Diameter', '6,792 km (0.53 Earths)'], ['Mass', '0.107 Earths'], ['Gravity', '3.7 m/s² (0.38 g)'], ['Day', '24 h 37 min'], ['Year', '687 Earth days'], ['Temperature', 'about −65 °C average']],
      moons: '2 moons: Phobos and Deimos.',
      facts: ['Mars is red because its dust is full of iron oxide: basically rust.', 'Olympus Mons is the tallest volcano in the solar system, about 22 km high (2.5× Everest).', 'Sunsets on Mars look blue.', 'Phobos is slowly spiraling in and will break apart in about 50 million years.'] },
    { id: 'jupiter', name: 'Jupiter', kind: 'Gas giant', size: 7.5,
      stats: [['Diameter', '142,984 km (11 Earths)'], ['Mass', '318 Earths'], ['Gravity', '23.1 m/s² (2.4 g)'], ['Day', '9 h 56 min'], ['Year', '11.9 Earth years'], ['Temperature', 'about −110 °C (cloud tops)']],
      moons: '101 known moons (2026 count, still growing). Famous: Io, Europa, Ganymede, Callisto.',
      facts: ['Jupiter has the shortest day of any planet: under 10 hours.', 'The Great Red Spot is a storm wider than Earth that has raged for centuries.', 'Ganymede, its biggest moon, is larger than the planet Mercury.', 'More than 1,300 Earths could fit inside Jupiter.'] },
    { id: 'saturn', name: 'Saturn', kind: 'Gas giant', size: 6.4,
      stats: [['Diameter', '120,536 km (9.4 Earths)'], ['Mass', '95 Earths'], ['Gravity', '9.0 m/s² (0.9 g)'], ['Day', '10 h 33 min'], ['Year', '29.4 Earth years'], ['Temperature', 'about −140 °C (cloud tops)']],
      moons: '285 known moons (2026 count, the most of any planet). Famous: Titan, Enceladus, Mimas.',
      facts: ['Saturn is less dense than water. In a big enough bathtub, it would float.', 'Its rings are mostly chunks of ice, and in many places only about 10 m thick.', 'Titan has a thick atmosphere and lakes of liquid methane.', 'Enceladus shoots jets of water ice into space from an ocean under its crust.'] },
    { id: 'uranus', name: 'Uranus', kind: 'Ice giant', size: 4.6,
      stats: [['Diameter', '51,118 km (4 Earths)'], ['Mass', '14.5 Earths'], ['Gravity', '8.7 m/s² (0.9 g)'], ['Day', '17 h 14 min (backwards)'], ['Year', '84 Earth years'], ['Temperature', 'about −195 °C']],
      moons: 'About 29 known moons (2026). Famous: Titania, Oberon, Miranda, Ariel, Umbriel.',
      facts: ['Uranus is tipped on its side (98°), so it rolls around the Sun like a ball.', 'Each pole gets about 42 years of sunlight, then 42 years of darkness.', 'It was the first planet found with a telescope, by William Herschel in 1781.', 'Its moons are named after characters from Shakespeare and Alexander Pope.'] },
    { id: 'neptune', name: 'Neptune', kind: 'Ice giant', size: 4.4,
      stats: [['Diameter', '49,528 km (3.9 Earths)'], ['Mass', '17 Earths'], ['Gravity', '11.0 m/s² (1.1 g)'], ['Day', '16 h 6 min'], ['Year', '165 Earth years'], ['Temperature', 'about −200 °C']],
      moons: '16 known moons. Famous: Triton, Proteus, Nereid.',
      facts: ['Neptune has the fastest winds in the solar system, around 2,000 km/h.', 'It was found with math first: its position was predicted before anyone saw it in 1846.', 'Triton orbits backwards and is probably a captured object from the Kuiper Belt.', 'Neptune only finished its first full orbit since discovery in 2011.'] },
  ];
  const byId = Object.fromEntries(BODIES.map(b => [b.id, b]));

  /* ---------- pixel planet painter ---------- */
  const STYLE = {
    sun: { base: '#FFD23F' }, mercury: { base: '#A39E98', dark: '#58534F' }, venus: { base: '#E8CF8A', dark: '#7E6A3A' },
    earth: { base: '#2E6FD8', dark: '#122A5C', land: '#3FA34D', landDark: '#1B4A22' }, mars: { base: '#C8551E', dark: '#5E2207' },
    jupiter: { bands: ['#E9D7B5', '#C99B6B', '#E0C49A', '#A86B45', '#EBDDBE', '#C99B6B', '#E0C49A'], dark: '#5A3E28', spot: '#C0563A' },
    saturn: { bands: ['#EBD9A8', '#D9BD82', '#E3C98F', '#CDAE6E', '#EBD9A8'], dark: '#6E5A36', ring: '#CBB07A', ringDark: '#7E6A44' },
    uranus: { base: '#9FE3E8', dark: '#3F7880' }, neptune: { base: '#3B5FE0', dark: '#16245E', spot: '#7F9CFF' },
  };
  function shade(hex, f) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
  // draws one body with its center at (cx, cy), radius r (canvas pixels), lit from direction (lx, ly)
  function paintBody(x, id, cx, cy, r, lx, ly, spin) {
    const S = STYLE[id];
    const R = Math.max(1, r), ir = Math.ceil(R);
    if (id === 'saturn') ring(x, S, cx, cy, R, true);
    for (let dy = -ir; dy <= ir; dy++) for (let dx = -ir; dx <= ir; dx++) {
      const d2 = (dx + .5) ** 2 + (dy + .5) ** 2;
      if (d2 > R * R) continue;
      let col;
      if (id === 'sun') { const t = Math.sqrt(d2) / R; col = t < .55 ? '#FFF4B0' : t < .85 ? '#FFD23F' : '#FF9A1F'; }
      else {
        const nx = (dx + .5) / R, ny = (dy + .5) / R;
        const lit = nx * lx + ny * ly;
        let base = S.base, dark = S.dark;
        if (S.bands) { const bi = Math.floor(((ny + 1) / 2) * S.bands.length * 0.999); base = S.bands[Math.max(0, Math.min(S.bands.length - 1, bi))]; }
        if (id === 'jupiter' && R >= 4 && Math.abs(ny - .3) < .14 && Math.abs(nx - .25 + spin * 0) < .22) base = S.spot;
        if (id === 'earth' && R >= 2.5) { const u = Math.floor((nx + spin) * 5), v = Math.floor(ny * 4); if (((u * 7 + v * 13) & 7) < 3) { base = S.land; dark = S.landDark; } if (Math.abs(ny) > .82) base = '#F2F6FF'; }
        if (id === 'neptune' && R >= 4 && Math.abs(ny + .2) < .12 && Math.abs(nx + .2) < .2) base = S.spot;
        if (id === 'mars' && R >= 4 && ny < -.75) base = '#F2EDE6';
        const edge = Math.sqrt(d2) / R > .85 ? .88 : 1;
        if (lit > .18) col = shade(base, edge);
        else if (lit > -.18) col = ((dx + dy) & 1) ? shade(base, .8 * edge) : (dark || shade(base, .45)); // dithered terminator
        else col = dark || shade(base, .4);
      }
      x.fillStyle = col; x.fillRect(Math.round(cx + dx), Math.round(cy + dy), 1, 1);
    }
    if (id === 'saturn') ring(x, S, cx, cy, R, false);
    if (id === 'uranus' && R >= 3) { x.fillStyle = 'rgba(200,240,245,.55)'; for (let t = -R * 1.5; t <= R * 1.5; t++) { if (Math.abs(t) < R * .9) continue; x.fillRect(Math.round(cx + t * .18), Math.round(cy + t), 1, 1); } }
  }
  function ring(x, S, cx, cy, R, back) {
    const rx = R * 2.2, ry = R * .62;
    for (let a = 0; a < 360; a += 2) {
      const s = Math.sin(a * DEG), c = Math.cos(a * DEG);
      if (back !== (s < 0)) continue;
      for (const f of [1, .82]) { x.fillStyle = f === 1 ? S.ring : S.ringDark; x.fillRect(Math.round(cx + c * rx * f), Math.round(cy + s * ry * f), 1, 1); }
    }
  }

  /* ---------- the app ---------- */
  function mount(root) {
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const win = root.closest('.app');
    const cv = el('canvas', { class: 'vt-canvas', 'aria-label': 'Solar system. Click a planet to lock on.', role: 'img' });
    const cx = cv.getContext('2d');
    const lock = el('div', { class: 'vt-lock', hidden: true }, el('i', { class: 'tl' }), el('i', { class: 'tr' }), el('i', { class: 'bl' }), el('i', { class: 'br' }));
    const lockLabel = el('div', { class: 'vt-label', hidden: true });
    const hoverLabel = el('div', { class: 'vt-hover', hidden: true });
    const note = el('div', { class: 'vt-note' }, 'Sizes and distances not to scale');
    const stage = el('div', { class: 'vt-stage sunken' }, cv, lock, lockLabel, hoverLabel, note);
    const panel = el('aside', { class: 'vt-panel' });
    const dateOut = el('b', { class: 'vt-date' });
    const SPEEDS = [['Pause', 0], ['1 day/s', 1], ['1 week/s', 7], ['1 month/s', 30.44], ['1 year/s', 365.25]];
    let speed = 1;
    const speedBtns = SPEEDS.map(([lab, v]) => el('button', { type: 'button', class: 'btn', 'aria-pressed': String(v === speed), onclick: () => { speed = v; speedBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SPEEDS[i][1] === v))); } }, lab));
    const zoomOut = el('button', { type: 'button', class: 'btn', title: 'Zoom out', 'aria-label': 'Zoom out', onclick: () => setZoom(zoom / 1.4) }, '−');
    const zoomIn = el('button', { type: 'button', class: 'btn', title: 'Zoom in', 'aria-label': 'Zoom in', onclick: () => setZoom(zoom * 1.4) }, '+');
    const tools = el('div', { class: 'vt-tools' },
      el('span', { class: 'vt-group' }, speedBtns),
      el('span', { class: 'vt-group' }, el('button', { type: 'button', class: 'btn', onclick: () => { simMs = Date.now(); } }, 'Today'), dateOut),
      el('span', { class: 'vt-group' }, 'Zoom', zoomOut, zoomIn));
    const status = el('span', {}, 'Click a planet to lock on.'), status2 = el('span', {}, 'Positions: NASA JPL orbital elements');
    root.replaceChildren(tools, el('div', { class: 'vt-main' }, stage, panel), el('div', { class: 'statusbar' }, status, status2));

    let simMs = Date.now(), zoom = 1, selected = null, hovered = null, factIdx = 0, scale = 2;
    let W = 300, H = 200;
    const stars = [];
    function resize() {
      const r = stage.getBoundingClientRect();
      scale = r.width < 500 ? 2 : 2;
      W = Math.max(60, Math.floor(r.width / scale)); H = Math.max(60, Math.floor(r.height / scale));
      cv.width = W; cv.height = H;
      cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
      stars.length = 0;
      let seed = 7;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < W * H / 140; i++) stars.push([Math.floor(rnd() * W), Math.floor(rnd() * H), rnd(), rnd() * 6.28]);
      draw();
    }
    function setZoom(z) { zoom = Math.max(.6, Math.min(8, z)); draw(); }
    stage.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });

    // screen layout: orbits spaced out like a textbook diagram (real directions, real orbit shapes, distances squeezed)
    const AU_STEPS = [0, 0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.19, 30.07, 60];
    const DISP_STEPS = [0, 1.7, 2.55, 3.35, 4.15, 5.85, 6.95, 8.0, 9.0, 12];
    function squeeze(au) {
      for (let i = 1; i < AU_STEPS.length; i++) if (au <= AU_STEPS[i]) return DISP_STEPS[i - 1] + (au - AU_STEPS[i - 1]) / (AU_STEPS[i] - AU_STEPS[i - 1]) * (DISP_STEPS[i] - DISP_STEPS[i - 1]);
      return DISP_STEPS[DISP_STEPS.length - 1];
    }
    const center = () => [Math.floor(W / 2), Math.floor(H / 2)];
    const unit = () => Math.max(6, (Math.min(W, H) / 2 - 8) / 9.4) * zoom;
    function toScreen(p) {
      const [c0, c1] = center(), k = unit();
      const rr = Math.hypot(p.x, p.y) || 1, s = k * squeeze(rr) / rr;
      return [c0 + p.x * s, c1 - p.y * s];
    }
    const belt = [];
    { let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 260; i++) belt.push([2.15 + rnd() * 1.15, rnd() * 360]); }
    const orbitPaths = {};
    for (const id of Object.keys(EL)) { // sample each orbit once (elements barely change)
      const jd0 = jdOf(Date.now()), out = [];
      const per = 365.25 * Math.pow(EL[id][0][0], 1.5);
      for (let i = 0; i < 420; i++) out.push(helio(id, jd0 + per * i / 420));
      orbitPaths[id] = out;
    }
    const pos = {};
    function compute() {
      const jd = jdOf(simMs);
      for (const id of Object.keys(EL)) pos[id] = helio(id, jd);
    }
    function draw(t = performance.now()) {
      compute();
      cx.fillStyle = '#05060C'; cx.fillRect(0, 0, W, H);
      for (const [sx, sy, b, ph] of stars) { const tw = b > .85 ? .55 + .45 * Math.sin(t / 700 + ph) : 1; cx.fillStyle = `rgba(255,255,255,${(.25 + b * .6) * tw})`; cx.fillRect(sx, sy, 1, 1); }
      const [c0, c1] = center(), k = unit();
      // orbits
      for (const id of Object.keys(EL)) {
        const sel = selected === id;
        cx.fillStyle = sel ? 'rgba(130,170,255,.85)' : 'rgba(95,115,165,.5)';
        let px = null, py = null;
        orbitPaths[id].forEach((p, i) => { const [x, y] = toScreen(p); const X = Math.round(x), Y = Math.round(y); if (X === px && Y === py) return; px = X; py = Y; if (!sel && i % 3 === 2) return; cx.fillRect(X, Y, 1, 1); });
      }
      // asteroid belt (each rock moves at its own Kepler speed)
      const days = (simMs - Date.UTC(2000, 0, 1, 12)) / 86400000;
      cx.fillStyle = 'rgba(170,150,130,.55)';
      for (const [a, a0] of belt) { const ang = (a0 + days * 360 / (365.25 * Math.pow(a, 1.5))) * DEG; const [x, y] = toScreen({ x: a * Math.cos(ang), y: a * Math.sin(ang) }); cx.fillRect(Math.round(x), Math.round(y), 1, 1); }
      // sun glow + sun
      const sunR = Math.max(4, Math.min(12, unit() * .62));
      const g = cx.createRadialGradient(c0, c1, sunR * .6, c0, c1, sunR * 3);
      g.addColorStop(0, 'rgba(255,200,80,.35)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      cx.fillStyle = g; cx.fillRect(c0 - sunR * 3, c1 - sunR * 3, sunR * 6, sunR * 6);
      paintBody(cx, 'sun', c0, c1, sunR, 0, 0, 0);
      screenPos.sun = [c0, c1, sunR];
      // planets
      const spin = (simMs / 86400000) % 1;
      for (const b of BODIES) {
        if (b.id === 'sun') continue;
        const p = pos[b.id]; const [x, y] = toScreen(p);
        const r = b.size * Math.min(1.6, .8 + zoom * .2);
        const len = Math.hypot(x - c0, y - c1) || 1;
        paintBody(cx, b.id, x, y, r, (c0 - x) / len, (c1 - y) / len, b.id === 'earth' ? spin : 0);
        screenPos[b.id] = [x, y, r];
        if (b.id === 'earth') { // the Moon: 27.3-day orbit
          const ma = (simMs / 86400000 / 27.32) * 2 * Math.PI, md = r + 4;
          cx.fillStyle = '#D8D8D8'; cx.fillRect(Math.round(x + Math.cos(ma) * md), Math.round(y - Math.sin(ma) * md), 1, 1);
        }
      }
      dateOut.textContent = new Date(simMs).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
      placeLock();
    }
    const screenPos = {};

    /* lock-on brackets + label (HTML on top of the pixel canvas, so text stays sharp) */
    function placeLock() {
      if (!selected || !screenPos[selected]) { lock.hidden = lockLabel.hidden = true; return; }
      const [x, y, r] = screenPos[selected];
      const half = (r + 5) * scale + 6;
      lock.hidden = false;
      lock.style.cssText = `left:${x * scale - half}px;top:${y * scale - half}px;width:${half * 2}px;height:${half * 2}px`;
      const b = byId[selected];
      const p = pos[selected];
      lockLabel.hidden = false;
      lockLabel.replaceChildren(el('b', {}, b.name), el('span', {}, b.id === 'sun' ? 'center of the solar system' : p.r.toFixed(2) + ' AU from Sun'), el('span', {}, b.id === 'sun' ? 'you are here-ish' : p.speed.toFixed(1) + ' km/s'));
      const sw = stage.clientWidth, lw = lockLabel.offsetWidth || 150, lh = lockLabel.offsetHeight || 46;
      let lx = x * scale + half + 8, ly = y * scale - half;
      if (lx + lw > sw - 4) { lx = x * scale + half - lw; ly = y * scale - half - lh - 6; if (ly < 4) ly = y * scale + half + 6; } // no room on the right: go above (or below)
      lockLabel.style.left = Math.max(4, Math.min(sw - lw - 4, lx)) + 'px';
      lockLabel.style.top = Math.max(4, ly) + 'px';
    }
    function hitTest(e) {
      const r = cv.getBoundingClientRect();
      const mx = (e.clientX - r.left) / scale, my = (e.clientY - r.top) / scale;
      let best = null, bd = 1e9;
      for (const [id, [x, y, rad]] of Object.entries(screenPos)) { const d = Math.hypot(mx - x, my - y); if (d < rad + 5 && d < bd) { best = id; bd = d; } }
      return best;
    }
    cv.addEventListener('pointermove', e => {
      const id = hitTest(e);
      cv.style.cursor = id ? 'var(--cur-hand)' : '';
      if (id && id !== selected) {
        const r = stage.getBoundingClientRect();
        hoverLabel.hidden = false; hoverLabel.textContent = byId[id].name;
        hoverLabel.style.left = (e.clientX - r.left + 12) + 'px'; hoverLabel.style.top = (e.clientY - r.top - 18) + 'px';
      } else hoverLabel.hidden = true;
    });
    cv.addEventListener('pointerleave', () => { hoverLabel.hidden = true; });
    cv.addEventListener('click', e => { select(hitTest(e)); });
    function select(id) {
      selected = id || null; factIdx = 0; hoverLabel.hidden = true;
      if (selected) { lock.classList.remove('snap'); void lock.offsetWidth; lock.classList.add('snap'); status.textContent = 'Locked on: ' + byId[selected].name; }
      else status.textContent = 'Click a planet to lock on.';
      renderPanel(); draw();
    }

    /* side panel */
    function portrait(id) {
      const c = el('canvas', { width: 48, height: 48, class: 'vt-portrait', 'aria-hidden': 'true' }); const x = c.getContext('2d');
      x.fillStyle = '#05060C'; x.fillRect(0, 0, 48, 48);
      for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect((i * 37) % 48, (i * 23 + 5) % 48, 1, 1); }
      paintBody(x, id, 24, 24, id === 'saturn' ? 9 : id === 'sun' ? 15 : 14, -.8, -.6, .3);
      return c;
    }
    let liveBox = null;
    function liveRows() {
      if (!selected) return [];
      if (selected === 'sun') { const e = pos.earth; return [['From Earth', (e.r).toFixed(3) + ' AU (' + Math.round(e.r * AU_KM / 1e6).toLocaleString() + ' million km)'], ['Light to Earth', fmtLight(e.r)]]; }
      const p = pos[selected], e = pos.earth;
      const rows = [['From the Sun', p.r.toFixed(3) + ' AU (' + Math.round(p.r * AU_KM / 1e6).toLocaleString() + ' million km)'], ['Orbit speed', p.speed.toFixed(1) + ' km/s'], ['Sunlight takes', fmtLight(p.r)]];
      if (selected !== 'earth') { const d = Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z); rows.splice(1, 0, ['From Earth', d.toFixed(3) + ' AU (' + Math.round(d * AU_KM / 1e6).toLocaleString() + ' million km)']); }
      return rows;
    }
    function fmtLight(au) { const s = au * AU_KM / 299792.458; const m = Math.floor(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min ' + Math.round(s % 60) + ' s'; }
    const dl = rows => el('dl', { class: 'vt-dl' }, rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    function renderPanel() {
      if (!selected) {
        const e = pos.earth || helio('earth', jdOf(simMs));
        panel.replaceChildren(el('h3', {}, 'The Solar System'),
          el('p', {}, 'The Sun, 8 planets, and a lot of empty space. Planets are where they really are on the date shown at the top, then keep orbiting.'),
          el('p', {}, el('b', {}, 'Click a planet'), ' (or the Sun) to lock on.'),
          el('ul', { class: 'vt-list' }, BODIES.map(b => el('li', {}, el('button', { type: 'button', class: 'linkish', onclick: () => select(b.id) }, b.name), ' ', el('small', {}, b.kind)))),
          el('p', { class: 'vt-small' }, 'Earth is ' + e.r.toFixed(3) + ' AU from the Sun today. 1 AU = the average Earth-Sun distance, about 150 million km.'));
        liveBox = null; return;
      }
      const b = byId[selected];
      liveBox = el('div', {}, dl(liveRows()));
      const factP = el('p', { class: 'vt-fact' }, b.facts[factIdx % b.facts.length]);
      panel.replaceChildren(
        el('div', { class: 'vt-head' }, portrait(b.id), el('div', {}, el('h3', {}, b.name), el('small', {}, b.kind))),
        el('h4', {}, 'Right now'), liveBox,
        el('h4', {}, 'Stats'), dl(b.stats),
        el('h4', {}, 'Moons'), el('p', {}, b.moons),
        el('h4', {}, 'Fun fact'), factP,
        el('p', {}, el('button', { type: 'button', class: 'btn', onclick: () => { factIdx++; factP.textContent = b.facts[factIdx % b.facts.length]; } }, 'Another fact ▸'), ' ',
          el('button', { type: 'button', class: 'btn', onclick: () => select(null) }, 'Unlock')));
    }
    let lastLive = 0;

    /* animation loop: only runs while the window is open and the tab is visible, ~30 fps */
    let raf = 0, last = 0;
    function frame(t) {
      raf = 0;
      if (!isShown()) return;
      const dt = Math.min(100, t - (last || t)); last = t;
      simMs += dt / 1000 * speed * 86400000;
      draw(t);
      if (liveBox && t - lastLive > 300) { lastLive = t; liveBox.replaceChildren(dl(liveRows())); }
      setTimeout(() => { if (!raf) raf = requestAnimationFrame(frame); }, 28);
    }
    const isShown = () => root.isConnected && !(win && win.hidden) && !document.hidden && !(win && win.classList.contains('minimized'));
    function resume() { if (!raf && isShown()) { last = 0; raf = requestAnimationFrame(frame); } }
    document.addEventListener('visibilitychange', resume);
    if (win) new MutationObserver(resume).observe(win, { attributes: true, attributeFilter: ['hidden', 'class'] });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && selected) { e.stopPropagation(); select(null); } });

    resize(); renderPanel(); resume();
    return { resume };
  }
  window.Venture = { mount, _test: { helio, jdOf } };
})();
