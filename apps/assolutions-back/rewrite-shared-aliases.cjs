// apps/assolutions-back/rewrite-shared-aliases.cjs
const fs = require('fs');
const path = require('path');

const appDistDir = path.resolve(__dirname, '..', '..', 'dist', 'apps', 'assolutions-back');
const sharedDistDir = path.resolve(__dirname, '..', '..', 'dist', 'libs', 'shared');

if (!fs.existsSync(appDistDir)) {
  console.error('Dossier build introuvable :', appDistDir);
  process.exit(1);
}

if (!fs.existsSync(sharedDistDir)) {
  console.error('Dossier shared introuvable :', sharedDistDir);
  process.exit(1);
}

function listJsFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      listJsFiles(filePath, list);
    } else if (filePath.endsWith('.js')) {
      list.push(filePath);
    }
  }

  return list;
}

function rewriteFile(file) {
  const text = fs.readFileSync(file, 'utf8');

  if (!text.includes('@shared/')) return false;

  let rel = path.relative(path.dirname(file), sharedDistDir).replace(/\\/g, '/');

  if (!rel.startsWith('.')) rel = './' + rel;
  if (!rel.endsWith('/')) rel += '/';

  const replaced = text
    .replace(/(require\(\s*['"])@shared\//g, `$1${rel}`)
    .replace(/(from\s+['"])@shared\//g, `$1${rel}`);

  if (replaced !== text) {
    fs.writeFileSync(file, replaced, 'utf8');
    return true;
  }

  return false;
}

const files = listJsFiles(appDistDir);

let changed = 0;

for (const file of files) {
  if (rewriteFile(file)) changed++;
}

console.log(`rewrite-shared-aliases: rewrote ${changed} file(s).`);