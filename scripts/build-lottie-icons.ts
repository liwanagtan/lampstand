// Writes the eight animated icons (Today, Bible, Plans, Screen, Search, Profile, Bookmark,
// Highlight) as Lottie JSON in public/lottie/icons, plus brand/motion/icons-preview.html with
// the same data inlined so it opens without a server. Run: npm run lottie-icons
//
// Each icon is 48 × 48 at 60 fps and plays once on select: frame 0 is the resting (inactive)
// look, the last frame is the active look; play it backwards to deselect. Colour layers:
//   ink   strokes only, carries class "ink" so the SVG renderer can recolour it with CSS
//         (e.g. .ink path { stroke: var(--ink) } for dark mode)
//   flame the gold; same in light and dark
// Shape layers only: no masks, mattes, images, effects or expressions.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(ROOT, 'public/lottie/icons');
const PREVIEW = join(ROOT, 'brand/motion/icons-preview.html');

const FPS = 60;
const SIZE = 48;
const STROKE = 3.4;

const INK = hex('#0A0F1C');
const FLAME = hex('#F2B33D');

type Vec = [number, number];
type Json = Record<string, unknown>;

// Easing pairs from the motion system: standard (0.2, 0, 0, 1) and enter (0.05, 0.7, 0.1, 1).
const STANDARD = { o: [0.2, 0], i: [0, 1] };
const ENTER = { o: [0.05, 0.7], i: [0.1, 1] };
type Ease = typeof STANDARD;

function hex(h: string): number[] {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1].map(
    (c) => Math.round(c * 1000) / 1000,
  );
}

// ---- properties -------------------------------------------------------------------------

const fixed = (k: unknown) => ({ a: 0, k });

// Keyframes: [frame, value] pairs; each segment eases with `ease` (the last value holds).
function anim(keys: [number, number[] | Json][], ease: Ease = STANDARD) {
  return {
    a: 1,
    k: keys.map(([t, v], idx) => {
      const s = Array.isArray(v) ? v : [v];
      const dims = Array.isArray(v) ? v.length : 1;
      const kf: Json = { t, s };
      if (idx < keys.length - 1) {
        kf.o = { x: Array(dims).fill(ease.o[0]), y: Array(dims).fill(ease.o[1]) };
        kf.i = { x: Array(dims).fill(ease.i[0]), y: Array(dims).fill(ease.i[1]) };
      }
      return kf;
    }),
  };
}

// ---- shapes -----------------------------------------------------------------------------

interface Bez {
  v: Vec[];
  i?: Vec[];
  o?: Vec[];
  c?: boolean;
}

function bez({ v, i, o, c = false }: Bez): Json {
  const zero = v.map((): Vec => [0, 0]);
  return { i: i ?? zero, o: o ?? zero, v, c };
}

const line = (...v: Vec[]) => bez({ v });
const poly = (...v: Vec[]) => bez({ v, c: true });

function circle(cx: number, cy: number, r: number): Json {
  // Starts at 12 o'clock and runs clockwise, so trim paths fill like a clock hand.
  const k = r * 0.5523;
  return bez({
    v: [
      [cx, cy - r],
      [cx + r, cy],
      [cx, cy + r],
      [cx - r, cy],
    ],
    i: [
      [-k, 0],
      [0, -k],
      [k, 0],
      [0, k],
    ],
    o: [
      [k, 0],
      [0, k],
      [-k, 0],
      [0, -k],
    ],
    c: true,
  });
}

function roundRect(x: number, y: number, w: number, h: number, r: number): Json {
  const k = r * 0.5523;
  return bez({
    v: [
      [x + r, y],
      [x + w - r, y],
      [x + w, y + r],
      [x + w, y + h - r],
      [x + w - r, y + h],
      [x + r, y + h],
      [x, y + h - r],
      [x, y + r],
    ],
    i: [
      [-k, 0],
      [0, 0],
      [0, -k],
      [0, 0],
      [k, 0],
      [0, 0],
      [0, k],
      [0, 0],
    ],
    o: [
      [0, 0],
      [k, 0],
      [0, 0],
      [0, k],
      [0, 0],
      [-k, 0],
      [0, 0],
      [0, -k],
    ],
    c: true,
  });
}

