const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ reduced = false, touch = false, native = false, failAnimationAt = -1, decode = false, deviceMemory } = {}) {
  let id = 0, time = 1, observer, reads = 0;
  const animations = [], elements = [], queries = new Map();
  class Element {
    constructor() {
      this.dataset = {}; this.style = { setProperty() {} }; this.listeners = {}; this.children = [];
      elements.push(this);
      if (decode) this.decode = () => Promise.resolve();
      if (native) this.animate = (keyframes, options) => {
        if (animations.length === failAnimationAt) throw new Error('Animation unavailable');
        const animation = { element: this, keyframes, options, startTime: time, cancelled: false,
          get currentTime() { return this.cancelled ? null : time - this.startTime; },
          cancel() { this.cancelled = true; }
        };
        animations.push(animation);
        return animation;
      };
    }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    emit(name, event = {}) { this.listeners[name]?.({ type: name, ...event }); }
    setAttribute() {}
    appendChild(child) { this.children.push(child); }
    getBoundingClientRect() { reads++; return { width: 900, height: 500, left: 0, top: 0 }; }
    setPointerCapture(id) { this.capture = id; }
    hasPointerCapture(id) { return this.capture === id; }
    releasePointerCapture() { this.capture = null; }
  }
  const root = new Element();
  const nodes = new Map();
  root.querySelector = name => { if (!nodes.has(name)) nodes.set(name, new Element()); return nodes.get(name); };
  const document = new Element();
  document.hidden = false;
  document.timeline = { get currentTime() { return time; } };
  document.querySelectorAll = () => [root];
  document.createElement = () => new Element();
  const window = new Element();
  window.matchMedia = query => {
    const media = new Element();
    media.matches = query.includes('reduced-motion') ? reduced : touch;
    queries.set(query, media);
    return media;
  };
  const frames = new Map(), timers = new Map();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/circular-carousel.js'), 'utf8'), {
    document, window, performance: { now: () => time }, navigator: deviceMemory ? { deviceMemory } : undefined,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id),
    ResizeObserver: class { observe() {} },
    IntersectionObserver: class { constructor(fn) { observer = fn; } observe() {} }
  });
  return { root, window, document, frames, animations, elements, queries, nodes, reads: () => reads,
    visible: value => observer([{ isIntersecting: value }]),
    step: (elapsed = 17) => { time += elapsed; const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }
  };
}

test('carousel renders only near viewport and pauses/resumes across background and page restore', () => {
  const f = fixture();
  assert.equal(f.frames.size, 0);
  assert.ok('ready' in f.root.dataset);
  f.visible(true); f.step();
  assert.equal(f.frames.size, 1);
  f.document.hidden = true;
  f.document.emit('visibilitychange');
  assert.equal(f.frames.size, 0);
  f.window.emit('pageshow');
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.document.emit('visibilitychange');
  assert.equal(f.frames.size, 1);
  f.window.emit('pagehide');
  assert.equal(f.frames.size, 0);
  f.window.emit('pageshow');
  assert.equal(f.frames.size, 1);
  f.visible(false);
  assert.equal(f.frames.size, 0);
});

function enterNativeCruise(f) {
  f.visible(true);
  for (let frame = 0; frame < 700 && !f.animations.length; frame++) f.step();
  assert.equal(f.animations.length, 23, 'one rotation plus shading on the original 22 faces');
  assert.equal(f.frames.size, 0, 'steady rotation must not schedule JS frames');
}

