import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
import { HeaderDef, HEADERS_CATALOG, HeaderType, ImportEntity } from '../global';

// --- TYPES SIMPLES POUR LE MAPPING (identiques à ce qu'attend ton HTML) ---
type ImportContext = 'LOAD' | 'VIEW' | 'COMPARE';

// [colIndex, headerSource, literalText, transformExpr, sampleValue, chosenHeader]
type MappingPiece = [number|null, string|null, string|null, string|null, any, string|null];

@Component({
  standalone: false,  
  selector: 'app-import',
  templateUrl: './import.component.html',
})
export class ImportComponent {
  // Contexte
  context: ImportContext = 'LOAD';

  // Fichier Excel
  file?: File;
  data: any[] = [];                // lignes du XLS
  listeHeader: string[] = [];      // entêtes Excel (1ère ligne)

  // Entité en cours
  entities: ImportEntity[] = ['Adherent','Cours','Séance','Lieu','Paiement','Stock','Professeur'];
  entity: ImportEntity = 'Adherent';

  // Définitions & labels issus du catalog
  headersDefs!: Readonly<Record<string, HeaderDef>>;
  headers: Record<string, string> = {}; // clé -> label (affiché)

  // Mapping UI
  objectKeys = Object.keys;
  columnCounts: Record<string, number> = {};
  mappedValues: Record<string, MappingPiece[]> = {};

  // Aperçu (VIEW/COMPARE) générique
  viewRows: any[] = [];
  viewKeys: string[] = []; // ordre des colonnes dans l'aperçu

  constructor() {
    this.loadHeadersFromCatalog(this.entity);
  }

  // (Re)charge la définition pour l'entité sélectionnée
  onEntityChange() {
    this.loadHeadersFromCatalog(this.entity);
    // on reste en LOAD, mapping vierge
    this.viewRows = [];
    this.viewKeys = [];
    this.context = 'LOAD';
  }

  private loadHeadersFromCatalog(entity: ImportEntity) {
    this.entity = entity;
    this.headersDefs = HEADERS_CATALOG[this.entity];

    // Labels utilisés par le template
    this.headers = Object.fromEntries(
      Object.entries(this.headersDefs).map(([k, def]) => [k, def.label])
    );

    // 1 morceau par propriété
    this.columnCounts = {};
    this.mappedValues = {};
    for (const key of Object.keys(this.headers)) {
      this.columnCounts[key] = 1;
      this.mappedValues[key] = [[null, null, null, null, null, null]];
    }
  }

  // Lecture Excel
  onFileChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.file = input.files[0];

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const wsName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[wsName];

      // Lignes JSON avec entêtes Excel comme clés
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      this.data = json;

      // Entêtes source (1ère ligne brute)
      const headerRow: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as any[] || [];
      this.listeHeader = headerRow.map(h => String(h ?? '').trim());

