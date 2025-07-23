import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: false,
  name: 'dureeHHMM'
})
export class DureeHHMMPipe implements PipeTransform {
  transform(value: number): string {
    if (value == null || value < 0) return '00h00';
    const heures = Math.floor(value / 60);
    const minutes = value % 60;
    return `${heures.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`;
  }
}
