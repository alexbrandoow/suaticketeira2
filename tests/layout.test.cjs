const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { root, pages } = require('../scripts/prepare-site.cjs');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('preloader is centered by its own box and does not depend on a widened layout viewport', () => {
  const css = read('css/preloader.css');
  const rule = css.match(/\.site-preloader\{([^}]*)\}/)[1];
  assert.match(rule, /position:fixed/);
  assert.match(rule, /display:flex/);
  assert.match(rule, /align-items:center/);
  assert.match(rule, /justify-content:center/);
  assert.match(rule, /height:100dvh/);
  assert.doesNotMatch(css, /preloader-logo\{[^}]*\d+vw/, 'vw acompanha o viewport alargado');
});

test('horizontal overflow cannot widen the mobile layout viewport (menu off-canvas + header animation)', () => {
  const css = read('css/style.css');
  assert.match(css, /html\{[^}]*overflow-x:hidden/);
  assert.match(css, /@supports \(overflow:clip\)\{html\{overflow-x:clip\}\}/);
  assert.match(css, /@supports \(overflow:clip\)\{\.site-header\{overflow-x:clip\}\}/);
});

test('every page forbids zooming out below 1 so browsers never widen the layout viewport', () => {
  for (const page of pages) assert.match(read(page), /<meta name="viewport" content="width=device-width, initial-scale=1\.0, minimum-scale=1\.0">/, page);
});

test('CSP no longer allows external script or style origins the site does not use', () => {
  for (const page of pages) {
    const csp = read(page).match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.match(csp, /script-src 'self';/);
    assert.match(csp, /style-src 'self';/);
    assert.doesNotMatch(csp, /jsdelivr|unpkg/);
  }
});

test('carousel textures ship as small WebP derivatives and originals stay untouched', () => {
  let total = 0;
  for (const index of [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12]) {
    for (const size of [560, 720]) total += fs.statSync(path.join(root, `ASSETS/figma/carousel/${index}-${size}.webp`)).size;
    assert.ok(fs.existsSync(path.join(root, `ASSETS/figma/${index}.png`)));
  }
  assert.ok(total < 1024 * 1024, 'texturas do carrossel devem somar menos de 1 MB');
  assert.doesNotMatch(read('index.htm'), /ASSETS\/figma\/1\.png"[^>]*circular-carousel__fallback|circular-carousel__fallback"[^>]*ASSETS\/figma\/1\.png/);
});
