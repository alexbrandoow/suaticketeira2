const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
class Element {
  constructor() {
    this.listeners = {};
    this.attributes = {};
    this.dataset = {};
    this.nodes = new Map();
    this.hidden = true;
    this.checked = false;
    this.value = '80';
    this.classes = new Set();
    this.classList = {
      contains: name => this.classes.has(name),
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      toggle: (name, force = !this.classes.has(name)) => {
        force ? this.classes.add(name) : this.classes.delete(name);
        return force;
      }
    };
  }
  addEventListener(name, callback) { (this.listeners[name] ||= []).push(callback); }
  emit(name, event = {}) { for (const callback of this.listeners[name] || []) callback(event); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? null; }
  querySelector(selector) {
    if (!this.nodes.has(selector)) this.nodes.set(selector, new Element());
    return this.nodes.get(selector);
  }
  querySelectorAll() { return []; }
  appendChild() {}
  focus() {}
}

function mediaFixture({ blocked = false, mobile = false } = {}) {
  const document = new Element();
  document.hidden = false;
  const section = document.querySelector('[data-video-showcase]');
  const video = section.querySelector('.showcase-video');
  const html = fs.readFileSync(path.join(root, 'index.htm'), 'utf8');
  video.dataset.srcDesktop = html.match(/data-src-desktop="([^"]+)"/)[1];
  video.dataset.srcMobile = html.match(/data-src-mobile="([^"]+)"/)[1];
  Object.assign(video, { paused: true, muted: true, volume: .8, duration: 60, currentTime: 0 });
  video.calls = [];
  video.blocked = blocked;
  video.load = () => {};
  video.pause = () => { video.paused = true; video.emit('pause'); };
  video.play = () => {
    video.calls.push({ muted: video.muted });
    if (video.blocked && !video.muted) return Promise.reject({ name: 'NotAllowedError' });
    video.paused = false;
    video.emit('play');
    return Promise.resolve();
  };
  let observe;
  const queries = [];
  const window = new Element();
  window.matchMedia = query => {
    const media = new Element();
    media.matches = mobile;
    media.query = query;
    queries.push(media);
    return media;
  };
  const source = fs.readFileSync(path.join(root, 'js/main.js'), 'utf8');
  const block = source.slice(source.indexOf('  const videoSection ='), source.indexOf('  const faqItems ='));
  vm.runInNewContext(block, { document, window, IntersectionObserver: class {
    constructor(callback) { observe = callback; }
    observe() {}
    disconnect() {}
  } });
  return { video, section, document, window, queries,
    visible: (ratio = .8) => observe([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]),
    control: name => section.querySelector(name)
  };
}

test('mobile portrait starts the correct video with sound and supports mute through its icon', async () => {
  const f = mediaFixture({ mobile: true });
  assert.equal(f.video.getAttribute('src'), f.video.dataset.srcMobile);
  f.visible(); await tick();
  assert.equal(f.video.muted, false);
  f.video.emit('click');
  assert.equal(f.section.classList.contains('is-controls-visible'), true);
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.muted, true);
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.muted, false);
});

test('background tabs pause video; restoring the page respects explicit pause and mute', async () => {
  const f = mediaFixture();
  f.visible(); await tick();
  f.document.hidden = true;
  f.document.emit('visibilitychange');
  assert.equal(f.video.paused, true);
  assert.equal(f.video.muted, true);
  const calls = f.video.calls.length;
  f.window.emit('pageshow'); await tick();
  assert.equal(f.video.calls.length, calls);
  f.document.hidden = false;
  f.document.emit('visibilitychange'); await tick();
  assert.equal(f.video.paused, false);
  f.control('.video-sound').emit('click'); await tick();
  f.window.emit('pagehide');
  f.window.emit('pageshow'); await tick();
  assert.equal(f.video.muted, true);
  f.control('.video-toggle').emit('click');
  f.window.emit('pagehide');
  f.window.emit('pageshow'); await tick();
  assert.equal(f.video.paused, true);
});

test('mobile retries blocked audio on a subsequent touch without an extra sound button', async () => {
  const f = mediaFixture({ mobile: true, blocked: true });
  f.visible(); await tick();
  assert.equal(f.video.muted, true);
  f.video.blocked = false;
  f.document.emit('touchend', { target: { closest: () => null } }); await tick();
  assert.equal(f.video.muted, false);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'index.htm'), 'utf8'), /video-enable-sound/);
});