const path = (shape: Json | ReturnType<typeof anim>, nm = 'path'): Json => ({
  ty: 'sh',
  nm,
  ks: 'a' in shape && shape.a === 1 ? shape : fixed(shape),
});

const stroke = (color = INK, opacity: unknown = fixed(100)): Json => ({
  ty: 'st',
  nm: 'stroke',
  c: fixed(color),
  o: opacity,
  w: fixed(STROKE),
  lc: 2,
  lj: 2,
  ml: 4,
});

const fill = (color = FLAME, opacity: unknown = fixed(100)): Json => ({
  ty: 'fl',
  nm: 'fill',
  c: fixed(color),
  o: opacity,
  r: 1,
});

const trim = (end: unknown): Json => ({
  ty: 'tm',
  nm: 'trim',
  s: fixed(0),
  e: end,
  o: fixed(0),
  m: 1,
});

interface Tr {
  a?: Vec; // anchor (pivot) in icon coordinates
  p?: unknown; // position: fixed Vec or anim
  s?: unknown;
  r?: unknown;
  o?: unknown;
}

function group(nm: string, items: Json[], tr: Tr = {}): Json {
  const anchor = tr.a ?? [0, 0];
  const asProp = (v: unknown, dflt: unknown) =>
    v === undefined ? fixed(dflt) : (v as Json).a === 1 ? v : fixed(v);
  return {
    ty: 'gr',
    nm,
    it: [
      ...items,
      {
        ty: 'tr',
        p: asProp(tr.p, anchor),
        a: fixed(anchor),
        s: asProp(tr.s, [100, 100]),
        r: asProp(tr.r, 0),
        o: asProp(tr.o, 100),
        sk: fixed(0),
        sa: fixed(0),
      },
    ],
  };
}

// ---- layers and files -------------------------------------------------------------------

interface LayerTr {
  a: Vec;
  p?: unknown;
  r?: unknown;
}

