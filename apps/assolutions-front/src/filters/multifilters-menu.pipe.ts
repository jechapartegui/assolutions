import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterMenu } from '../app/menu/menu.component';
import { MesSeances_VM } from '@shared/lib/seance.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersMenu',
  pure: false // Le pipe sera recalculé lorsque les filtres changent
})
@Injectable({
  providedIn: 'root', // Permet de l'utiliser comme un service global
})
export class MultifiltersMenuPipe implements PipeTransform {
  transform(items: MesSeances_VM[], filters: FilterMenu): MesSeances_VM[] {
    if (!items) return [];
    if (!filters) return items;

  
      const norm = (s?: string) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const needleProf = norm(filters.filter_prof);

return items.filter((item) => {
  const s = item.seance;
  const dateSeance = new Date(s.date_seance);

  const hasMatchingProf =
    !filters.filter_prof ||
    s.seanceProfesseurs?.some((p: any) => {
      const full = `${p?.personne?.prenom ?? ''} ${p?.personne?.nom ?? ''}`;
      return norm(full).includes(needleProf);
    });

  return (
    (!filters.filter_nom || norm(s.libelle).includes(norm(filters.filter_nom))) &&
    (!filters.filter_lieu || norm(s.lieu_nom).includes(norm(filters.filter_lieu))) &&
    (!filters.filter_date_avant || (filters.filter_date_avant && dateSeance >= new Date(filters.filter_date_avant))) &&
    (!filters.filter_date_apres || (filters.filter_date_apres && dateSeance <= new Date(filters.filter_date_apres))) &&
    hasMatchingProf &&
    (filters.filter_statut === null || s.statut === filters.filter_statut)
  );
});
    
  }
}