test('touch autoplay uses native rotation with the same speed, cards and lightweight image sources', () => {
  const f = fixture({ touch: true, native: true });
  enterNativeCruise(f);
  const rotation = f.animations[0];
  assert.equal(rotation.options.duration, 360 / 14 * 1000);
  assert.equal(rotation.options.iterations, Infinity);
  const from = Number(rotation.keyframes[0].transform.match(/rotateY\((.*)deg/)[1]);
  const to = Number(rotation.keyframes[1].transform.match(/rotateY\((.*)deg/)[1]);
  assert.equal(from - to, 360);
  const images = f.elements.filter(element => element.className === 'circular-carousel__photo');
  assert.equal(images.length, 22);
  assert.equal(new Set(images.map(image => image.src)).size, 11);
  assert.ok(images.every(image => /^ASSETS\/figma\/carousel\/\d+-560\.webp$/.test(image.src)), 'touch usa os WebP de 560px');
  f.step(1000);
  assert.equal(f.frames.size, 0);
  assert.equal(f.animations.length, 23);
});

test('touch interrupts native rotation at its displayed angle and dragging performs no layout reads', () => {
  const f = fixture({ touch: true, native: true });
  enterNativeCruise(f);
  f.step(1100);
  const rotation = f.animations[0];
  const initial = Number(rotation.keyframes[0].transform.match(/rotateY\((.*)deg/)[1]);
  const expected = initial - rotation.currentTime * 14 / 1000;
  const pointer = { pointerType: 'touch', pointerId: 1, clientX: 450, clientY: 250 };
  const reads = f.reads();
  f.root.emit('pointerdown', pointer);
  assert.ok(f.animations.every(animation => animation.cancelled));
  const actual = Number(f.nodes.get('.circular-carousel__ring').style.transform.match(/rotateY\((.*)deg/)[1]);
  assert.ok(Math.abs(actual - expected) < .000001);
  for (let i = 1; i <= 20; i++) f.root.emit('pointermove', { ...pointer, clientX: 450 + i });
  f.step();
  assert.equal(f.reads(), reads);
  assert.notEqual(f.nodes.get('.circular-carousel__ring').style.transform, `rotateY(${actual}deg)`);
  f.root.emit('pointercancel', pointer);
  assert.ok(!('dragging' in f.root.dataset));
});

test('native rotation stops offscreen, resumes, and obeys reduced motion changes', () => {
  const f = fixture({ touch: true, native: true });
  enterNativeCruise(f);
  f.visible(false);
  assert.ok(f.animations.every(animation => animation.cancelled));
  assert.equal(f.frames.size, 0);
  f.visible(true); f.step();
  assert.equal(f.animations.filter(animation => !animation.cancelled).length, 23);
  f.document.hidden = true;
  f.document.emit('visibilitychange');
  assert.ok(f.animations.every(animation => animation.cancelled));
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.document.emit('visibilitychange'); f.step();
  const media = f.queries.get('(prefers-reduced-motion: reduce)');
  media.matches = true; media.emit('change');
  f.step();
  assert.ok(f.animations.every(animation => animation.cancelled));
  assert.equal(f.frames.size, 0);
});

test('older browsers and partial native animation failures retain the JavaScript carousel', () => {
  for (const native of [false, true]) {
    const f = fixture({ touch: true, native, failAnimationAt: 4 });
    f.visible(true);
    for (let frame = 0; frame < 700; frame++) f.step();
    assert.equal(f.frames.size, 1);
    const before = f.nodes.get('.circular-carousel__ring').style.transform;
    f.step();
    assert.notEqual(f.nodes.get('.circular-carousel__ring').style.transform, before);
    assert.ok(f.animations.every(animation => animation.cancelled));
    assert.equal(f.animations.length, native ? 4 : 0);
  }
});

test('a settled carousel wakes on pointer movement instead of losing its interactive effect', () => {
  const f = fixture({ reduced: true });
  f.visible(true); f.step();
  assert.equal(f.frames.size, 0);
  f.root.emit('pointerenter', { pointerType: 'mouse', clientX: 450, clientY: 250 });
  f.step();
  assert.equal(f.frames.size, 0);
  f.root.emit('pointermove', { pointerType: 'mouse', clientX: 650, clientY: 250 });
  assert.equal(f.frames.size, 1);
  f.step();
  assert.equal(f.frames.size, 1);
});

test('textures are requested only when the section approaches, desktop gets the 720px WebP, and the scene is released after decode', async () => {
  const f = fixture({ decode: true });
  const images = () => f.elements.filter(element => element.className === 'circular-carousel__photo');
  assert.equal(images().length, 22);
  assert.ok(images().every(image => !image.src), 'nenhuma textura antes de a secao se aproximar');
  assert.ok(!('loaded' in f.root.dataset));
  f.visible(true);
  assert.ok(images().every(image => /^ASSETS\/figma\/carousel\/\d+-720\.webp$/.test(image.src)));
  assert.ok(images().every(image => image.loading !== 'lazy'), 'lazy nativo atrasava o decode durante o giro');
  await new Promise(resolve => setImmediate(resolve));
  assert.ok('loaded' in f.root.dataset);
});

test('low-memory devices switch to the lite rendering mode', () => {
  assert.ok('lite' in fixture({ deviceMemory: 2 }).root.dataset);
  assert.ok(!('lite' in fixture({ deviceMemory: 8 }).root.dataset));
});
