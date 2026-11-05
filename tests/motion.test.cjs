const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/animations.js'), 'utf8');

test('audience cards rise in sequence with pinned scroll on phones, tablets and desktop', () => {
  const block = source.slice(source.indexOf('  const createAudienceScrollScene ='), source.indexOf('  const createParallax ='));
  for (const width of [360, 390, 520, 768, 1440]) {
    const nodes = new Map();
    const one = selector => {
      if (!nodes.has(selector)) nodes.set(selector, { offsetWidth: width - 40, offsetLeft: 0 });
      return nodes.get(selector);
    };
    const floatTweens = [];
    const entries = [];
    let config, disconnected = false, killed = false;
    const timeline = {
      fromTo(target, from, to, at) { entries.push({ target, from, to, at }); return this; },
      to() { return this; }, kill() { killed = true; }, scrollTrigger: { kill() {} }
    };
    const cards = Array.from({ length: 6 }, () => ({}));
    const context = {
      one, all: selector => selector === '.audience-motion-card' ? cards : [],
      window: { innerWidth: width, innerHeight: 800, matchMedia: () => ({ matches: width <= 520 }) },
      queueMotionRefresh() {},
      IntersectionObserver: class {
        observe() {} disconnect() { disconnected = true; }
      },
      gsap: {
        set() {}, timeline: options => { config = options.scrollTrigger; return timeline; },
        to: () => {
          const tween = { paused: true, play() { this.paused = false; }, pause() { this.paused = true; }, kill() {} };
          floatTweens.push(tween); return tween;
        }
      }
    };
    vm.createContext(context);
    vm.runInContext(block + '\nthis.cleanup = createAudienceScrollScene();', context);
    assert.equal(typeof context.cleanup, 'function', `Scene missing at ${width}px`);
    assert.equal(config.pin, true);
    assert.equal(config.pinSpacing, true);
    assert.ok(config.scrub > 0);
    assert.equal(config.end(), width <= 900 ? '+=1360' : '+=2240');
    const names = ['slogan', 'event', 'selection', 'payment', 'ticket', 'success'];
    let previousStart = -1;
    for (const name of names) {
      const target = nodes.get(`.audience-${name}`);
      const movement = entries.find(entry => entry.target === target && 'y' in entry.from);
      const visibility = entries.find(entry => entry.target === target && 'autoAlpha' in entry.from);
      assert.ok(movement.from.y > 0, `${name} must rise at ${width}px`);
      assert.equal(movement.to.y, 0);
      assert.ok(movement.at > previousStart);
      assert.equal(visibility.from.autoAlpha, 0);
      assert.equal(visibility.to.autoAlpha, 1);
      previousStart = movement.at;
    }
    config.onEnter();
    assert.ok(floatTweens.every(tween => !tween.paused));
    config.onLeave();
    assert.ok(floatTweens.every(tween => tween.paused));
    context.cleanup();
    assert.ok(disconnected && killed);
  }
});

test('hero waits for preloader, boots once and does not replay when breakpoints rebuild scenes', async () => {
  let finish;
  const preloader = { finished: false, ready: new Promise(resolve => { finish = resolve; }) };
  const callbacks = [];
  const calls = [];
  const timeline = { play: position => calls.push(['play', position]) };
  const context = {
    media: null, signal: { aborted: false }, AbortController,
    gsap: { matchMedia: () => ({ add: (query, fn) => {
      if (typeof query === 'object') { callbacks.push(fn); fn({ conditions: { motion: true, wide: true } }); }
    } }) },
    window: { STPreloader: preloader, addEventListener() {} },
    document: { documentElement: { classList: { add: name => calls.push(['class', name]) } } },
    splits: [], accessibleCopies: [],
    createHeroTimeline: options => { calls.push(['hero', options.paused]); return timeline; },
    createSectionMotionAbove() {}, createInteractions() {}, createMarquee() {},
    createAudienceScrollScene() {}, createSectionMotionBelow() {}, createParallax() {},
    ScrollTrigger: { sort() {} }, queueMotionRefresh() {}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const boot ='), source.indexOf('  const destroy =')) + '\nthis.boot = boot;', context);
  context.boot(); context.boot();
  assert.deepEqual(calls, [['hero', true], ['class', 'hero-motion-ready']]);
  preloader.finished = true;
  finish(); await preloader.ready;
  assert.deepEqual(calls.at(-1), ['play', 0]);
  callbacks[0]({ conditions: { motion: true, wide: false } });
  assert.equal(calls.filter(([type]) => type === 'hero').length, 1);
  assert.equal(calls.filter(([type]) => type === 'play').length, 1);
});

test('marquee recalculates distance on refresh, preserves progress and ignores touch hover', () => {
  let width = 900;
  let progress = .37;
  let paused = true;
  let invalidations = 0;
  let refresh;
  let restored = false;
  const listeners = new Map();
  const logoImage = { replaceWith() {} };
  const logos = { querySelector: () => logoImage,
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const tween = {
    play() { paused = false; }, pause() { paused = true; }, kill() {},
    progress(value) { if (value === undefined) return progress; progress = value; return this; },
    invalidate() { invalidations++; return this; }, duration() { return this; }
  };
  const document = {
    hidden: false,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, append() {},
      getBoundingClientRect: () => ({ width }), replaceWith: () => { restored = true; } }),
    addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name)
  };
  let to;
  const context = {
    document, one: selector => selector === '.logos-marquee' ? logos : null,
    ScrollTrigger: { create: () => ({ isActive: true, kill() {} }),
      addEventListener: (name, fn) => { refresh = fn; }, removeEventListener: () => { refresh = null; } },
    gsap: { fromTo: (target, from, vars) => { to = vars; return tween; } }
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  const createMarquee ='), source.indexOf('  /* Seções ANTES')) + '\nthis.cleanup = createMarquee();', context);
  assert.equal('invalidateOnRefresh' in to, false);
  assert.equal(to.x(), -900);
  width = 1400; refresh();
  assert.equal(to.x(), -1400);
  assert.equal(progress, .37);
  assert.equal(invalidations, 1);
  assert.equal(paused, false);
  listeners.get('pointerenter')({ pointerType: 'touch' });
  assert.equal(paused, false);
  listeners.get('pointerenter')({ pointerType: 'mouse' });
  assert.equal(paused, true);
  listeners.get('pointerleave')();
  document.hidden = true;
  listeners.get('visibilitychange')();
  assert.equal(paused, true);
  context.cleanup();
  assert.equal(restored, true);
  assert.equal(refresh, null);
  assert.equal(listeners.size, 0);
});
