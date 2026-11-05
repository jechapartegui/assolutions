/* Publish crawlable, standalone brand/legal pages at the site root.
 * Angular localized bundles are normally in dist/.../fr and dist/.../en.
 * Keep root / as the existing login/locale redirect; never overwrite index.html.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..', 'dist/apps/assolutions-front-prod');
const sourceCandidates = [path.join(root, 'fr'), path.join(root, 'browser', 'fr'), root];
const source = sourceCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'public', 'index.html')) &&
  fs.existsSync(path.join(candidate, 'confidentialite', 'index.html')) &&
  fs.existsSync(path.join(candidate, 'conditions', 'index.html')));
if (!source) throw new Error('Pages publiques non générées dans le build Angular.');
const dest = source.endsWith(path.join('browser', 'fr')) ? path.join(root, 'browser') : root;
for (const directory of ['public', 'confidentialite', 'conditions']) {
  const src = path.join(source, directory, 'index.html');
  const target = path.join(dest, directory, 'index.html');
  if (src !== target) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
  }
}
const css = path.join(source, 'site.css');
if (fs.existsSync(css)) {
  const target = path.join(dest, 'site.css');
  if (css !== target) fs.copyFileSync(css, target);
}
console.log('Pages Google OAuth publiées à la racine du build : /public/, /confidentialite/, /conditions/');