test('starts with sound only on entry, icon toggles mute and preserves volume across re-entry', async () => {
  const f = mediaFixture();
  assert.equal(f.video.calls.length, 0);
  f.visible(); await tick();
  assert.equal(f.video.muted, false);
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.muted, true);
  assert.equal(f.video.volume, .8);
  f.visible(0); f.visible(); await tick();
  assert.equal(f.video.muted, true);
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.muted, false);
  assert.equal(f.video.volume, .8);
});

test('blocked audible autoplay has no extra button; normal volume icon restores sound', async () => {
  const f = mediaFixture({ blocked: true });
  f.visible(); await tick();
  assert.deepEqual(f.video.calls, [{ muted: false }, { muted: true }]);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'index.htm'), 'utf8'), /video-enable-sound/);
  f.video.blocked = false;
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.muted, false);
  assert.equal(f.control('.video-sound').getAttribute('aria-label'), 'Desativar som');
});

test('genuine page interaction retries blocked sound, but does not override chosen mute', async () => {
  const f = mediaFixture({ blocked: true });
  f.visible(); await tick();
  f.video.blocked = false;
  f.document.emit('click', { target: { closest: () => null } }); await tick();
  assert.equal(f.video.muted, false);
  f.control('.video-sound').emit('click'); await tick();
  f.document.emit('click', { target: { closest: () => null } }); await tick();
  assert.equal(f.video.muted, true);
});

test('scroll thresholds and volume controls preserve an explicit pause', async () => {
  const f = mediaFixture();
  f.visible(); await tick();
  f.control('.video-toggle').emit('click');
  const calls = f.video.calls.length;
  f.visible(.3);
  f.control('.video-sound').emit('click');
  f.control('.video-volume').value = '45';
  f.control('.video-volume').emit('input'); await tick();
  assert.equal(f.video.paused, true);
  assert.equal(f.video.calls.length, calls);
  assert.equal(f.video.volume, .45);
});

test('leaving the section cancels pending playback without starting a muted retry', async () => {
  const f = mediaFixture();
  let rejectPlay;
  f.video.play = () => { f.video.calls.push({ muted: f.video.muted }); return new Promise((_, reject) => { rejectPlay = reject; }); };
  f.visible();
  f.visible(0);
  rejectPlay({ name: 'AbortError' }); await tick();
  assert.equal(f.video.calls.length, 1);
  assert.equal(f.video.paused, true);
});

test('zero volume can be unmuted from icon and layout changes retain chosen mute', async () => {
  const f = mediaFixture();
  f.visible(); await tick();
  f.control('.video-volume').value = '0';
  f.control('.video-volume').emit('input'); await tick();
  assert.equal(f.video.muted, true);
  f.control('.video-sound').emit('click'); await tick();
  assert.equal(f.video.volume, .8);
  assert.equal(f.video.muted, false);
  f.control('.video-sound').emit('click'); await tick();
  const portrait = f.queries.find(query => query.query.includes('portrait'));
  portrait.matches = true;
  portrait.emit('change'); await tick();
  assert.equal(f.video.getAttribute('src'), f.video.dataset.srcMobile);
  assert.equal(f.video.muted, true);
});

const key = 'st_cookie_preferences_v1';
function consentFixture(state = { local: new Map(), cookie: '' }, options = {}) {
  const document = new Element();
  document.documentElement = new Element();
  document.body = new Element();
  document.activeElement = null;
  const ui = new Element();
  document.createElement = () => ui;
  Object.defineProperty(document, 'cookie', {
    get: () => options.noCookie ? '' : state.cookie,
    set: value => { if (!options.noCookie) { state.cookie = value.split(';')[0]; state.cookieAttributes = value; } }
  });
  const localStorage = {
    getItem: name => { if (options.noLocal) throw new Error('storage blocked'); return state.local.get(name) || null; },
    setItem: (name, value) => { if (options.noLocal) throw new Error('storage blocked'); state.local.set(name, value); }
  };
  const window = { location: { protocol: options.protocol || 'https:' }, dispatchEvent() {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/privacy-controls.js'), 'utf8'), {
    document, window, localStorage, HTMLElement: Element, requestAnimationFrame: callback => callback(),
    CustomEvent: class { constructor(name, detail) { this.name = name; this.detail = detail; } }
  });
  return { state, ui, window, node: selector => ui.querySelector(selector),
    preferences: () => JSON.parse(JSON.stringify(window.STConsent.get())) };
}

