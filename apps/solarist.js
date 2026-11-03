/* Solarist: a Pomodoro timer for space explorers. Every finished study session is a jump through deep space that ends
   at a brand-new, randomly generated planet (name, class, climate, biomes, life, a pixel-art portrait...).
   Breaks recharge the ship. Every world you find goes in your Logbook.
   Saved in this browser: the logbook, today's count, settings and a running timer.
   Loaded by index.html the first time the window opens. */
(() => {
  'use strict';
  const KEY = 'lico-solarist', OLD_KEY = 'lico-archivist';
  const MODES = { focus: 'Travel', short: 'Short recharge', long: 'Long recharge' };

  /* =====================================================================
     Planet generator. Everything comes from one random seed, and the finished planet is saved as data,
     so editing these lists later only changes future discoveries, never the ones already in a logbook.
     ===================================================================== */
  function rng(seed) { // mulberry32
    let a = Math.imul((seed >>> 0) ^ 0x9E3779B9, 0x85EBCA6B) >>> 0; // scramble the seed so neighbouring seeds look nothing alike
    const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < 6; i++) next();
    return next;
  }
  const SYL = ['ka', 've', 'lor', 'thi', 'xan', 'mo', 'ri', 'zeph', 'ul', 'dra', 'ny', 'os', 'cae', 'ta', 'vel', 'qui', 'bar', 'ish', 'on', 'ae', 'sol', 'mir', 'dun', 'kel', 'sa', 'tor', 'fen', 'ix', 'yra', 'go', 'lu', 'ne', 'ar', 'em', 'phi', 'rho', 'zan', 'tue', 'il', 'cor', 'mae', 'ost', 'vry', 'hal', 'ena', 'kor', 'syl', 'tav'];
  const CATALOG = ['KS', 'HX', 'TRA', 'VND', 'OGL', 'SLR', 'GX', 'PMR', 'NEB', 'K2', 'TOI', 'QZ'];
  const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const RARITY = [['Common', 60], ['Uncommon', 26], ['Rare', 11], ['Legendary', 3]];
  const RARITY_BOOST = [['Common', 51], ['Uncommon', 29], ['Rare', 15], ['Legendary', 5]];
  const STARS = [['red dwarf', 34], ['orange dwarf', 22], ['yellow dwarf', 18], ['white dwarf', 6], ['blue giant', 5], ['red giant', 6], ['binary pair', 7], ['pulsar', 2]];
  // class: weight, temperature range (°C), palette (light -> dark), biomes, atmospheres, life chance, has a surface
  const TYPES = {
    Rocky: { w: 14, t: [-80, 60], pal: ['#d2ad85', '#a8825f', '#7f6045', '#58412e'], bio: ['Rocky plains', 'Canyon mazes', 'Cratered highlands', 'Dust basins', 'Stone arches', 'Boulder fields'], atm: ['Thin nitrogen', 'Carbon dioxide', 'Almost none', 'Argon haze'], life: .15 },
    Ocean: { w: 10, t: [2, 34], pal: ['#7fc4ff', '#3a8be0', '#2560b0', '#173f7a'], land: ['#77b864', '#c8b47a'], bio: ['Endless ocean', 'Island chains', 'Reef shallows', 'Storm seas', 'Kelp-like forests', 'Floating ice rafts'], atm: ['Nitrogen and oxygen', 'Humid nitrogen', 'Thick water vapor'], life: .7 },
    Jungle: { w: 8, t: [18, 48], pal: ['#8fdc6a', '#4caf50', '#2e7d32', '#1b4f20'], bio: ['Dense jungle', 'Giant fungus forests', 'Swamp deltas', 'Vine canopies', 'Glowing moss valleys', 'Bamboo-like towers'], atm: ['Oxygen-rich', 'Humid nitrogen and oxygen', 'Spore-heavy air'], life: .92 },
    Desert: { w: 11, t: [25, 95], pal: ['#f6dc9c', '#e0b268', '#c08844', '#8e5f2c'], bio: ['Dune seas', 'Salt flats', 'Glass deserts', 'Mesa country', 'Dry riverbeds', 'Rust plains'], atm: ['Dry carbon dioxide', 'Thin nitrogen', 'Dusty nitrogen'], life: .25 },
    Ice: { w: 11, t: [-220, -25], pal: ['#ffffff', '#d8eef8', '#a8d0e8', '#76a8c8'], bio: ['Glacier fields', 'Frozen oceans', 'Ice caves', 'Snow plains', 'Cryovolcano fields', 'Blue ice cliffs'], atm: ['Thin nitrogen', 'Methane traces', 'Almost none'], life: .12 },
    Lava: { w: 8, t: [350, 1500], pal: ['#ffd04a', '#ff7a1a', '#4a2a22', '#241414'], bio: ['Lava seas', 'Volcanic chains', 'Obsidian plains', 'Ash fields', 'Magma rivers', 'Basalt towers'], atm: ['Sulfur dioxide', 'Volcanic ash and CO₂', 'Almost none'], life: .02 },
    'Gas giant': { w: 10, t: [-170, 900], pal: ['#f2e2c0', '#dbb486', '#b77a50', '#86503a'], bio: ['Banded cloud belts', 'Endless storms', 'Ammonia skies', 'Hydrogen depths'], atm: ['Hydrogen and helium'], life: .04, noGround: true },
    'Ice giant': { w: 6, t: [-225, -170], pal: ['#c4f2fa', '#8adaec', '#55b4d4', '#2f84aa'], bio: ['Methane haze', 'Diamond rain layers', 'Deep water-ice mantle', 'Supersonic winds'], atm: ['Hydrogen, helium and methane'], life: .01, noGround: true },
    Toxic: { w: 6, t: [60, 480], pal: ['#e4ec7a', '#bcc84a', '#8e9a32', '#5e6a20'], bio: ['Acid lakes', 'Sulfur fields', 'Yellow haze plains', 'Corroded canyons', 'Bubbling mud pits'], atm: ['Sulfuric acid clouds', 'Chlorine haze', 'Thick carbon dioxide'], life: .06 },
    Crystal: { w: 3, t: [-120, 40], pal: ['#f4dcff', '#d2a2f2', '#a46ed6', '#6e3ea8'], bio: ['Crystal spires', 'Mirror plains', 'Prism caves', 'Singing quartz forests', 'Geode valleys'], atm: ['Thin neon', 'Almost none', 'Argon and nitrogen'], life: .1 },
    'Tidally locked': { w: 5, t: [-140, 260], pal: ['#ffd9a0', '#e0a060', '#3a4a7a', '#1a2244'], bio: ['Twilight band', 'Scorched dayside', 'Frozen nightside', 'Eternal sunset strip'], atm: ['Nitrogen', 'Thin carbon dioxide', 'Wind-whipped nitrogen'], life: .3, locked: true },
    Garden: { w: 3, t: [6, 28], pal: ['#7fc4ff', '#3a8be0', '#2560b0', '#173f7a'], land: ['#6cc45a', '#3e8e3a'], clouds: true, bio: ['Temperate forests', 'Rolling grasslands', 'River valleys', 'Flower meadows', 'Misty mountains', 'Calm lakes'], atm: ['Nitrogen and oxygen, breathable'], life: .97 },
    Rogue: { w: 2, t: [-235, -205], pal: ['#4a4f6e', '#353950', '#25283a', '#16182a'], bio: ['Eternal night', 'Frozen crust', 'Geothermal hot spots', 'Black ice plains'], atm: ['Frozen solid', 'Almost none'], life: .05, rogue: true },
  };
  const LIFE = [['No signs of life', 0], ['Microbial traces', 1], ['Moss-like mats', 2], ['Plant-like life', 3], ['Swimming creatures', 4], ['Large animal herds', 5], ['Signs of intelligence', 6]];
  const WEATHER = {
    any: ['calm, still air', 'gentle winds', 'sudden dust devils', 'aurora storms near the poles', 'long, quiet nights', 'electrical storms', 'thick morning fog'],
    hot: ['heat shimmer all day', 'firestorms', 'ash rain', 'scorching winds'],
    cold: ['snow that never stops', 'hurricanes of ice crystals', 'frost that cracks rock', 'nitrogen snow'],
    wet: ['warm rain every afternoon', 'monsoon seasons', 'rainbow mists', 'endless drizzle'],
    gas: ['a storm larger than Earth', 'jet streams faster than sound', 'lightning bigger than continents', 'cloud bands that shift every hour'],
  };
  const RES = ['iron', 'nickel', 'water ice', 'helium-3', 'titanium', 'silicon', 'carbon', 'rare-earth metals', 'diamond dust', 'platinum', 'deuterium', 'lithium', 'unknown crystals'];
  const OPEN = [
    'Sensors locked onto {n} as the ship dropped out of the jump.',
    'Long-range scans picked up {n} glinting near its {star}.',
    'After a long haul through empty space, {n} filled the viewport.',
    'The navigation computer flagged {n} as uncharted. Not anymore.',
    'A faint signal led the ship straight to {n}.',
    '{n} appeared out of the dark, right where the charts showed nothing.',
  ];
  const GROUND = [
    'Most of the surface is {b1}, broken up by {b2}.',
    'Survey drones mapped {b1} stretching to the horizon, with patches of {b2}.',
    'From orbit it looks like {b1}; up close, there are {b2} too.',
    'The landing team reported {b1} and, further out, {b2}.',
  ];
  const SKY = [
    'The weather: {w}.',
    'Expect {w} on any visit.',
    'Atmospheric readings show {w}.',
    'The crew logged {w} during the flyby.',
  ];
  const GAS = [
    'There is no solid ground, just {b1} sinking into {b2}.',
    'Probes dropped into {b1} and were lost somewhere in the {b2}.',
  ];
  const NOTE = {
    Common: ['A quiet world. Worth a pin on the map.', 'Nothing unusual, which is its own kind of nice.', 'Logged and catalogued. On to the next one.', 'A good place to stretch your legs.'],
    Uncommon: ['Scientists back home will want a closer look.', 'The readings here are a little strange. In a good way.', 'One of the crew has already asked to come back.', 'Worth a second visit.'],
    Rare: ['The ship\'s instruments have never recorded anything like it.', 'Mission control asked for the data three times to be sure.', 'A world like this turns up maybe once in a hundred jumps.'],
    Legendary: ['Old star maps mention a world like this, but nobody believed them.', 'The crew went completely silent at the viewport.', 'This one goes on the front page of every science journal back home.'],
  };
  const ODD = ['a perfectly round lake', 'ruins of an ancient structure', 'a second, tiny star in its sky', 'rings that glow at night', 'a mountain taller than Olympus Mons', 'a canyon that circles the whole planet', 'a moon that orbits backwards', 'a magnetic field strong enough to scramble the compass', 'a repeating radio pulse from the surface', 'giant crystal arches', 'a crater shaped like a heart', 'a storm that has not moved in centuries'];

  function weighted(r, list) { const total = list.reduce((a, x) => a + x[1], 0); let x = r() * total; for (const it of list) { if ((x -= it[1]) < 0) return it[0]; } return list[0][0]; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const between = (r, a, b) => a + r() * (b - a);
  function shiftHex(hex, deg, light) { // nudge a colour's hue and lightness for slight variation
    const n = parseInt(hex.slice(1), 16), R = (n >> 16 & 255) / 255, G = (n >> 8 & 255) / 255, B = (n & 255) / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B); let h = 0, s = 0; const l0 = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l0 > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; }
    h = (h + deg + 360) % 360; const l = Math.max(0, Math.min(1, l0 + light));
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = l - c / 2;
    const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return '#' + [r1, g1, b1].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
  }

  function makePlanet(seed, num, boost) {
    const r = rng(seed);
    const type = weighted(r, Object.entries(TYPES).map(([k, v]) => [k, v.w])), T = TYPES[type];
    const rarity = weighted(r, boost ? RARITY_BOOST : RARITY); // a settled probe boosts the long-range scanners
    // name: 2-3 made-up syllables + a numeral or letter; plus a survey catalog code
    let name = ''; const ns = r() < .6 ? 2 : 3; for (let i = 0; i < ns; i++) name += pick(r, SYL);
    name = name.charAt(0).toUpperCase() + name.slice(1);
    const suf = r(); if (suf < .45) name += ' ' + pick(r, ROMAN); else if (suf < .65) name += '-' + (1 + Math.floor(r() * 99)); else if (suf < .8) name += ' ' + 'bcdef'[Math.floor(r() * 5)];
    const code = pick(r, CATALOG) + '-' + (100 + Math.floor(r() * 9900)) + ' ' + 'bcdefg'[Math.floor(r() * 6)];
    const star = T.rogue ? 'none (drifting alone)' : weighted(r, STARS);
    const temp = Math.round(between(r, T.t[0], T.t[1]));
    const tempNight = T.locked ? Math.round(between(r, -200, -60)) : null;
    const gravity = T.noGround ? +(between(r, 0.9, 3.4)).toFixed(2) : +(between(r, 0.15, 2.4)).toFixed(2);
    const day = T.locked ? null : +(T.noGround ? between(r, 8, 18) : between(r, 6, 90)).toFixed(1);
    const year = Math.round(T.rogue ? 0 : (star === 'red dwarf' ? between(r, 3, 60) : between(r, 40, 4000)));
    const moons = T.noGround ? Math.floor(between(r, 2, 90)) : Math.floor(r() * r() * 8);
    const rings = r() < (T.noGround ? .55 : .1) || (rarity === 'Legendary' && r() < .5);
    const dist = Math.round(Math.pow(10, between(r, 0.8, 4.4))); // 6 to 25,000 light-years
    const b = T.bio.slice().sort(() => r() - .5);
    const atm = pick(r, T.atm);
    let lifeLvl = r() < T.life ? 1 + Math.floor(r() * (rarity === 'Legendary' ? 6 : rarity === 'Rare' ? 5 : 4)) : 0;
    if (type === 'Garden' && lifeLvl < 3) lifeLvl = 3;
    const life = LIFE[Math.min(6, lifeLvl)][0];
    const pool = T.noGround ? WEATHER.gas : WEATHER.any.concat( temp > 80 ? WEATHER.hot : temp < -20 ? WEATHER.cold : (type === 'Ocean' || type === 'Jungle' || type === 'Garden') ? WEATHER.wet : []);
    const weather = pick(r, pool);
    const res = RES.slice().sort(() => r() - .5).slice(0, 1 + Math.floor(r() * 3));
    const odd = rarity === 'Rare' || rarity === 'Legendary' ? pick(r, ODD) : (r() < .12 ? pick(r, ODD) : null);
    // the written log, built from pieces
    const fill = s => s.replace('{n}', name).replace('{star}', star.replace(' (drifting alone)', '') === 'none' ? 'nothing' : star).replace('{b1}', b[0].toLowerCase()).replace('{b2}', (b[1] || b[0]).toLowerCase()).replace('{w}', weather);
    const lines = [fill(T.rogue ? '{n} drifts through deep space with no star at all. The ship nearly flew past it.' : pick(r, OPEN)), fill(T.noGround ? pick(r, GAS) : pick(r, GROUND)), fill(pick(r, SKY))];
    if (odd) lines.push('Most striking: ' + odd + '.');
    if (lifeLvl >= 3) lines.push(lifeLvl >= 6 ? 'Something down there is watching us back.' : 'The bio-scanner would not stop beeping.');
    lines.push(pick(r, NOTE[rarity]));
    // look: palette with a little random variation
    const hue = between(r, -18, 18), lit = between(r, -.05, .05);
    const pal = T.pal.map(c => shiftHex(c, hue, lit));
    const land = T.land ? T.land.map(c => shiftHex(c, hue / 2, lit)) : null;
    return {
      v: 1, seed, num, type, rarity, name, code, star, temp, tempNight, gravity, day, year, moons, rings, dist, atm, life, lifeLvl, weather,
      biomes: b.slice(0, 2), res, odd, log: lines.join(' '),
      look: { pal, land, clouds: !!T.clouds || (type === 'Ocean' && r() < .4), bands: !!T.noGround, locked: !!T.locked, lava: type === 'Lava', crystal: type === 'Crystal', tilt: between(r, -0.35, 0.35), ringCol: shiftHex(pick(r, ['#d8c8a0', '#a8b8d0', '#c0a0d8', '#e0d0b0']), hue, 0), noise: Math.floor(r() * 1e9) },
    };
  }

  /* ---------- Probe deep scan: extra survey data revealed when the probe settles on a world ---------- */
  const CORES = ['Molten iron core', 'Solid iron-nickel core', 'Diamond-rich core', 'Frozen rock core', 'Liquid metallic hydrogen', 'Radioactive core, warm to the touch', 'Strangely hollow-sounding mantle', 'Crystal lattice core', 'Ocean of liquid water under the crust', 'Slowly cooling magma core'];
  const SPECIES = [null,
    ['mat colonies', 'spore clouds', 'slime films', 'micro-blooms'],
    ['moss carpets', 'lichen crusts', 'creeping mats', 'stone moss'],
    ['bloomcaps', 'reed-trees', 'glass ferns', 'lantern vines', 'sun-cups'],
    ['glidefins', 'ribbon eels', 'shell swimmers', 'drift jellies', 'bubble rays'],
    ['striders', 'longnecks', 'burrowers', 'six-legged grazers', 'shell-backs'],
    ['builders', 'watchers', 'singers', 'tool-makers', 'stargazers']];
  const ODD_X = ['completely natural, though nobody can explain how it formed', 'almost certainly natural. Almost', 'artificial. Someone was here long before us', 'a trick of the light from the local star', 'older than the planet\'s own crust', 'still changing, very slowly', 'linked to something deep underground'];
  const SECRETS = ['The probe recorded a low hum coming from underground.', 'At night, the ground glows faintly where the probe landed.', 'Something left tracks around the probe overnight.', 'A huge cave system runs under most of the surface.', 'The probe found a meteorite that came from another star system.', 'Wind here whistles through the rocks, almost like music.', 'The probe\'s compass points at the same mountain no matter where it moves.', 'Ice and rock layers show the climate flips every few thousand years.', 'There is liquid water deep underground, kept warm by the core.', 'The probe picked up a faint signal that repeats every 42 minutes.', 'The soil is full of tiny, perfect glass spheres.', 'Sunsets here last almost an hour.', 'The probe\'s camera caught a shooting star every few minutes.', 'Gravity readings dip slightly over one region, as if something huge is buried there.'];
  function deepScan(p) {
    const r = rng((p.seed ^ 0x5EEDBEEF) >>> 0);
    let sp = null;
    if (p.lifeLvl > 0) { let n = ''; for (let i = 0; i < 2; i++) n += pick(r, SYL); sp = n.charAt(0).toUpperCase() + n.slice(1) + ' ' + pick(r, SPECIES[Math.min(6, p.lifeLvl)]); }
    return { core: pick(r, CORES), species: sp, oddX: p.odd ? pick(r, ODD_X) : null, secret: pick(r, SECRETS), at: Date.now() };
  }
  // the probe: a tiny pixel sprite (made once)
  let probeUrl = null;
  function probeSprite() {
    if (probeUrl) return probeUrl;
    const rows = ['....r....', '....g....', 'bb.ggg.bb', 'bbbgwgbbb', 'bb.ggg.bb', '...g.g...'], col = { b: '#3a6ad8', g: '#c8c8c8', w: '#ffffff', r: '#ff3030' };
    const cv = document.createElement('canvas'); cv.width = 9; cv.height = 6; const x = cv.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((c, i) => { if (col[c]) { x.fillStyle = col[c]; x.fillRect(i, y, 1, 1); } }));
    probeUrl = cv.toDataURL(); return probeUrl;
  }

  /* ---------- pixel-art planet painter (deterministic, so the same planet always looks the same) ---------- */
  const cache = new Map();
  function paint(p, size) {
    const key = p.seed + ':' + size; if (cache.has(key)) return cache.get(key);
    const S = size, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d'), img = x.createImageData(S, S), L = p.look, r = rng(L.noise);
    // value noise
    const G = 16, grid = Array.from({ length: (G + 1) * (G + 1) }, () => r());
    const vn = (u, v) => { u = ((u % G) + G) % G; v = Math.max(0, Math.min(G - .001, v)); const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv); const g = (a, b) => grid[(b % (G + 1)) * (G + 1) + (a % G)]; const a = g(i, j), b2 = g(i + 1, j), c = g(i, j + 1), d = g(i + 1, j + 1); return a + (b2 - a) * su + (c - a) * sv + (a - b2 - c + d) * su * sv; };
    const fbm = (u, v) => vn(u, v) * .55 + vn(u * 2.1, v * 2.1) * .28 + vn(u * 4.3, v * 4.3) * .17;
    const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    const pal = L.pal.map(hex), land = L.land && L.land.map(hex);
    const R0 = S * (p.rings ? .27 : .38), cx = S / 2, cy = S / 2, ringR = R0 * 1.75; // ringed planets are drawn smaller so the rings fit
    const put = (i, c, a = 255) => { img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = a; };
    const ringAt = (px, py, front) => { // a flat, tilted ellipse
      if (!p.rings) return null;
      const dx = px - cx, dy = py - cy, ct = Math.cos(L.tilt), st = Math.sin(L.tilt);
      const rx = dx * ct + dy * st, ry = (-dx * st + dy * ct) / .28;
      const d = Math.sqrt(rx * rx + ry * ry);
      if (d < R0 * 1.28 || d > ringR) return null;
      if (front !== (ry > 0)) return null;
      const band = Math.floor((d - R0 * 1.28) / (ringR - R0 * 1.28) * 5);
      return band === 2 ? null : (band % 2 ? .75 : 1);
    };
    const ringCol = hex(L.ringCol);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const i = (py * S + px) * 4, dx = (px + .5 - cx) / R0, dy = (py + .5 - cy) / R0, d2 = dx * dx + dy * dy;
      const back = ringAt(px + .5, py + .5, false);
      if (d2 > 1) { if (back) put(i, ringCol.map(c => c * back * .8)); continue; }
      const dz = Math.sqrt(1 - d2);
      const lon = Math.atan2(dx, dz) / Math.PI * G * .5 + 3, lat = dy;
      let c;
      if (L.bands) { // gas / ice giants: wavy cloud bands
        const n = fbm(lon * .6, (lat + 1) * 3) * .35 + (Math.sin((lat * 7 + fbm(lon, (lat + 1) * 4) * 2.2)) * .5 + .5) * .65;
        c = pal[Math.min(3, Math.floor(n * 4))];
      } else {
        const n = fbm(lon, (lat + 1) * 4);
        if (land) c = n > .56 ? land[n > .66 ? 1 : 0] : pal[n > .46 ? 1 : n > .38 ? 2 : 3];
        else if (L.lava) c = n > .62 ? pal[0] : n > .55 ? pal[1] : n > .4 ? pal[2] : pal[3];
        else c = pal[Math.min(3, Math.floor((1 - n) * 4.2))];
        if (L.locked) { const night = Math.max(0, Math.min(1, (dx + .2) * 1.8)); c = c.map((v, k) => v * (1 - night) + [26, 34, 68][k] * night); }
        if (!L.lava && !L.locked && Math.abs(lat) > .8 && (land || L.clouds)) c = [240, 246, 252]; // ice caps
        if (L.clouds && fbm(lon * 1.7 + 9, (lat + 1) * 6) > .62) c = [248, 250, 255];
      }
      // light from the upper left, in 4 chunky steps with a little dithering
      const lightDot = Math.max(0, -dx * .55 - dy * .45 + dz * .7);
      let shade = lightDot + ((px + py) % 2 ? .04 : -.04);
      shade = shade > .75 ? 1.12 : shade > .45 ? 1 : shade > .2 ? .72 : .45;
      if (L.lava && c === pal[0]) shade = Math.max(shade, 1);
      put(i, c.map(v => Math.min(255, v * shade)));
      const front = ringAt(px + .5, py + .5, true); if (front) put(i, ringCol.map(v => v * front));
    }
    // rings in front of the planet's disk outside it too
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { const i = (py * S + px) * 4; const f = ringAt(px + .5, py + .5, true); if (f && img.data[i + 3] === 0) put(i, ringCol.map(v => v * f)); }
    // dark outline
    const out = new Uint8ClampedArray(img.data);
    for (let py = 1; py < S - 1; py++) for (let px = 1; px < S - 1; px++) {
      const i = (py * S + px) * 4; if (img.data[i + 3]) continue;
      if (img.data[i + 4 + 3] || img.data[i - 4 + 3] || img.data[i + S * 4 + 3] || img.data[i - S * 4 + 3]) { out[i] = 10; out[i + 1] = 12; out[i + 2] = 24; out[i + 3] = 255; }
    }
    img.data.set(out); x.putImageData(img, 0, 0);
    const url = cv.toDataURL(); cv.width = cv.height = 0;
    cache.set(key, url); if (cache.size > 200) cache.delete(cache.keys().next().value);
    return url;
  }

  /* ===================================================================== the app ===================================================================== */
  function mount(root, hooks) {
    hooks = hooks || {};
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    /* ---------- saved state (settings, stats and a running timer carry over from Archivist) ---------- */
    let S = { found: [], probe: null, mission: 0, total: 0, minutes: 0, day: today(), todayN: 0, cycle: 0, set: { focus: 25, short: 5, long: 15, every: 4 }, run: null };
    try {
      let s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) { const old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); if (old) { s = { total: old.total, minutes: old.minutes, day: old.day, todayN: old.todayN, cycle: old.cycle, set: old.set, run: old.run, found: [] }; } }
      if (s) S = Object.assign(S, s, { set: Object.assign(S.set, s.set || {}), found: Array.isArray(s.found) ? s.found : [] });
      localStorage.removeItem(OLD_KEY);
    } catch (e) {}
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
    save();
    const rollDay = () => { if (S.day !== today()) { S.day = today(); S.todayN = 0; } };
    rollDay();

    let mode = (S.run && S.run.mode) || 'focus';
    let running = false, endAt = 0, left = 0, tickT = 0;
    const length = m => S.set[m] * 60000;
    left = (S.run && S.run.left) || length(mode);

    /* ---------- UI ---------- */
    const tabTimer = el('button', { type: 'button', role: 'tab', 'aria-selected': 'true', onclick: () => tab('timer') }, '🚀 Voyage');
    const tabLog = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', onclick: () => tab('log') }, '🪐 Logbook');
    const modeBtns = Object.keys(MODES).map(m => el('button', { type: 'button', class: 'sl-mode', 'data-m': m, onclick: () => { if (!running) setMode(m); } }, MODES[m]));
    const bigText = el('span', {}), dots = el('span', { class: 'sl-dots', 'aria-hidden': 'true' });
    const timeText = el('div', { class: 'sl-time' }, '25:00');
    const screen = el('div', { class: 'sl-screen sunken', 'aria-live': 'off' }, el('div', { class: 'sl-big' }, bigText, dots), timeText);
    let dotN = 0, dotT = 0;
    const byNum = n => S.found.find(f => f.p.num === n);
    // Probe battery: settling charges it for BATTERY boosted travel trips; then it goes dormant until resettled
    const BATTERY = 4;
    if (S.probe && S.probe.charge == null) S.probe.charge = BATTERY;
    const charged = () => !!(S.probe && S.probe.charge > 0);
    const isHere = n => !!(S.probe && S.probe.num === n);
    const batt = () => '⚡' + '▮'.repeat(S.probe.charge) + '▯'.repeat(BATTERY - S.probe.charge);
    const nm = p => p.custom || p.name;
    const settling = () => { const f = S.mission && byNum(S.mission); return f ? f.p : null; };
    function headline() {
      const t = settling();
      if (!running) return left > 0 && left < length(mode) ? 'Holding position' : mode === 'focus' ? (t ? 'Ready to deploy the probe' : 'Ready for launch') : 'Docked. Ready to recharge';
      return mode === 'focus' ? (t ? (isHere(t.num) ? 'Recharging probe on ' : 'Deploying probe to ') + nm(t) : 'Traveling to an uncharted world') : 'Recharging ship cores';
    }
    function drawDots() { const n = running ? dotN % 4 : 0; dots.replaceChildren(...[0, 1, 2].map(i => el('i', { class: i < n ? '' : 'off' }, '.'))); }
    const barFill = el('div', { class: 'sl-fill' });
    const bar = el('div', { class: 'sl-bar sunken', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100 }, barFill);
    const startB = el('button', { type: 'button', class: 'btn sl-go', onclick: () => running ? pause() : start() }, 'Launch');
    const resetB = el('button', { type: 'button', class: 'btn', title: 'Start this leg over (a trip stopped early finds nothing)', onclick: () => reset() }, 'Reset');
    const skipB = el('button', { type: 'button', class: 'btn', title: 'Skip to the next part', onclick: () => skip() }, 'Skip');
    const hint = el('div', { class: 'sl-hint' });
    const card = el('div', { class: 'sl-card', hidden: true });
    const sel = (k, opts) => { const s = el('select', { 'aria-label': k }, opts.map(v => el('option', { value: v, selected: S.set[k] === v || null }, String(v)))); s.addEventListener('change', () => { S.set[k] = +s.value; save(); if (!running && mode === k) { left = length(mode); persistRun(); } draw(); }); return s; };
    const settings = el('details', { class: 'sl-set' }, el('summary', {}, 'Settings'),
      el('div', { class: 'sl-set-row' },
        el('label', {}, 'Travel ', sel('focus', [1, 10, 15, 20, 25, 30, 40, 45, 50, 60]), ' min'),
        el('label', {}, 'Short recharge ', sel('short', [3, 5, 10]), ' min'),
        el('label', {}, 'Long recharge ', sel('long', [10, 15, 20, 30]), ' min'),
        el('label', {}, 'Long recharge every ', sel('every', [2, 3, 4, 5, 6]), ' trips')));
    // what the next study session is for: travel to a new world, or settle the probe on one you've found
    const missionSel = el('select', { class: 'sl-mission-sel', 'aria-label': 'Next trip' });
    missionSel.addEventListener('change', () => { S.mission = +missionSel.value; save(); hint.textContent = ''; draw(); });
    const mission = el('label', { class: 'sl-mission' }, 'Next trip: ', missionSel);
    const timerPane = el('div', { class: 'sl-pane' }, el('div', { class: 'sl-modes' }, modeBtns), screen, bar, el('div', { class: 'sl-btns' }, startB, resetB, skipB), mission, hint, card, settings);

    const find = el('input', { type: 'search', class: 'sl-find', placeholder: 'Search worlds...', 'aria-label': 'Search your logbook' });
    const typeSel = el('select', { 'aria-label': 'Planet class' }, el('option', { value: '' }, 'All classes'), ...Object.keys(TYPES).map(t => el('option', { value: t }, t)));
    const rarSel = el('select', { 'aria-label': 'Rarity' }, el('option', { value: '' }, 'Any rarity'), ...RARITY.map(([k]) => el('option', { value: k }, k)));
    const logHead = el('div', { class: 'sl-ahead' });
    const logList = el('div', { class: 'sl-list' });
    const logPane = el('div', { class: 'sl-pane', hidden: true }, logHead, el('div', { class: 'sl-tools' }, typeSel, rarSel, find), logList);

    const status = el('span', {}), status2 = el('span', {});
    root.replaceChildren(el('div', { class: 'sl-tabs', role: 'tablist' }, tabTimer, tabLog), el('div', { class: 'sl-body sunken' }, timerPane, logPane), el('div', { class: 'statusbar' }, status, status2));
    function tab(t) {
      tabTimer.setAttribute('aria-selected', String(t === 'timer')); tabLog.setAttribute('aria-selected', String(t === 'log'));
      timerPane.hidden = t !== 'timer'; logPane.hidden = t !== 'log';
      if (t === 'log') drawLog();
    }

    /* ---------- planet card / details ---------- */
    const fmtTemp = p => p.tempNight != null ? p.temp + ' °C day side / ' + p.tempNight + ' °C night side' : p.temp + ' °C';
    const pad = n => '#' + String(n).padStart(4, '0');
    function facts(p) {
      const rows = [['Class', p.type + (p.rings ? ', ringed' : '')], ['Star', p.star], ['Distance', p.dist.toLocaleString() + ' light-years from Earth'], ['Temperature', fmtTemp(p)], ['Gravity', p.gravity + ' g'],
        ['Day', p.day == null ? 'never ends on one side' : p.day + ' hours'], ['Year', p.year ? p.year.toLocaleString() + ' days' : 'no orbit'], ['Moons', String(p.moons)], ['Atmosphere', p.atm], [p.type === 'Gas giant' || p.type === 'Ice giant' ? 'Layers' : 'Biomes', p.biomes.join(', ')],
        ['Weather', p.weather], ['Life', p.life], ['Resources', p.res.join(', ')]];
      if (p.odd) rows.push(['Anomaly', p.odd + (p.deep && p.deep.oddX ? ': ' + p.deep.oddX : '')]);
      if (p.deep) { rows.push(['Core', p.deep.core]); if (p.deep.species) rows.push(['Native species', p.deep.species]); }
      if (p.custom) rows.push(['Charted as', p.name]);
      return el('dl', { class: 'sl-facts' }, rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    }
    const HEAD = { new: '★ New world discovered · ', probe: '📡 Probe settled · ', last: 'Last discovery · ', log: '' };
    function planetCard(p, kind) {
      const here = isHere(p.num);
      const pic = el('div', { class: 'sl-picwrap' }, el('img', { class: 'sl-pic', src: paint(p, 64), alt: 'Pixel portrait of ' + nm(p), width: 128, height: 128 }),
        here ? el('span', { class: 'sl-orbit' + (charged() ? '' : ' dormant'), title: charged() ? 'Your probe is orbiting this world' : 'Your probe is orbiting this world (battery empty)' }, el('img', { src: probeSprite(), alt: 'Probe' })) : null);
      return [
        el('div', { class: 'sl-card-h' }, el('span', {}, (HEAD[kind] || '') + pad(p.num)), el('span', { class: 'sl-rar sl-r-' + p.rarity.toLowerCase() }, p.rarity)),
        el('div', { class: 'sl-pl' }, pic,
          el('div', { class: 'sl-pl-t' }, el('b', { class: 'sl-name' }, nm(p), here ? el('span', { class: 'sl-tag' + (charged() ? '' : ' off'), title: charged() ? 'Signal boost for the next ' + S.probe.charge + ' travel trip' + (S.probe.charge === 1 ? '' : 's') : 'Battery empty. Resettle the probe to recharge it.' }, charged() ? '📡 ' + batt() : '📡 Dormant') : null), el('div', { class: 'sl-code' }, p.code + ' · ' + p.type), el('p', {}, p.custom ? p.log.split(p.name).join(p.custom) : p.log),
            p.deep ? el('p', { class: 'sl-deep' }, el('b', {}, 'Probe report: '), p.deep.secret) : null)),
        el('details', { class: 'sl-more' }, el('summary', {}, p.deep ? 'Survey data (deep scan)' : 'Survey data'), facts(p)),
      ];
    }
    function showCard(p, kind) {
      if (!p) { card.hidden = true; card.replaceChildren(); return; }
      card.hidden = false; card.className = 'sl-card' + (kind === 'new' || kind === 'probe' ? ' new' : '');
      card.replaceChildren(...planetCard(p, kind));
      if (kind === 'probe') card.querySelector('details').open = true;
    }

    /* ---------- timer ---------- */
    const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    function remaining() { return running ? Math.max(0, endAt - Date.now()) : left; }
    function persistRun() { S.run = { mode, left: remaining(), endAt: running ? endAt : 0, running }; save(); }
    function setMode(m) { mode = m; left = length(m); hint.textContent = ''; draw(); persistRun(); }
    function start() { if (running) return; if (left <= 0) left = length(mode); running = true; endAt = Date.now() + left; persistRun(); loop(); draw(); }
    function pause() { if (!running) return; left = remaining(); running = false; clearInterval(tickT); persistRun(); draw(); }
    function reset() { running = false; clearInterval(tickT); left = length(mode); persistRun(); draw(); }
    function skip() {
      running = false; clearInterval(tickT);
      if (mode === 'focus') toBreak(); else setMode('focus');
      hint.textContent = mode === 'focus' ? 'Recharge skipped. Next jump is ready.' : settling() ? 'Turned back early. The probe stays where it was.' : 'Turned back early. No new world this time.';
      persistRun();
    }
    function toBreak() { setMode(S.cycle > 0 && S.cycle % S.set.every === 0 ? 'long' : 'short'); }
    function loop() { clearInterval(tickT); tickT = setInterval(() => { if (remaining() <= 0) finish(); else drawClock(); }, 250); }
    function finish(quiet) {
      clearInterval(tickT); running = false; left = 0;
      if (mode === 'focus') {
        rollDay();
        S.total++; S.todayN++; S.cycle++; S.minutes += S.set.focus;
        const target = settling();
        if (target) { // settle the probe: it leaves its old world, lands here and runs a deep scan
          const again = isHere(target.num);
          S.probe = { num: target.num, since: again ? S.probe.since : Date.now(), charge: BATTERY };
          if (!target.deep) target.deep = deepScan(target);
          target.probed = true; S.mission = 0;
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(target, 'probe');
          toBreak();
          hint.textContent = (again ? 'Probe recharged on ' + nm(target) + '. ' : 'Probe settled on ' + nm(target) + '. Deep scan done, and you can rename it in the Logbook. ') + 'Signal boost for the next ' + BATTERY + ' trips. Now a ' + MODES[mode].toLowerCase() + '.';
        } else {
          const boost = charged();
          if (boost) S.probe.charge--;
          const p = makePlanet((Math.random() * 4294967296) >>> 0, S.found.length + 1, boost);
          if (boost) p.boosted = true;
          S.found.push({ at: Date.now(), p });
          if (!quiet && hooks.tada) hooks.tada();
          if (hooks.show) hooks.show();
          showCard(p, 'new');
          toBreak();
          hint.textContent = 'Arrived! ' + (boost ? (S.probe.charge ? 'Signal boost used (' + S.probe.charge + ' left). ' : 'That was the last boosted trip; the probe is dormant now. ') : '') + 'Time for a ' + MODES[mode].toLowerCase() + ': stand up, stretch, drink some water.';
        }
      } else {
        if (!quiet && hooks.ding) hooks.ding();
        if (hooks.show) hooks.show();
        setMode('focus');
        hint.textContent = 'Cores recharged. Press Launch for the next jump.';
      }
      persistRun(); draw();
    }
    function drawClock() {
      const r = remaining(), pct = Math.min(100, Math.max(0, 100 - (r / length(mode)) * 100));
      timeText.textContent = fmt(r) + (running ? ' left' : '');
      const hl = headline(); if (bigText.textContent !== hl) bigText.textContent = hl;
      if (running && !dotT) dotT = setInterval(() => { dotN++; drawDots(); }, 450);
      if (!running && dotT) { clearInterval(dotT); dotT = 0; dotN = 0; }
      drawDots();
      barFill.style.width = pct + '%'; bar.setAttribute('aria-valuenow', Math.round(pct));
      if (hooks.title) hooks.title(running ? fmt(r) + ' · ' + (mode === 'focus' ? (settling() ? 'Deploying probe' : 'Traveling') : 'Recharging') : 'Solarist');
    }
    function draw() {
      drawClock();
      root.dataset.mode = mode;
      modeBtns.forEach(b => { const on = b.dataset.m === mode; b.classList.toggle('on', on); b.disabled = running && !on; });
      startB.textContent = running ? 'Pause' : (left < length(mode) && left > 0 ? 'Resume' : mode === 'focus' ? 'Launch' : 'Recharge');
      if (!hint.textContent) hint.textContent = mode === 'focus' ? (settling() ? 'Finish this session to settle the probe on ' + nm(settling()) + '.' : 'Finish a trip (a study session) to discover a new world.') : 'Rest up. The ship needs it too.';
      // the "Next trip" picker
      if (S.mission && !byNum(S.mission)) S.mission = 0;
      mission.hidden = !S.found.length;
      missionSel.disabled = running && mode === 'focus';
      missionSel.replaceChildren(el('option', { value: 0 }, '🚀 Travel to a new world'),
        ...S.found.slice().reverse().slice(0, 300).map(f => { const here = isHere(f.p.num);
          return el('option', { value: f.p.num, disabled: here && charged() || null }, here ? (charged() ? '📡 Probe on ' + nm(f.p) + ' (still charged)' : '🔋 Recharge probe on ' + nm(f.p) + ' (' + pad(f.p.num) + ')') : '📡 Settle probe on ' + nm(f.p) + ' (' + pad(f.p.num) + ')'); }));
      missionSel.value = String(S.mission || 0);
      const round = mode === 'focus' ? S.cycle % S.set.every + 1 : (S.cycle % S.set.every || S.set.every);
      status.textContent = 'Today: ' + S.todayN + ' trip' + (S.todayN === 1 ? '' : 's') + ' · leg ' + round + ' of ' + S.set.every;
      const pr = S.probe && byNum(S.probe.num);
      status2.textContent = S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + ' charted' + (pr ? ' · 📡 ' + nm(pr.p) + ' ' + (charged() ? batt() : '(dormant)') : '');
      tabLog.textContent = '🪐 Logbook (' + S.found.length + ')';
    }

    /* ---------- logbook ---------- */
    let openNum = null;
    function drawLog() {
      const ly = S.found.reduce((a, f) => a + f.p.dist, 0);
      const counts = {}; S.found.forEach(f => { counts[f.p.rarity] = (counts[f.p.rarity] || 0) + 1; });
      logHead.replaceChildren(
        el('div', {}, el('b', {}, S.found.length + ' world' + (S.found.length === 1 ? '' : 's') + ' charted')),
        el('div', { class: 'sl-muted' }, ly.toLocaleString() + ' light-years of travel · ' + Math.round(S.minutes / 60 * 10) / 10 + ' hours studying'),
        el('div', { class: 'sl-rarcount' }, RARITY.map(([k]) => el('span', { class: 'sl-rar sl-r-' + k.toLowerCase() }, k + ' ' + (counts[k] || 0)))),
        (() => { const pr = S.probe && byNum(S.probe.num); return el('div', { class: 'sl-muted' }, pr ? (charged() ? '📡 Probe on ' + nm(pr.p) + ', battery ' + batt() + ': the next ' + S.probe.charge + ' travel trip' + (S.probe.charge === 1 ? ' has' : 's have') + ' better odds of Rare and Legendary worlds.' : '📡 Probe on ' + nm(pr.p) + ' is dormant (battery empty). Spend a session resettling it, here or on another world, for ' + BATTERY + ' more boosted trips.') : '📡 No probe settled yet. Open a world below and choose "Settle probe here". It boosts your next ' + BATTERY + ' trips.'); })());
      if (!S.found.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds yet. Finish a trip on the Voyage tab to discover your first planet.')); return; }
      const q = find.value.trim().toLowerCase(), ty = typeSel.value, ra = rarSel.value;
      const list = S.found.slice().reverse().filter(f => (!ty || f.p.type === ty) && (!ra || f.p.rarity === ra) && (!q || ((f.p.custom || '') + ' ' + f.p.name + ' ' + f.p.code + ' ' + f.p.log + ' ' + f.p.biomes.join(' ')).toLowerCase().includes(q)));
      if (!list.length) { logList.replaceChildren(el('p', { class: 'sl-empty' }, 'No worlds match.')); return; }
      logList.replaceChildren(...list.slice(0, 300).map(f => {
        const p = f.p, open = openNum === p.num;
        const row = el('button', { type: 'button', class: 'sl-row', 'aria-expanded': String(open), onclick: () => { openNum = open ? null : p.num; drawLog(); } },
          el('img', { src: paint(p, 32), alt: '', width: 48, height: 48 }),
          el('span', { class: 'sl-row-t' }, el('b', {}, nm(p), isHere(p.num) ? (charged() ? ' 📡' : ' 📡💤') : p.probed ? el('small', { class: 'sl-was' }, ' (probe was here)') : null), el('small', {}, pad(p.num) + ' · ' + p.type + ' · ' + new Date(f.at).toLocaleDateString())),
          el('span', { class: 'sl-rar sl-r-' + p.rarity.toLowerCase() }, p.rarity));
        const here = isHere(p.num);
        const acts = open ? el('div', { class: 'sl-acts' },
          here && charged() ? el('span', { class: 'sl-muted' }, '📡 Your probe is here. Battery ' + batt() + '.') : el('button', { type: 'button', class: 'btn', title: here ? 'Your next study session recharges the probe here' : 'Your next study session will fly the probe here', disabled: running && mode === 'focus' || null, onclick: () => { S.mission = p.num; save(); hint.textContent = ''; tab('timer'); draw(); } }, S.mission === p.num ? (here ? '🔋 Recharging here next' : '📡 Probe heading here next') : here ? '🔋 Recharge probe here' : '📡 Settle probe here'),
          p.deep ? el('button', { type: 'button', class: 'btn', title: 'Worlds your probe has settled on can be renamed', onclick: () => rename(p) }, 'Rename...') : null) : null;
        return el('div', { class: 'sl-entry' + (open ? ' open' : '') }, row, open ? el('div', { class: 'sl-detail' }, acts, ...planetCard(p, 'log').slice(1)) : null);
      }));
      const det = logList.querySelector('.sl-detail details'); if (det) det.open = true;
    }
    function rename(p) {
      const v = window.prompt('Name this world (leave empty to restore "' + p.name + '"):', nm(p));
      if (v == null) return;
      const t = v.trim().slice(0, 32);
      if (t && t !== p.name) p.custom = t; else delete p.custom;
      save(); drawLog(); draw();
      if (!card.hidden && S.found.length) { const shown = card.querySelector('.sl-card-h span'); if (shown && shown.textContent.endsWith(pad(p.num))) showCard(p, 'last'); }
    }
    find.addEventListener('input', drawLog); typeSel.addEventListener('change', drawLog); rarSel.addEventListener('change', drawLog);

    /* ---------- resume a timer that was running when the page closed ---------- */
    if (S.run && S.run.running) {
      if (S.run.endAt > Date.now()) { running = true; endAt = S.run.endAt; loop(); }
      else { const was = S.run.mode; mode = was; finish(true); hint.textContent = was === 'focus' ? 'You arrived somewhere new while you were away.' : 'The cores finished recharging while you were away.'; }
    }
    if (S.found.length && card.hidden) showCard(S.found[S.found.length - 1].p, 'last');
    draw();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && running && remaining() <= 0) finish(); });
    return { running: () => running };
  }
  window.Solarist = { mount, makePlanet, paint };
})();
