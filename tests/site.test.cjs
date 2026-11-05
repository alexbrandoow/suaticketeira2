const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { root, pages, prepare } = require('../scripts/prepare-site.cjs');

function localReference(from, url) {
  if (!url || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(url)) return;
  assert.ok(!url.startsWith('/'), `${from}: caminho absoluto quebra o subdiretorio do Pages: ${url}`);
  const target = path.resolve(path.dirname(path.join(root, from)), decodeURIComponent(url.split(/[?#]/)[0]));
  const relative = path.relative(root, target);
  assert.ok(!relative.startsWith('..'), `Recurso fora do projeto: ${url}`);
  let current = root;
  for (const segment of relative.split(path.sep)) {
    assert.ok(fs.readdirSync(current).includes(segment), `${from}: caminho ausente ou caixa incorreta: ${url}`);
    current = path.join(current, segment);
  }
}

test('Pages entries mirror editable pages and all script/style cache keys match their contents', () => {
  assert.deepEqual(prepare(true), []);
  assert.ok(fs.existsSync(path.join(root, '.nojekyll')));
});

test('all HTML and CSS local references resolve with Linux case sensitivity under a project subpath', () => {
  let checked = 0;
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const [, url] of html.matchAll(/\b(?:src|href|poster|data-src-desktop|data-src-mobile)="([^"]+)"/g)) {
      localReference(file, url); checked++;
    }
  }
  for (const name of fs.readdirSync(path.join(root, 'css'))) {
    const file = `css/${name}`;
    for (const [, url] of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)) {
      localReference(file, url); checked++;
    }
  }
  // URLs montadas dinamicamente pelo carrossel, relativas ao documento.
  for (const index of [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12]) {
    for (const size of [560, 720]) localReference('index.htm', `ASSETS/figma/carousel/${index}-${size}.webp`);
  }
  assert.ok(checked > 100);
});

test('pages have no executable inline scripts, event attributes or duplicate IDs; CSP remains restrictive', () => {
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|fonts\.googleapis|fonts\.gstatic/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /font-src 'self'/);
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      assert.match(attrs, /\bsrc="/);
      assert.equal(body.trim(), '');
    }
    assert.doesNotMatch(html, /\son[a-z]+\s*=|(?:src|href)="javascript:/i);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, file);
  }
});

test('all shipped JavaScript parses and site source has no injected inspector/extension integrations', () => {
  const files = fs.readdirSync(path.join(root, 'js')).filter(name => name.endsWith('.js'));
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, 'js', file), 'utf8');
    new vm.Script(source, { filename: file });
    assert.doesNotMatch(source, /fonts\.googleapis|chrome\.runtime|runtime\.lastError|inspector\.b9415ea5|addEventListener\(['"]unload/);
  }
  for (const file of ['gsap.min.js', 'ScrollTrigger.min.js', 'SplitText.min.js']) {
    const source = fs.readFileSync(path.join(root, 'js/vendor/gsap', file), 'utf8');
    assert.match(source, /3\.15\.0/);
    new vm.Script(source, { filename: file });
  }
});