test('no consent is written before a choice; accepting persists in cookie and local storage after reload', () => {
  const f = consentFixture();
  assert.equal(f.state.local.size, 0);
  assert.equal(f.state.cookie, '');
  assert.equal(f.node('[data-cookie-banner]').hidden, false);
  f.node('[data-cookie-accept]').emit('click');
  assert.equal(f.node('[data-cookie-banner]').hidden, true);
  assert.equal(JSON.parse(f.state.local.get(key)).preferences.analytics, true);
  assert.match(f.state.cookieAttributes, /Path=\/; Max-Age=31536000; SameSite=Lax; Secure/);
  const next = consentFixture(f.state);
  assert.equal(next.node('[data-cookie-banner]').hidden, true);
  assert.equal(next.preferences().marketing, true);
});

test('rejecting and custom choices survive reload and restore settings checkboxes', () => {
  const f = consentFixture();
  f.node('[data-cookie-accept]').emit('click');
  f.node('[data-cookie-reject]').emit('click');
  const next = consentFixture(f.state);
  assert.deepEqual(next.preferences(), { necessary: true, analytics: false, functional: false, marketing: false });
  next.window.STConsent.open();
  next.node('[data-cookie-category="functional"]').checked = true;
  next.node('[data-cookie-save]').emit('click');
  const last = consentFixture(f.state);
  last.window.STConsent.open();
  assert.equal(last.node('[data-cookie-category="functional"]').checked, true);
  assert.equal(last.node('[data-cookie-category="necessary"]').checked, true);
  assert.equal(last.node('[data-cookie-category="analytics"]').checked, false);
});

test('cookie fallback persists when localStorage is unavailable, including HTTP localhost', () => {
  const f = consentFixture(undefined, { noLocal: true, protocol: 'http:' });
  f.node('[data-cookie-accept]').emit('click');
  assert.doesNotMatch(f.state.cookieAttributes, /Secure/);
  const next = consentFixture(f.state, { noLocal: true, protocol: 'http:' });
  assert.equal(next.node('[data-cookie-banner]').hidden, true);
  assert.equal(next.preferences().analytics, true);
});

test('localStorage fallback persists when cookies are unavailable', () => {
  const f = consentFixture(undefined, { noCookie: true });
  f.node('[data-cookie-reject]').emit('click');
  const next = consentFixture(f.state, { noCookie: true });
  assert.equal(next.node('[data-cookie-banner]').hidden, true);
  assert.equal(next.preferences().analytics, false);
});

test('blocked storage shows a visible failure instead of claiming persistence', () => {
  const f = consentFixture(undefined, { noCookie: true, noLocal: true });
  f.node('[data-cookie-accept]').emit('click');
  assert.equal(f.node('[data-cookie-banner]').hidden, false);
  assert.equal(f.node('[data-cookie-banner-status]').hidden, false);
  assert.match(f.node('[data-cookie-banner-status]').textContent, /não permitiu salvá-la/);
});

test('corrupt storage falls back to cookie and old local-only choices migrate to cookie', () => {
  const f = consentFixture();
  f.node('[data-cookie-accept]').emit('click');
  f.state.local.set(key, '{broken');
  assert.equal(consentFixture(f.state).preferences().analytics, true);
  f.state.cookie = '';
  const next = consentFixture(f.state);
  assert.equal(next.node('[data-cookie-banner]').hidden, true);
  assert.ok(f.state.cookie.startsWith(key + '='));
});

test('newer cookie rejection overrides stale local consent', () => {
  const state = { local: new Map(), cookie: '' };
  const record = (updatedAt, allowed) => JSON.stringify({ version: 1, updatedAt,
    preferences: { necessary: true, analytics: allowed, functional: allowed, marketing: allowed } });
  state.local.set(key, record('2026-11-01T00:00:00Z', true));
  state.cookie = key + '=' + encodeURIComponent(record('2026-11-02T00:00:00Z', false));
  assert.equal(consentFixture(state).preferences().marketing, false);
});
