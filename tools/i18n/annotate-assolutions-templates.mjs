import fs from 'node:fs';
import path from 'node:path';
import { HtmlParser } from '@angular/compiler';

const appRoot = path.resolve('apps/assolutions-front/src/app');
const parser = new HtmlParser();
const translatableAttributes = new Set(['title', 'placeholder', 'aria-label', 'alt']);
const skippedTags = new Set(['script', 'style']);

function listHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

function literalPart(value = '') {
  return value
    .replace(/{{[\s\S]*?}}/g, ' ')
    .replace(/&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTranslatable(value = '') {
  const literal = literalPart(value);
  // Requiring a letter deliberately ignores counters, percentages and punctuation-only fragments.
  return /\p{L}/u.test(literal);
}

function insertionPosition(source, element) {
  const span = element.startSourceSpan ?? element.sourceSpan;
  if (!span) return null;

  let pos = span.end.offset - 1;
  if (source[pos] !== '>') {
    pos = source.indexOf('>', span.start.offset);
  }
  if (pos < 0) return null;
  if (source[pos - 1] === '/') pos -= 1;
  return pos;
}

function annotateTemplate(file) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = parser.parse(source, file, { tokenizeExpansionForms: true });
  if (parsed.errors?.length) {
    throw new Error(`${file}: ${parsed.errors.map((error) => error.msg).join('; ')}`);
  }

  const inserts = [];

  function visit(node, insideI18n = false) {
    if (!node || typeof node !== 'object') return;
    const isElement = typeof node.name === 'string' && Array.isArray(node.children);
    if (!isElement) return;

    const attrs = Array.isArray(node.attrs) ? node.attrs : [];
    const names = new Set(attrs.map((attr) => attr.name));
    const alreadyI18n = names.has('i18n');

    const directText = node.children.some(
      (child) => child?.constructor?.name === 'Text' && isTranslatable(child.value),
    );

    const markers = [];
    const translateElement =
      !insideI18n &&
      !alreadyI18n &&
      !skippedTags.has(node.name) &&
      directText;

    if (translateElement) markers.push('i18n');

    for (const attr of attrs) {
      if (
        translatableAttributes.has(attr.name) &&
        !names.has(`i18n-${attr.name}`) &&
        isTranslatable(attr.value)
      ) {
        markers.push(`i18n-${attr.name}`);
      }
    }

    if (markers.length) {
      const pos = insertionPosition(source, node);
      if (pos !== null) inserts.push({ pos, text: ` ${markers.join(' ')}` });
    }

    const nextInsideI18n = insideI18n || alreadyI18n || translateElement;
    for (const child of node.children) visit(child, nextInsideI18n);
  }

  for (const root of parsed.rootNodes) visit(root, false);
  if (!inserts.length) return false;

  let output = source;
  inserts.sort((a, b) => b.pos - a.pos);
  for (const insert of inserts) {
    output = output.slice(0, insert.pos) + insert.text + output.slice(insert.pos);
  }

  if (output === source) return false;
  fs.writeFileSync(file, output, 'utf8');
  return true;
}

const files = listHtmlFiles(appRoot);
const changed = [];
for (const file of files) {
  if (annotateTemplate(file)) changed.push(path.relative(process.cwd(), file));
}

console.log(`I18N_TEMPLATES_CHANGED=${changed.length}`);
for (const file of changed) console.log(file);
