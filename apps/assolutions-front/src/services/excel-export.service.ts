import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | Date | null | undefined;
};

@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  export<T>(filename: string, rows: T[], columns: ExcelColumn<T>[]): void {
    const data = rows.map(row => {
      const item: Record<string, any> = {};

      for (const col of columns) {
        item[col.header] = this.cleanValue(col.value(row));
      }

      return item;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    XLSX.writeFile(workbook, this.ensureXlsx(filename));
  }

  exportMatrix(
    filename: string,
    sheetName: string,
    headers: string[],
    rows: Array<Array<string | number>>,
  ): void {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Les champs FFRS comme code postal, téléphone et numéro de licence doivent
    // rester du texte pour conserver les zéros initiaux.
    for (let rowIndex = 1; rowIndex <= rows.length; rowIndex++) {
      for (const columnIndex of [0, 17, 21, 22, 25, 29]) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        const cell = worksheet[address];
        if (!cell || cell.v === null || cell.v === undefined || cell.v === '') continue;
        cell.t = 's';
        cell.v = String(cell.v);
      }
    }

    worksheet['!cols'] = headers.map((header, index) => ({
      wch: index === 8 || index === 9 || index === 10 || index === 11 || index === 12
        ? 18
        : Math.min(42, Math.max(12, header.length > 30 ? 28 : header.length + 2)),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Exemple');
    XLSX.writeFile(workbook, this.ensureXlsx(filename));
  }

  private cleanValue(value: any): any {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return this.formatDate(value);
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    return value;
  }

  private formatDate(date: Date): string {
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private ensureXlsx(filename: string): string {
    return filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  }
}
