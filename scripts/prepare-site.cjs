// Mantem o HTML editavel e as entradas do GitHub Pages identicos, sem redirecionar.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const pages = ['index.htm', 'politica-de-cookies/index.htm', 'politica-de-privacidade/index.htm',
  'politica-de-reembolso/index.htm', 'termos-de-servico/index.htm'];

function prepare(checkOnly = false) {
  const stale = [];
  for (const page of pages) {
    const file = path.join(root, page);
    const source = fs.readFileSync(file, 'utf8');
    const versioned = source.replace(/\b(src|href)="([^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g, (match, attr, url) => {
      if (/^(?:[a-z]+:|\/\/)/i.test(url)) return match;
      const asset = path.resolve(path.dirname(file), decodeURIComponent(url));
      // Estavel entre checkout CRLF no Windows e LF no GitHub Pages.
      const content = fs.readFileSync(asset, 'utf8').replace(/\r\n/g, '\n');
      const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
      return `${attr}="${url}?v=${hash}"`;
    });
    const alias = file.replace(/\.htm$/, '.html');
    for (const [target, content] of [[file, versioned], [alias, versioned]]) {
      if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) continue;
      stale.push(path.relative(root, target));
      if (!checkOnly) fs.writeFileSync(target, content);
    }
  }
  return stale;
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const changed = prepare(check);
  if (check && changed.length) {
    console.error('Execute npm run prepare:site antes de publicar:', changed.join(', '));
    process.exitCode = 1;
  } else console.log(check ? 'Entradas e cache atualizados.' : `Site preparado: ${changed.length} arquivos atualizados.`);
}
module.exports = { root, pages, prepare };
