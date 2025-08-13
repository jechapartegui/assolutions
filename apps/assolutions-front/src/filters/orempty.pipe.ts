// shared/pipes/or-empty.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({standalone:false, name: 'orEmpty' })
export class OrEmptyPipe implements PipeTransform {
  transform(value: any, fallback = ''): string {
    return (value === null || value === undefined) ? fallback : String(value);
  }
}
