/**
 * Mark text literals / text-bearing attributes in Angular HTML templates.
 * Run with --write to apply. The detector intentionally mirrors the independent
 * i18n inventory CI check, and never inserts a fake English translation.
 */
import fs from 'node:fs';
import path from 'node:path';
import { HtmlParser } from '@angular/compiler';

const root = path.resolve('apps/assolutions-front/src/app');
const parser = new HtmlParser();
const attributeNames = new Set(['title', 'placeholder', 'aria-label', 'alt']);

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}
function literal(value = '') {
  return value.replace(/{{[\s\S]*?}}/g, ' ')
    .replace(/&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function meaningful(value) { return /\p{L}/u.test(literal(value)); }

let count = 0;
let changedFiles = 0;
for (const file of files(root)) {
  const source = fs.readFileSync(file, 'utf8');
  const parsed = parser.parse(source, file, { tokenizeExpansionForms: true });
  if (parsed.errors?.length) {
    console.warn('Skipping HTML parser errors:', path.relative(root, file));
    continue;
  }
  const updates = [];
  function visit(node, insideI18n = false) {
    if (!node || typeof node !== 'object' ||
        !(typeof node.name === 'string' && Array.isArray(node.children))) return;
    const attrs = Array.isArray(node.attrs) ? node.attrs : [];
    const names = new Set(attrs.map((attr) => attr.name));
    const ownI18n = names.has('i18n');
    const directText = node.children.some((child) =>
      child?.constructor?.name === 'Text' && meaningful(child.value));
    const add = [];
    if (!insideI18n && !ownI18n && directText) add.push('i18n');
    for (const attr of attrs) {
      if (attributeNames.has(attr.name) && meaningful(attr.value) &&
          !names.has('i18n-' + attr.name)) {
        add.push('i18n-' + attr.name);
      }
    }
    if (add.length) {
      const end = node.startSourceSpan?.end?.offset;
      if (typeof end !== 'number') throw new Error('Missing start span in ' + file);
      const head = source.slice(node.startSourceSpan.start.offset, end);
      const selfClosing = /\/\s*>$/.test(head);
      const at = end - (selfClosing ? 2 : 1);
      if (source[at] !== (selfClosing ? '/' : '>')) {
        throw new Error('Unsafe source span for ' + node.name + ' in ' + file);
      }
      updates.push({ at, text: ' ' + add.join(' ') });
    }
    for (const child of node.children) visit(child, insideI18n || ownI18n || add.includes('i18n'));
  }
  for (const node of parsed.rootNodes) visit(node, false);
  if (!updates.length) continue;
  updates.sort((a,b) => b.at - a.at);
  let updated = source;
  for (const { at, text } of updates) updated = updated.slice(0,at) + text + updated.slice(at);
  changedFiles++;
  count += updates.length;
  console.log(path.relative(root,file) + ': ' + updates.length);
  if (process.argv.includes('--write')) fs.writeFileSync(file, updated);
}
console.log('SOURCE_MARKER_CHANGES=' + count);
console.log('SOURCE_MARKER_FILES=' + changedFiles);
