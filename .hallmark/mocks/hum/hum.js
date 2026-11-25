/* global document */
// Hum mock helpers: torn sheet edges from seeded value noise, and glyph plants grown from a score.
// Scripting off: sheets stay rounded, plants stay as their names and scores.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One torn edge: `n` points, value noise (coarse knots, eased) plus a fine jitter, in px.
function edge(rand, n, amp) {
  const knots = Array.from({ length: Math.ceil(n / 5) + 2 }, () => rand());
  return Array.from({ length: n + 1 }, (_, i) => {
    const k = i / 5, j = Math.floor(k), f = k - j, s = f * f * (3 - 2 * f);
    return (knots[j] * (1 - s) + knots[j + 1] * s) * amp + rand() * amp * 0.35;
  });
}

// Tears the named sides of the sheet; the fringe stands proud by `grow` px.
function polygon(sides, seed, grow) {
  const rand = rng(seed), n = 48, amp = 7, pts = [];
  const top = sides.includes('top') ? edge(rand, n, amp) : null;
  const bottom = sides.includes('bottom') ? edge(rand, n, amp) : null;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 100;
    pts.push(`${x}% ${top ? `${(top[i] - grow).toFixed(1)}px` : `${-grow}px`}`);
  }
  for (let i = n; i >= 0; i--) {
    const x = (i / n) * 100;
    pts.push(`${x}% calc(100% - ${bottom ? (bottom[i] - grow).toFixed(1) : -grow}px)`);
  }
  return `polygon(${pts.join(',')})`;
}

document.querySelectorAll('.sheet[data-tear]').forEach((sheet, i) => {
  const sides = sheet.dataset.tear.split(' ');
  const seed = Number(sheet.dataset.seed ?? 17 + i * 31);
  const fringe = document.createElement('i');
  const face = document.createElement('i');
  fringe.className = 'fringe';
  face.className = 'face';
  fringe.style.clipPath = polygon(sides, seed, 1.5);
  face.style.clipPath = polygon(sides, seed + 1, 0);
  sheet.prepend(fringe, face);
  sheet.classList.add('torn');
});

// A plant: a stem of stacked l's (1 to `max` segments by the score's share of the leader's),
// bracket leaves every second segment, the player's initial as the flower. A zero score is a seed.
function grow(plant, maxSegments) {
  const score = Number(plant.dataset.score);
  const top = Number(plant.closest('[data-top]')?.dataset.top ?? score);
  const segs = score <= 0 ? 0 : Math.max(1, Math.round((score / Math.max(top, 1)) * maxSegments));
  const art = document.createElement('span');
  art.setAttribute('aria-hidden', 'true');
  art.className = 'plant-art';
  if (segs === 0) {
    art.innerHTML = '<span class="seed">.</span>';
  } else {
    const head = `<span class="head" style="color: ${plant.dataset.colour}">${plant.dataset.head}</span>`;
    let stem = '';
    for (let s = 0; s < segs; s++) {
      const leaf = s % 2 === 1 ? `<span class="leaf ${s % 4 === 1 ? 'l' : 'r'}" style="bottom: calc(var(--seg) * ${segs - s - 1})">${s % 4 === 1 ? '(' : ')'}</span>` : '';
      stem += `<span>l</span>${leaf}`;
    }
    art.innerHTML = `${head}<span class="stem" style="position: relative">${stem}</span>`;
  }
  plant.prepend(art);
}
document.querySelectorAll('.plant[data-score]').forEach((p) => grow(p, Number(p.closest('[data-segs]')?.dataset.segs ?? 8)));

// Mirrors the code into the four tiles, uppercased; Join waits for four letters.
const code = document.getElementById('room-code');
if (code) {
  const tiles = code.parentElement.querySelectorAll('.tile');
  const join = code.form.querySelector('button[type="submit"]');
  code.addEventListener('input', () => {
    code.value = code.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
    tiles.forEach((tile, i) => { tile.textContent = code.value[i] ?? ''; });
    join.disabled = code.value.length < 4;
  });
}
