/* Saturn Archive: real photos of Saturn and its moons, plus facts. Photos are NASA's (public domain) and are
   loaded from Wikimedia Commons when the window opens, so nothing big is stored on this site.
   Loaded by index.html the first time the Saturn Archive window opens. */
(() => {
  'use strict';
  const FILE = (name, w) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(name) + '?width=' + w;
  const PAGE = name => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name.replace(/ /g, '_'));
  const PHOTOS = [
    { f: 'Saturn_during_Equinox.jpg', t: 'Saturn at equinox', d: 'Cassini, 2009. At equinox the Sun shines exactly edge-on to the rings, so they go dark and thin, and the rings cast long shadows of their bumps.', c: 'NASA / JPL / Space Science Institute' },
    { f: 'Saturn_from_Cassini_Orbiter_(2004-10-06).jpg', t: 'The great Saturn portrait', d: 'Cassini, October 2004. A natural-color mosaic of 126 images taken just after Cassini arrived at Saturn.', c: 'NASA / JPL / Space Science Institute' },
    { f: 'The_Day_the_Earth_Smiled_-_PIA17172.jpg', t: 'The Day the Earth Smiled', d: 'Cassini, July 19, 2013. Saturn blocks the Sun, lighting up the rings from behind. Earth is the tiny dot below the rings, and people on Earth were invited to wave.', c: 'NASA / JPL-Caltech / Space Science Institute' },
    { f: 'Saturn_eclipse.jpg', t: 'In Saturn\'s shadow', d: 'Cassini, September 2006. Hiding in Saturn\'s shadow with the Sun behind the planet, Cassini saw faint outer rings that are almost invisible from other angles.', c: 'NASA / JPL / Space Science Institute' },
    { f: 'Saturn_hexagonal_north_pole_feature.jpg', t: 'The hexagon', d: 'A six-sided jet stream circling Saturn\'s north pole. Each side is longer than Earth is wide. Voyager first spotted it in the 1980s and Cassini studied it up close.', c: 'NASA / JPL' },
    { f: 'Saturn_with_auroras.jpg', t: 'Saturn\'s auroras', d: 'Hubble Space Telescope, in ultraviolet. Like Earth, Saturn has northern and southern lights, caused by charged particles hitting its upper atmosphere.', c: 'NASA / ESA / Hubble' },
    { f: 'Titan_and_rings_PIA14909.jpg', t: 'Titan and the rings', d: 'Cassini, 2012. Titan, Saturn\'s biggest moon, in front of the rings seen almost edge-on.', c: 'NASA / JPL-Caltech / Space Science Institute' },
    { f: 'PIA17202_-_Approaching_Enceladus.jpg', t: 'Enceladus', d: 'Cassini. A small icy moon that sprays jets of water from an ocean under its crust. That spray feeds Saturn\'s E ring.', c: 'NASA / JPL-Caltech / Space Science Institute' },
    { f: 'Mimas_Cassini.jpg', t: 'Mimas', d: 'Cassini. Its giant Herschel crater is about 130 km wide, a third of the moon\'s own width.', c: 'NASA / JPL / Space Science Institute' },
    { f: 'Iapetus_as_seen_by_the_Cassini_probe_-_20071008.jpg', t: 'Iapetus', d: 'Cassini, 2007. The two-toned moon: one side is dark as coal, the other bright as snow.', c: 'NASA / JPL / Space Science Institute' },
    { f: 'Hyperion_true.jpg', t: 'Hyperion', d: 'Cassini, 2005. A spongy-looking moon that tumbles chaotically instead of spinning neatly.', c: 'NASA / JPL / Space Science Institute' },
  ];
  const INFO = {
    Planet: [
      ['Order', '6th planet from the Sun'],
      ['Distance from Sun', 'about 1.43 billion km (9.5 AU) on average'],
      ['Diameter', '120,536 km at the equator (9.4 Earths)'],
      ['Shape', 'The flattest planet: about 10% wider than it is tall, because it spins so fast'],
      ['Mass', '95 Earths'],
      ['Density', '0.69 g/cm³, less than water'],
      ['Gravity', '9.0 m/s² (about the same as Earth)'],
      ['Day', 'about 10 h 33 min'],
      ['Year', '29.4 Earth years'],
      ['Tilt', '26.7°, so it has seasons'],
      ['Made of', 'mostly hydrogen and helium, with no solid surface'],
      ['Temperature', 'about −140 °C at the cloud tops'],
      ['Winds', 'up to about 1,800 km/h near the equator'],
    ],
    Rings: [
      ['What', 'Billions of chunks of water ice and some rock, from dust grains to house-sized'],
      ['Size', 'They stretch up to about 282,000 km from the planet'],
      ['Thickness', 'Usually only about 10 meters thick'],
      ['Main rings', 'From inside out: D, C, B, A, F, G, E'],
      ['Cassini Division', 'The big dark gap between the B and A rings, about 4,800 km wide'],
      ['Shepherd moons', 'Tiny moons like Prometheus and Pandora keep the narrow F ring in shape'],
      ['Age', 'Scientists still argue whether the rings are young or as old as Saturn'],
      ['Edge-on', 'In March 2025 the rings lined up edge-on with Earth and almost vanished in telescopes. They are slowly opening up again'],
    ],
    Moons: [
      ['Count', '285 known moons (2026 count, the most of any planet, and still growing)'],
      ['Titan', 'The 2nd-biggest moon in the solar system, larger than Mercury. Thick hazy atmosphere, and lakes of liquid methane'],
      ['Enceladus', 'Shoots water jets from an underground ocean, one of the best places to look for life'],
      ['Mimas', 'Small moon with a huge crater that makes it look like a sci-fi space station'],
      ['Iapetus', 'Half black, half white, with a tall ridge around its middle'],
      ['Hyperion', 'Spongy-looking and tumbles chaotically'],
      ['Pan and Atlas', 'Tiny moons inside the rings, shaped like flying saucers or ravioli'],
      ['Phoebe', 'Orbits backwards, probably a captured object from far away'],
    ],
    Visits: [
      ['Pioneer 11', '1979, the first spacecraft to fly past Saturn'],
      ['Voyager 1', '1980 flyby, with a close look at Titan'],
      ['Voyager 2', '1981 flyby'],
      ['Cassini', 'Orbited Saturn from 2004 to 2017, 13 years. It ended on September 15, 2017 by diving into Saturn, so it could never crash into and contaminate Titan or Enceladus'],
      ['Huygens', 'Landed on Titan on January 14, 2005, the farthest landing ever from Earth'],
      ['Dragonfly', 'A drone-helicopter going to Titan. Planned launch 2028, arrival in the 2030s'],
    ],
    History: [
      ['Ancient times', 'Saturn is visible to the naked eye, so people have known it forever. It is named after the Roman god of farming'],
      ['1610', 'Galileo saw "ears" on Saturn through his small telescope. He didn\'t know they were rings'],
      ['1655', 'Christiaan Huygens worked out that Saturn has a ring, and discovered Titan'],
      ['1675', 'Giovanni Cassini found the gap now called the Cassini Division'],
      ['1980s', 'The Voyager probes found the hexagon and many ring details'],
    ],
  };

  function mount(root) {
    const el = (tag, attrs, ...kids) => {
      const e = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs || {})) { if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
      for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
      return e;
    };
    let idx = 0, photos = PHOTOS.slice();
    const big = el('img', { class: 'sa-big', alt: '' });
    const spinner = el('div', { class: 'sa-load' }, 'Loading...');
    const cap = el('div', { class: 'sa-cap' });
    const prev = el('button', { type: 'button', class: 'btn', 'aria-label': 'Previous photo', onclick: () => show(idx - 1) }, '◂');
    const next = el('button', { type: 'button', class: 'btn', 'aria-label': 'Next photo', onclick: () => show(idx + 1) }, '▸');
    const count = el('span', { class: 'sa-count' });
    const strip = el('div', { class: 'sa-strip', role: 'listbox', 'aria-label': 'Photos' });
    const viewer = el('div', { class: 'sa-viewer' }, el('div', { class: 'sa-stage sunken' }, big, spinner), el('div', { class: 'sa-bar' }, prev, count, next, cap), strip);
    const tabBar = el('div', { class: 'sa-tabs', role: 'tablist' });
    const pane = el('div', { class: 'sa-pane' });
    const side = el('aside', { class: 'sa-side' }, tabBar, pane);
    root.replaceChildren(el('div', { class: 'sa-main' }, viewer, side), el('div', { class: 'statusbar' }, el('span', {}, 'Photos: NASA (public domain), via Wikimedia Commons'), el('span', {}, 'Saturn Archive')));

    // thumbnails; any photo that fails to load quietly disappears
    const thumbs = photos.map((p, i) => {
      const im = el('img', { src: FILE(p.f, 200), alt: p.t, loading: 'lazy' });
      const b = el('button', { type: 'button', class: 'sa-th', role: 'option', title: p.t, onclick: () => show(photos.indexOf(p)) }, im);
      im.addEventListener('error', () => { b.remove(); photos = photos.filter(x => x !== p); if (photos.indexOf(cur) < 0 && photos.length) show(0); else show(photos.indexOf(cur)); });
      return b;
    });
    strip.replaceChildren(...thumbs);
    let cur = null;
    function show(i) {
      if (!photos.length) { cap.textContent = 'Couldn\'t load the photos. Check your connection.'; return; }
      idx = (i + photos.length) % photos.length; cur = photos[idx];
      spinner.hidden = false;
      big.onload = () => { spinner.hidden = true; };
      big.onerror = () => { spinner.textContent = 'This photo didn\'t load.'; };
      spinner.textContent = 'Loading...';
      big.src = FILE(cur.f, 1280); big.alt = cur.t;
      cap.replaceChildren(el('b', {}, cur.t), el('span', {}, cur.d), el('small', {}, 'Credit: ' + cur.c + ' · ', el('a', { href: PAGE(cur.f), target: '_blank', rel: 'noopener noreferrer' }, 'full size')));
      count.textContent = (idx + 1) + ' / ' + photos.length;
      strip.querySelectorAll('.sa-th').forEach(b => b.setAttribute('aria-selected', String(b.title === cur.t)));
      const sel = strip.querySelector('[aria-selected="true"]'); if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    root.addEventListener('keydown', e => { if (e.target.closest('input, select, textarea')) return; if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); } });

    const tabs = Object.keys(INFO);
    const tabBtns = tabs.map(t => el('button', { type: 'button', role: 'tab', onclick: () => showTab(t) }, t));
    tabBar.replaceChildren(...tabBtns);
    function showTab(t) {
      tabBtns.forEach(b => b.setAttribute('aria-selected', String(b.textContent === t)));
      pane.replaceChildren(el('h3', {}, t === 'Planet' ? 'Saturn' : t), el('dl', {}, INFO[t].flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])));
      pane.scrollTop = 0;
    }
    showTab('Planet'); show(0);
    return {};
  }
  window.SaturnArchive = { mount };
})();
