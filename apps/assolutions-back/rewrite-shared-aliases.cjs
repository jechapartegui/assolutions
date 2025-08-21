// apps/assolutions-back/rewrite-shared-aliases.cjs
const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist");
// dossier absolu vers /dist/libs/shared (à la racine du repo)
const sharedDistDir = path.resolve(__dirname, "..", "..", "dist", "libs", "shared");

function listJsFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) listJsFiles(p, list);
    else if (p.endsWith(".js")) list.push(p);
  }
  return list;
}

function rewriteFile(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("@shared/")) return false;

  // chemin relatif depuis le fichier vers dist/libs/shared
  let rel = path.relative(path.dirname(file), sharedDistDir).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  if (!rel.endsWith("/")) rel += "/";

  // remplace require("@shared/...") ET import "... from '@shared/...'"
  const replaced = text
    .replace(/(require\(\s*['"])@shared\//g, `$1${rel}`)
    .replace(/(from\s+['"])@shared\//g, `$1${rel}`);

  if (replaced !== text) {
    fs.writeFileSync(file, replaced, "utf8");
    return true;
  }
  return false;
}

const files = listJsFiles(distDir);
let changed = 0;
for (const f of files) if (rewriteFile(f)) changed++;

console.log(`rewrite-shared-aliases: rewrote ${changed} file(s).`);
if (changed === 0) {
  console.warn("rewrite-shared-aliases: no @shared/ found in dist (nothing to do).");
}
