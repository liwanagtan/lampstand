/* global gsap */
// Lampstand Scene — sermon poster timeline.
// 0–2 s: entrance. 2–38 s: a seamless 36 s loop. Every ambient layer's period divides 36 s, so the
// frame at 38 s equals the frame at 2 s and the player can loop [2, 38) without a seam.
(function () {
  'use strict';

  var ENTER = 2;
  var LOOP = 36;
  var END = ENTER + LOOP;

  var $ = function (id) {
    return document.getElementById(id);
  };
  var stage = $('stage');

  // Deterministic randomness so every render of the poster is identical.
  var seed = 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function between(a, b) {
    return a + (b - a) * rand();
  }

  // Dust motes, weighted toward the right two-thirds where the light is.
  var motesLayer = $('motes');
  var motes = [];
  for (var i = 0; i < 26; i++) {
    var m = document.createElement('span');
    m.className = 'mote';
    var size = between(3, 9);
    m.style.setProperty('--s', size.toFixed(1) + 'px');
    m.style.setProperty('--b', (size > 6 ? 1.4 : 0.5).toFixed(1) + 'px');
    m.style.left = (rand() < 0.8 ? between(860, 1820) : between(140, 860)).toFixed(0) + 'px';
    m.style.top = between(380, 1060).toFixed(0) + 'px';
    motesLayer.appendChild(m);
    motes.push({
      el: m,
      period: [12, 18, 36][Math.floor(rand() * 3)],
      phase: rand(),
      rise: between(240, 520),
      drift: between(-50, 50),
      peak: between(0.2, 0.65),
    });
  }

  var tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

  /** Adds one periodic motion covering [ENTER, END), starting `phase` of the way into its cycle. */
  function loopCycle(build, period, phase) {
    var child = gsap.timeline({ paused: true });
    build(child);
    var t = ENTER;
    var c = (phase * period) % period;
    while (t < END - 1e-6) {
      var seg = Math.min(period - c, END - t);
      tl.add(
        child.tweenFromTo(c, c + seg, { duration: seg, ease: 'none', immediateRender: false }),
        t,
      );
      t += seg;
      c = 0;
    }
  }

  // ---- Entrance (0–2 s) ----
  tl.fromTo('#bg', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0);
  tl.fromTo('#grade', { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0);
  tl.fromTo(
    '#light-orb',
    { opacity: 0, x: 1450, y: 300 },
    { opacity: 0.9, duration: 1.4, ease: 'sine.out' },
    0.2,
  );
  tl.fromTo(
    ['.corner', '#grid', '#leak'],
    { opacity: 0 },
    { opacity: 1, duration: 1, ease: 'sine.out' },
    0.4,
  );
  tl.fromTo('#topline', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 0.35);
  tl.fromTo(
    '#title-wrap',
    { opacity: 0, y: 40, clipPath: 'inset(0% 0% 100% 0%)' },
    { opacity: 1, y: 0, clipPath: 'inset(-12% -2% -12% -2%)', duration: 0.95, ease: 'expo.out' },
    0.55,
  );
  tl.fromTo('#rule', { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 1.05);
  tl.fromTo('#verse', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.65 }, 1.25);
  tl.fromTo('#footer', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 1.5);

  // ---- Ambient loops (2–38 s) ----
  // 1 · Background: slow push-in and drift, there and back (36 s).
  tl.fromTo(
    '#bg',
    { scale: 1, x: 0, y: 0 },
    { scale: 1.08, x: -36, y: -14, duration: LOOP / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 },
    ENTER,
  );

  // 2 · Light: a soft glow travelling across the frame (18 s), breathing as it goes.
  tl.to(
    '#light-orb',
    {
      keyframes: [
        { x: 1240, y: 600, opacity: 0.75, duration: 4.5, ease: 'sine.inOut' },
        { x: 1580, y: 790, opacity: 0.95, duration: 4.5, ease: 'sine.inOut' },
        { x: 1740, y: 430, opacity: 0.7, duration: 4.5, ease: 'sine.inOut' },
        { x: 1450, y: 300, opacity: 0.9, duration: 4.5, ease: 'sine.inOut' },
      ],
      repeat: 1,
    },
    ENTER,
  );

  // 3 · Dust motes: rise, glow and fade, each on its own period and phase.
  motes.forEach(function (m) {
    loopCycle(
      function (child) {
        child.fromTo(
          m.el,
          { y: 0, x: 0 },
          { y: -m.rise, x: m.drift, duration: m.period, ease: 'none' },
          0,
        );
        child.fromTo(
          m.el,
          { opacity: 0 },
          { opacity: m.peak, duration: m.period * 0.2, ease: 'sine.out' },
          0,
        );
        child.to(m.el, { opacity: 0, duration: m.period * 0.35, ease: 'sine.in' }, m.period * 0.65);
      },
      m.period,
      m.phase,
    );
  });

  // 4 · Grain: shifts every frame-ish in 1 s cycles.
  var grainKeys = [];
  for (var g = 0; g < 8; g++)
    grainKeys.push({ x: between(-90, 90), y: between(-90, 90), duration: 0.125, ease: 'steps(1)' });
  tl.to('#grain', { keyframes: grainKeys, repeat: LOOP - 1 }, ENTER);

  // 5 · Gold rule: a thin shimmer of light sweeps along it every 9 s.
  tl.fromTo(
    '#rule-shine',
    { x: -70 },
    { x: 160, duration: 1.2, ease: 'power2.inOut', repeat: 3, repeatDelay: 7.8 },
    ENTER + 0.6,
  );

  // 6 · Lamp mark: the flame breathes (4 s).
  tl.fromTo(
    '#flame',
    { scale: 0.96, opacity: 0.8 },
    { scale: 1.04, opacity: 1, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: 17 },
    ENTER,
  );

  // 7 · Title: a faint light sweep, then a long rest (12 s).
  tl.fromTo(
    '#title-sheen',
    { backgroundPosition: '150% 0' },
    {
      backgroundPosition: '-50% 0',
      duration: 2.4,
      ease: 'sine.inOut',
      repeat: 2,
      repeatDelay: 9.6,
    },
    ENTER + 1.5,
  );

  tl.set({}, {}, END);
  window.__timelines = window.__timelines || {};
  window.__timelines.sermon = tl;

  // ---- Content (runtime data, written as plain text) ----
  function setText(id, value) {
    var el = $(id);
    var text = typeof value === 'string' ? value.trim() : '';
    el.textContent = text;
    el.classList.toggle('hidden', !text);
    return text;
  }

  function apply(data) {
    data = data || {};
    var template =
      ['classic', 'modern', 'warm'].indexOf(data.template) >= 0 ? data.template : 'classic';
    stage.setAttribute('data-template', template);
    var title = setText('title', data.title || 'Sermon');
    $('title-sheen').textContent = title;
    var long = title.length > 34;
    $('title').classList.toggle('long', long);
    $('title-sheen').classList.toggle('long', long);
    setText('series', data.series);
    setText('date', data.date);
    setText('speaker', data.speaker);
    var ref = setText('ref', data.ref);
    var excerpt = setText('excerpt', data.excerpt ? '“' + data.excerpt + '”' : '');
    $('verse').classList.toggle('hidden', !ref && !excerpt);
    $('rule').classList.toggle('hidden', !ref && !excerpt);
    var photo = $('bg-photo');
    if (typeof data.image === 'string' && /^(blob:|\/|\.\.?\/)/.test(data.image)) {
      photo.src = data.image;
      stage.classList.add('has-photo');
    } else {
      photo.removeAttribute('src');
      stage.classList.remove('has-photo');
    }
  }

  // Sample content for previewing this file on its own (Studio, or opened directly).
  apply({
    template: 'classic',
    title: 'A Lamp in the Dark',
    series: 'The Living Word · Part 1',
    date: 'Sun · Oct 18',
    speaker: 'Pastor Daniel Cruz',
    ref: 'Psalm 119:105',
    excerpt: 'Thy word is a lamp unto my feet, and a light unto my path.',
  });

  document.addEventListener('DOMContentLoaded', function () {
    var hf = window.__hyperframes;
    if (hf && typeof hf.registerRuntimeDataHandler === 'function') {
      hf.registerRuntimeDataHandler('sermon', function (payload) {
        apply(payload);
      });
    }
  });
})();
