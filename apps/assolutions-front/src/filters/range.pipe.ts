import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: false,
  name: 'range'
})
export class RangePipe implements PipeTransform {
  transform(value: number): number[] {
    const range: number[] = [];
    for (let i = 0; i < value; i++) {
      range.push(i);
    }
    return range;
  }
}
