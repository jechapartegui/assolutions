/* Copy standalone Google OAuth branding pages to the top level of a frontend deployment.
 * This avoids depending on Angular's localized output structure.
 * Never overwrite the root index.html: it remains the login/locale entry.
 * Usage: node scripts/publish-public-legal-pages.cjs [prod|preprod]
 */
const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'apps/assolutions-front/src/seo');
const environment = process.argv[2] || 'prod';
if (!['prod', 'preprod'].includes(environment)) {
  throw new Error(`Environnement de publication inconnu : ${environment}`);
}
const buildFolder = environment === 'prod' ? 'assolutions-front-prod' : 'assolutions-front-preprod';
const output = path.resolve(__dirname, '..', 'dist/apps', buildFolder);
if (!fs.existsSync(output)) throw new Error(`Build frontend ${environment} introuvable : ${output}`);
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
console.log(`Pages Google OAuth publiées dans le build ${environment} : /public/, /confidentialite/, /conditions/`);
