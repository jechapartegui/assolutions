import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  constructor() { }

  public exportAsExcelFile(json: any[], excelFileName: string, headers: any): void {
    const mappedJson = json.map(item => {
      const mappedItem = {};
      for (const key in headers) {
        if (headers.hasOwnProperty(key)) {
          mappedItem[headers[key]] = item[key];
        }
      }
      return mappedItem;
    });

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(mappedJson);
    const workbook: XLSX.WorkBook = {
      Sheets: { 'adherent': worksheet },
      SheetNames: ['adherent']
    };
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, excelFileName);
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  public importFromExcelFile(file: File, headers: any): Observable<any[]> {
    return new Observable(observer => {
      const reader: FileReader = new FileReader();
      reader.onload = (e: any) => {
        const arrayBuffer: ArrayBuffer = e.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(arrayBuffer, { type: 'array' });
  
        const worksheet: XLSX.WorkSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);
  
        const mappedJson = json.map(item => {
          const mappedItem: any = {};
          for (const key in headers) {
            if (headers.hasOwnProperty(key)) {
              const excelColumn = headers[key];
              mappedItem[key] = item[excelColumn];
            }
          }
          return mappedItem;
        });
  
        observer.next(mappedJson);
        observer.complete();
      };
      reader.readAsArrayBuffer(file);
    });
  }
}

const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
const EXCEL_EXTENSION = '.xlsx';