function layer(
  nm: string,
  cls: string,
  shapes: Json[],
  op: number,
  ind: number,
  tr?: LayerTr,
): Json {
  const a = tr?.a ?? [0, 0];
  const p = tr?.p ?? [...a, 0];
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm,
    cl: cls,
    sr: 1,
    ks: {
      o: fixed(100),
      r: tr?.r ?? fixed(0),
      p: (p as Json).a === 1 ? p : fixed(p),
      a: fixed([...a, 0]),
      s: fixed([100, 100, 100]),
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

interface Icon {
  id: string;
  label: string;
  ms: number;
  ink: Json[];
  flame: Json[];
  // Extra ink layer drawn underneath the flame layer (e.g. a track the gold fills over).
  inkUnder?: Json[];
  // Whole-icon motion shared by every layer (pivot + animated position/rotation).
  tr?: LayerTr;
}

function lottie(icon: Icon): Json {
  const op = Math.round((icon.ms / 1000) * FPS);
  const layers = [
    layer('ink', 'ink', icon.ink, op, 1, icon.tr),
    layer('flame', 'flame', icon.flame, op, 2, icon.tr),
  ];
  if (icon.inkUnder) layers.push(layer('ink-track', 'ink', icon.inkUnder, op, 3, icon.tr));
  return {
    v: '5.7.4',
    fr: FPS,
    ip: 0,
    op,
    w: SIZE,
    h: SIZE,
    nm: `lampstand-icon-${icon.id}`,
    ddd: 0,
    assets: [],
    layers,
    markers: [],
  };
}

// Frames from milliseconds, so timings read like the motion system's table.
const f = (ms: number) => Math.round((ms / 1000) * FPS);

// ---- the icons --------------------------------------------------------------------------

function today(): Icon {
  // The sun rises from a low dome to a half disc, fills gold, then the rays arrive.
  const k = 9 * 0.5523;
  const dome = (closed: boolean) =>
    bez({
      v: [
        [17.5, 34],
        [24, 30],
        [30.5, 34],
      ],
      i: [
        [0, 0],
        [-3.6, 0],
        [0, -2.2],
      ],
      o: [
        [0, -2.2],
        [3.6, 0],
        [0, 0],
      ],
      c: closed,
    });
  const half = (closed: boolean) =>
    bez({
      v: [
        [15, 34],
        [24, 25],
        [33, 34],
      ],
      i: [
        [0, 0],
        [-k, 0],
        [0, -k],
      ],
      o: [
        [0, -k],
        [k, 0],
        [0, 0],
      ],
      c: closed,
    });
  const rise = (closed: boolean) =>
    anim(
      [
        [0, dome(closed)],
        [f(260), half(closed)],
      ],
      ENTER,
    );
  return {
    id: 'today',
    label: 'Today',
    ms: 400,
    ink: [
      group('horizon', [path(line([6, 34], [42, 34])), path(line([14, 40], [34, 40])), stroke()]),
      group('sun', [path(rise(false)), stroke()]),
      group(
        'rays',
        [
          path(line([24, 13], [24, 17])),
          path(line([11, 19], [13.5, 21.5])),
          path(line([37, 19], [34.5, 21.5])),
          path(line([5, 29], [9, 29])),
          path(line([43, 29], [39, 29])),
          stroke(),
        ],
        {
          a: [24, 34],
          s: anim([
            [f(130), [60, 60]],
            [f(400), [100, 100]],
          ]),
          o: anim([
            [f(130), [0]],
            [f(330), [100]],
          ]),
        },
      ),
    ],
    flame: [
      group('sun', [
        path(rise(true)),
        fill(
          FLAME,
          anim([
            [0, [0]],
            [f(240), [100]],
          ]),
        ),
      ]),
    ],
  };
}

function bible(): Icon {
  // A gold page turns over the spine and comes to rest on the left.
  const right = poly([42, 12], [24, 16], [24, 38], [42, 34]);
  const left = poly([6, 12], [24, 16], [24, 38], [6, 34]);
  const turn = anim(
    [
      [0, [100, 100]],
      [f(480), [-100, 100]],
    ],
    { o: [0.4, 0], i: [0.2, 1] },
  );
  return {
    id: 'bible',
    label: 'Bible',
    ms: 480,
    ink: [
      group('pages', [path(left), path(right), stroke()]),
      group('turning page', [path(right), stroke()], { a: [24, 25], s: turn }),
    ],
    flame: [
      group(
        'turning page',
        [
          path(right),
          fill(
            FLAME,
            anim([
              [0, [0]],
              [f(200), [100]],
            ]),
          ),
        ],
        { a: [24, 25], s: turn },
      ),
    ],
  };
}

function plans(): Icon {
  // Three items tick off in turn: the box fills gold, then the check draws.
  const rows = [8, 19, 30];
  const ink: Json[] = [
    group('lines', [
      path(line([21, 13], [42, 13])),
      path(line([21, 24], [38, 24])),
      path(line([21, 35], [40, 35])),
      stroke(),
    ]),
  ];
  const flame: Json[] = [];
  rows.forEach((y, n) => {
    const start = f(n * 120);
    ink.push(
      group(`box ${n + 1}`, [path(roundRect(6, y, 10, 10, 2.5)), stroke()]),
      group(`check ${n + 1}`, [
        path(line([8.5, y + 5], [10.5, y + 7], [14, y + 3])),
        stroke(),
        trim(
          anim([
            [start + f(60), [0]],
            [start + f(300), [100]],
          ]),
        ),
      ]),
    );
    flame.push(
      group(`box ${n + 1}`, [
        path(roundRect(6, y, 10, 10, 2.5)),
        fill(
          FLAME,
          anim([
            [start, [0]],
            [start + f(160), [100]],
          ]),
        ),
      ]),
    );
  });
  return { id: 'plans', label: 'Plans', ms: 600, ink, flame };
}

function screen(): Icon {
  // The lyric lines step up one place; the new current line arrives in gold.
  const up = (fromY: number, toY: number) =>
    anim([
      [0, [0, fromY]],
      [f(320), [0, toY]],
    ]);
  return {
    id: 'screen',
    label: 'Screen',
    ms: 320,
    ink: [
      group('display', [
        path(roundRect(6, 9, 36, 24, 3)),
        path(line([24, 33], [24, 39])),
        path(line([17, 39], [31, 39])),
        stroke(),
      ]),
      group('outgoing line', [path(line([13, 0], [35, 0])), stroke()], {
        p: up(16, 11),
        o: anim([
          [0, [100]],
          [f(200), [0]],
        ]),
      }),
      group('next line', [path(line([15, 0], [33, 0])), stroke()], { p: up(22, 16) }),
    ],
    flame: [
      group('current line', [path(line([14, 0], [34, 0])), stroke(FLAME)], {
        p: up(28, 22),
        o: anim([
          [0, [0]],
          [f(220), [100]],
        ]),
      }),
    ],
  };
}

function search(): Icon {
  // The magnifier tilts back, swings past and settles; a gold glint appears in the lens.
  return {
    id: 'search',
    label: 'Search',
    ms: 360,
    tr: {
      a: [21, 21],
      r: anim([
        [0, [0]],
        [f(120), [-14]],
        [f(240), [6]],
        [f(360), [0]],
      ]),
    },
    ink: [group('magnifier', [path(circle(21, 21, 12)), path(line([30, 30], [40, 40])), stroke()])],
    flame: [
      group('glint', [
        path(
          bez({
            v: [
              [14.5, 19],
              [19, 14.5],
            ],
            i: [
              [0, 0],
              [-2.6, 0.6],
            ],
            o: [
              [0.6, -2.6],
              [0, 0],
            ],
          }),
        ),
        stroke(
          FLAME,
          anim([
            [f(80), [0]],
            [f(240), [100]],
          ]),
        ),
      ]),
    ],
  };
}

function profile(): Icon {
  // The journey ring fills clockwise from the top. In the app, stop at the reader's progress:
  // playSegments([0, Math.round(progress * totalFrames)]).
  return {
    id: 'profile',
    label: 'Profile',
    ms: 700,
    ink: [
      group('person', [
        path(circle(24, 19, 5.5)),
        path(
          bez({
            v: [
              [14, 35],
              [24, 27],
              [34, 35],
            ],
            i: [
              [0, 0],
              [-5.5, 0],
              [0, -5.5],
            ],
            o: [
              [0, -5.5],
              [5.5, 0],
              [0, 0],
            ],
          }),
        ),
        stroke(),
      ]),
    ],
    flame: [
      group('ring', [
        path(circle(24, 24, 20)),
        stroke(FLAME),
        trim(
          anim([
            [0, [0]],
            [f(700), [100]],
          ]),
        ),
      ]),
    ],
    inkUnder: [group('track', [path(circle(24, 24, 20)), stroke(INK, fixed(15))])],
  };
}

function bookmark(): Icon {
  // The ribbon drops with one small overshoot and fills gold.
  const ribbon = poly([15, 6], [33, 6], [33, 42], [24, 35], [15, 42]);
  return {
    id: 'bookmark',
    label: 'Bookmark',
    ms: 240,
    tr: {
      a: [24, 24],
      p: anim(
        [
          [0, [24, 17, 0]],
          [f(150), [24, 25.5, 0]],
          [f(240), [24, 24, 0]],
        ],
        ENTER,
      ),
    },
    ink: [group('ribbon', [path(ribbon), stroke()])],
    flame: [
      group('ribbon', [
        path(ribbon),
        fill(
          FLAME,
          anim([
            [0, [0]],
            [f(150), [100]],
          ]),
        ),
      ]),
    ],
  };
}

function highlight(): Icon {
  // A gold marker sweeps left to right behind the middle line.
  return {
    id: 'highlight',
    label: 'Highlight',
    ms: 320,
    ink: [
      group('text', [
        path(line([8, 14], [40, 14])),
        path(line([8, 24], [34, 24])),
        path(line([8, 34], [38, 34])),
        stroke(),
      ]),
    ],
    flame: [
      group('marker', [path(roundRect(5, 19, 32, 10, 2)), fill(FLAME, fixed(70))], {
        a: [5, 24],
        s: anim([
          [0, [0, 100]],
          [f(320), [100, 100]],
        ]),
      }),
    ],
  };
}

// ---- write ------------------------------------------------------------------------------

const icons = [today(), bible(), plans(), screen(), search(), profile(), bookmark(), highlight()];

mkdirSync(OUT_DIR, { recursive: true });
const files = icons.map((icon) => {
  const data = lottie(icon);
  const json = JSON.stringify(data);
  writeFileSync(join(OUT_DIR, `${icon.id}.json`), json + '\n');
  console.log(`${icon.id}.json  ${icon.ms} ms  ${(json.length / 1024).toFixed(1)} KB`);
  return {
    id: icon.id,
    label: icon.label,
    ms: icon.ms,
    kb: +(json.length / 1024).toFixed(1),
    data,
  };
});

mkdirSync(join(ROOT, 'brand/motion'), { recursive: true });
writeFileSync(PREVIEW, previewHtml(files));
console.log(`preview: ${PREVIEW}`);

function previewHtml(
  list: { id: string; label: string; ms: number; kb: number; data: Json }[],
): string {
  return `<!doctype html>
<!-- Generated by scripts/build-lottie-icons.ts. Do not edit; run npm run lottie-icons. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lampstand Lottie icons</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap">
<script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_svg.min.js"></script>
<style>
:root{--ground:#F5F2EA;--tile:#FFFFFF;--text:#0A0F1C;--muted:#4B5161;--ink:#0A0F1C;--line:#D9D3C4}
:root[data-theme="dark"]{--ground:#0A0F1C;--tile:#161C2B;--text:#F5F2EA;--muted:#A9AEBB;--ink:#F5F2EA;--line:#2A3142}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--text);font-family:'Plus Jakarta Sans',system-ui,sans-serif}
main{max-width:1120px;margin:0 auto;padding:48px 16px 64px;display:flex;flex-direction:column;gap:28px}
h1{margin:0;font-size:clamp(30px,5vw,44px);font-weight:800;letter-spacing:-0.03em}
p{margin:0;color:var(--muted);line-height:1.55;max-width:640px}
.bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.bar button{min-height:44px;padding:0 18px;border-radius:999px;border:1px solid var(--line);background:var(--tile);color:var(--text);font:inherit;font-weight:600;cursor:pointer}
.bar button[aria-pressed="true"]{background:var(--text);color:var(--ground);border-color:var(--text)}
.bar .sep{width:1px;height:28px;background:var(--line);margin:0 6px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.card{background:var(--tile);border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:12px}
.stage{all:unset;cursor:pointer;height:150px;border-radius:14px;display:flex;align-items:center;justify-content:center}
.stage:focus-visible{outline:2px solid var(--text);outline-offset:2px}
.anim{width:var(--size,96px);height:var(--size,96px)}
.sizes{display:flex;gap:14px;align-items:center;justify-content:center;min-height:56px;border-top:1px solid var(--line);padding-top:12px}
.sizes button{all:unset;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px}
.meta{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.meta strong{font-size:16px}
.meta span{font-size:13px;color:var(--muted)}
.state{font-size:13px;color:var(--muted)}
input[type=range]{width:100%;accent-color:#F2B33D}
/* Recolour the ink layer from CSS: lottie-web's SVG renderer puts the layer's class on its group. */
.ink path{stroke:var(--ink)}
</style>
</head>
<body>
<main>
  <div style="display:flex;flex-direction:column;gap:12px">
    <h1>Lottie icons</h1>
    <p>Eight icons, 48 × 48 at 60 fps. Tap an icon to select it; tap again to play it backwards. Frame 0 is the resting look, the last frame is active. Dark mode recolours the <strong>ink</strong> layer from CSS; <strong>flame</strong> stays gold.</p>
  </div>
  <div class="bar" role="group" aria-label="Preview controls">
    <button type="button" id="theme" aria-pressed="false">Dark</button>
    <button type="button" id="loop" aria-pressed="false">Loop all</button>
    <button type="button" id="slow" aria-pressed="false">Slow × 0.25</button>
    <span class="sep" aria-hidden="true"></span>
    <button type="button" id="reset">Reset</button>
  </div>
  <div class="grid" id="grid"></div>
</main>
<script>
const ICONS = ${JSON.stringify(list)};
const grid = document.getElementById('grid');
const players = [];

for (const icon of ICONS) {
  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML =
    '<button type="button" class="stage" aria-pressed="false" aria-label="' + icon.label + '"><div class="anim"></div></button>' +
    '<div class="meta"><strong>' + icon.label + '</strong><span>' + icon.ms + ' ms · ' + icon.kb + ' KB</span></div>' +
    '<label class="state">Scrub <input type="range" min="0" max="' + (icon.data.op - 1) + '" value="0"></label>' +
    '<div class="sizes" aria-label="Sizes"></div>';
  grid.appendChild(card);

  const stage = card.querySelector('.stage');
  const main = lottie.loadAnimation({ container: card.querySelector('.anim'), renderer: 'svg', loop: false, autoplay: false, animationData: structuredClone(icon.data) });
  const minis = [24, 32, 48].map((px) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', icon.label + ' at ' + px + ' px');
    const box = document.createElement('div');
    box.style.width = box.style.height = px + 'px';
    b.appendChild(box);
    card.querySelector('.sizes').appendChild(b);
    const a = lottie.loadAnimation({ container: box, renderer: 'svg', loop: false, autoplay: false, animationData: structuredClone(icon.data) });
    b.addEventListener('click', () => toggle());
    return a;
  });
  const all = [main, ...minis];
  const scrub = card.querySelector('input');
  let on = false;

  function toggle() {
    on = !on;
    stage.setAttribute('aria-pressed', String(on));
    for (const a of all) { a.setDirection(on ? 1 : -1); a.play(); }
  }
  stage.addEventListener('click', toggle);
  main.addEventListener('enterFrame', () => { scrub.value = Math.round(main.currentFrame); });
  scrub.addEventListener('input', () => { for (const a of all) a.goToAndStop(+scrub.value, true); });
  players.push({ all, reset() { on = false; stage.setAttribute('aria-pressed', 'false'); for (const a of all) { a.loop = false; a.setDirection(1); a.goToAndStop(0, true); } } });
}

function press(btn) { const v = btn.getAttribute('aria-pressed') !== 'true'; btn.setAttribute('aria-pressed', String(v)); return v; }
document.getElementById('theme').addEventListener('click', (e) => { document.documentElement.dataset.theme = press(e.currentTarget) ? 'dark' : 'light'; });
document.getElementById('slow').addEventListener('click', (e) => { const s = press(e.currentTarget) ? 0.25 : 1; for (const p of players) for (const a of p.all) a.setSpeed(s); });
document.getElementById('loop').addEventListener('click', (e) => {
  const v = press(e.currentTarget);
  for (const p of players) { p.reset(); if (v) for (const a of p.all) { a.loop = true; a.play(); } }
});
document.getElementById('reset').addEventListener('click', () => { document.getElementById('loop').setAttribute('aria-pressed', 'false'); for (const p of players) p.reset(); });
</script>
</body>
</html>
`;
}
