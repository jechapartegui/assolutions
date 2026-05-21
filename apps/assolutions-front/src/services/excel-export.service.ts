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