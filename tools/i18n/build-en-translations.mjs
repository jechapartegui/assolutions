import fs from 'node:fs';
import path from 'node:path';

const sourceDir = path.resolve('apps/assolutions-front/src/locale/en');
const outputFile = path.resolve('apps/assolutions-front/src/locale/messages.en.json');
const overridesFile = path.join(sourceDir, 'translations-overrides.json');

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => /^translations-\d+\.json$/.test(file))
  .sort();

if (!files.length) {
  throw new Error(`No English translation files found in ${sourceDir}`);
}

const translations = {};

for (const file of files) {
  const fullPath = path.join(sourceDir, file);
  const values = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  for (const [id, value] of Object.entries(values)) {
    if (Object.prototype.hasOwnProperty.call(translations, id)) {
      throw new Error(`Duplicate English translation id ${id} in ${file}`);
    }
    translations[id] = value;
  }
}

if (fs.existsSync(overridesFile)) {
  const overrides = JSON.parse(fs.readFileSync(overridesFile, 'utf8'));
  Object.assign(translations, overrides);
}

const payload = {
  locale: 'en',
  translations,
};

fs.writeFileSync(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`English locale assembled: ${Object.keys(translations).length} messages -> ${outputFile}`);
