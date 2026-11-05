/* Copy standalone Google OAuth branding pages to the top level of an OVH deployment.
 * This avoids depending on Angular's localized output structure.
 * Never overwrite the root index.html: it remains the login/locale entry.
 */
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'apps/assolutions-front/src/seo');
const output = path.resolve(__dirname, '..', 'dist/apps/assolutions-front-prod');
if (!fs.existsSync(output)) throw new Error('Build frontend production introuvable.');
const targets = [output];
if (fs.existsSync(path.join(output, 'browser'))) targets.push(path.join(output, 'browser'));

for (const target of targets) {
  for (const folder of ['public', 'confidentialite', 'conditions']) {
    const src = path.join(source, folder, 'index.html');
    if (!fs.existsSync(src)) throw new Error('Page source manquante : ' + src);
    const dest = path.join(target, folder, 'index.html');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  fs.copyFileSync(path.join(source, 'site.css'), path.join(target, 'site.css'));
}
console.log('Pages Google OAuth publiées dans le build : /public/, /confidentialite/, /conditions/');
