const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/preloader.js'), 'utf8');

function setup({ reduced = false, gsap = null } = {}) {
  const listeners = new Map();
  const timers = new Map();
  const frames = new Map();
  let time = 0;
  let id = 0;
  let removals = 0;
  const classes = new Set();
  const overlay = {
    classList: { add() {} },
    remove() { removals++; },
    querySelector: selector => selector,
    querySelectorAll: () => Array.from({ length: 13 }, (_, index) => `glyph-${index}`),
    addEventListener: (name, fn) => listeners.set('overlay:' + name, fn)
  };
  const document = {
    documentElement: { classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name)
    } },
    querySelector: () => overlay,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name)
  };
  const window = {
    gsap, matchMedia: () => ({ matches: reduced }),
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name)
  };
  vm.runInNewContext(source, {
    document, window, performance: { now: () => time },
    setTimeout: (fn, delay) => { timers.set(++id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id)
  });
  return { window, listeners, timers, frames, overlay, classes, removals: () => removals, setTime: next => { time = next; } };
}

test('missing GSAP cannot leave preloader blocking the site beyond its deadline', async () => {
  const f = setup();
  assert.equal(f.classes.has('hero-pending'), true);
  const timer = [...f.timers.values()][0];
  assert.equal(timer.delay, 1550);
  timer.fn();
  await f.window.STPreloader.ready;
  assert.equal(f.removals(), 1);
  assert.equal(f.frames.size, 0);
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.has('keydown'), false);
  assert.equal(f.classes.has('hero-pending'), false);
  assert.equal(f.classes.has('hero-fallback'), true);
  assert.equal(f.window.STPreloader.finished, true);
});

test('reduced motion removes the opening immediately', async () => {
  const f = setup({ reduced: true });
  await f.window.STPreloader.ready;
  assert.equal(f.removals(), 1);
  assert.equal(f.timers.size, 0);
});

test('keyboard users and page navigation can dismiss without waiting', async () => {
  for (const event of ['Tab', 'Escape', 'pagehide']) {
    const f = setup();
    if (event === 'pagehide') f.listeners.get(event)();
    else f.listeners.get('keydown')({ key: event });
    await f.window.STPreloader.ready;
    assert.equal(f.removals(), 1);
  }
});

test('slow GSAP does not restart the animation or extend the deadline', () => {
  const f = setup();
  f.setTime(400);
  f.window.gsap = { timeline() { throw new Error('Should stay on CSS fallback'); } };
  [...f.frames.values()][0]();
  assert.equal([...f.timers.values()][0].delay, 1550);
  assert.equal(f.removals(), 0);
});

test('GSAP draws vector letters individually and releases the page at 1.48s', async () => {
  let complete;
  let end = 0;
  let killed = false;
  let animatedLetters = 0;
  const timeline = {
    fromTo(target, from, to, at) {
      if (Array.isArray(target)) {
        animatedLetters = target.length;
        assert.equal(from.strokeDashoffset, 1);
        assert.equal(to.strokeDashoffset, 0);
      }
      end = Math.max(end, at + to.duration + (Array.isArray(target) ? (target.length - 1) * (to.stagger || 0) : 0));
      return this;
    },
    to(target, to, at) { end = Math.max(end, at + to.duration); return this; },
    play() {}, kill() { killed = true; }
  };
  const f = setup({ gsap: { timeline(options) { complete = options.onComplete; return timeline; } } });
  assert.equal(end, 1.48);
  assert.equal(animatedLetters, 13);
  complete(); complete();
  await f.window.STPreloader.ready;
  assert.equal(f.removals(), 1);
  assert.equal(killed, true);
});

test('animation errors fail open instead of hiding the page', async () => {
  const f = setup({ gsap: { timeline() { throw new Error('Animation failed'); } } });
  await f.window.STPreloader.ready;
  assert.equal(f.removals(), 1);
});