      // Reset mapping
      this.loadHeadersFromCatalog(this.entity);
      this.context = 'LOAD';
    };
    reader.readAsArrayBuffer(this.file);
  }

  // UI mapping
  adjustColumnCount(key: string) {
    const nb = Math.max(1, Math.min(7, this.columnCounts[key] || 1));
    const arr = this.mappedValues[key] || [];
    while (arr.length < nb) arr.push([null, null, null, null, null, null]);
    while (arr.length > nb) arr.pop();
    this.mappedValues[key] = arr;
  }

  onSelectHeader(key: string, i: number, choice: string|null) {
    const piece = this.mappedValues[key][i];
    piece[5] = choice;               // chosenHeader
    piece[2] = choice === 'Texte' ? (piece[2] ?? '') : null; // texte littéral
    piece[0] = null;                 // colIndex
    piece[1] = null;                 // headerSource
    piece[4] = null;                 // sample

    if (choice && choice !== 'Texte') {
      const idx = this.listeHeader.findIndex(h => h === choice);
      piece[0] = idx >= 0 ? idx : null;
      piece[1] = choice;

      const first = this.data[0];
      if (first && choice in first) {
        piece[4] = first[choice];
      } else if (Array.isArray(first) && piece[0] != null) {
        piece[4] = first[piece[0]];
      }
    }

    this.mappedValues[key][i] = piece;
  }

  onTransformationInput(key: string, i: number, e: Event) {
    const input = e.target as HTMLInputElement;
    this.mappedValues[key][i][3] = input.value || null; // transformExpr (optionnel)
  }

  // Export / Import du mapping
  ExporterJSON() {
    const payload = {
      version: 1,
      entity: this.entity,
      columnCounts: this.columnCounts,
      mapping: this.mappedValues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mapping-${this.entity}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  ImporterJSON(evt: Event) {
    const input = evt.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const f = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result || '{}'));
        const ent = (payload.entity as ImportEntity) || this.entity;
        this.loadHeadersFromCatalog(ent);
        if (payload.columnCounts) this.columnCounts = payload.columnCounts;
        if (payload.mapping) this.mappedValues = payload.mapping;
      } catch (e) {
        console.error('Bad JSON mapping', e);
      }
    };
    reader.readAsText(f);
  }

  // Importer → construit un aperçu générique basé sur headersDefs
  importer() {
    // Concat simple des morceaux (Texte ou Header Excel)
    const buildValue = (row: any, pieces: MappingPiece[]): string =>
      pieces.map(p => {
        const chosen = p[5];
        if (chosen === 'Texte') return p[2] ?? '';
        if (chosen) {
          if (row && chosen in row) return row[chosen] ?? '';
        }
        return '';
      }).join('');

    // Ordre des colonnes = ordre de déclaration dans le catalog
    this.viewKeys = Object.keys(this.headersDefs);

    this.viewRows = this.data.map(row => {
      const out: any = {};
      for (const key of this.viewKeys) {
        const pieces = this.mappedValues[key] ?? [];
        const str = buildValue(row, pieces).trim();
        out[key] = this.coerceByType(str, this.headersDefs[key]?.type);
      }
      return out;
    });

    this.context = 'VIEW';
  }

  // Vérifier les données (placeholder: on garde le même rendu)
  LetsGo() {
    this.context = 'COMPARE';
  }

  // Import en base (à brancher côté backend)
  LetsGoBase() {
    console.log('Entity:', this.entity);
    console.log('Rows to import:', this.viewRows);
    alert(`Simulation : ${this.viewRows.length} ${this.entity} à envoyer au backend (voir console).`);
  }

  // --- Utils ---

  // Coercition légère selon HeaderDef.type (simple, robuste)
  private coerceByType(v: string, t: HeaderType | undefined) {
    if (v == null) return v;

    switch (t) {
      case 'number': {
        const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : (v || null);
      }
      case 'boolean': {
        const s = String(v).trim().toLowerCase();
        if (['1','true','oui','yes','y','vrai'].includes(s)) return true;
        if (['0','false','non','no','n','faux'].includes(s)) return false;
        return null;
      }
      case 'date': {
        const iso = this.toISODate(String(v));
        return iso || null;
      }
      case 'array': {
        // heuristique simple: séparer par ';' ou ','
        const s = String(v);
        if (!s) return [];
        const parts = s.split(/[;,]/).map(x => x.trim()).filter(Boolean);
        return parts;
      }
      case 'money': {
        const s = String(v).replace(/[^\d,.\- ]/g, '').replace(/\s/g, '');
        const normalized = s.includes(',') && s.includes('.') // "1,234.56" ou "1.234,56"
          ? (s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',','.') : s.replace(/,/g,''))
          : s.replace(',','.');
        const n = Number(normalized);
        return Number.isFinite(n) ? n : (v || null);
      }
      case 'enum':
      case 'relation':
      case 'string':
      default:
        return String(v);
    }
  }

  private toISODate(input: string): string {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;            // yyyy-mm-dd
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);  // dd/mm/yyyy
    if (m1) {
      const [_, d, m, y] = m1;
      return `${y}-${this.pad2(+m)}-${this.pad2(+d)}`;
    }
    const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);    // dd-mm-yyyy
    if (m2) {
      const [_, d, m, y] = m2;
      return `${y}-${this.pad2(+m)}-${this.pad2(+d)}`;
    }
    return '';
  }
  private pad2(n: number) { return n < 10 ? `0${n}` : String(n); }
}
