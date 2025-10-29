import { Pipe, PipeTransform } from '@angular/core';
import { FilterCours } from '../app/cours/cours.component';
import { Cours_VM } from '@shared/lib/cours.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersCours',
  pure: false,
})
export class MultifiltersCoursPipe implements PipeTransform {
  transform(items: Cours_VM[], filters: FilterCours): Cours_VM[] {
    if (!Array.isArray(items) || !filters) return items ?? [];

    const nomLC = (filters.filter_nom ?? '').toLowerCase().trim();
    const groupeLC = (filters.filter_groupe ?? '').toLowerCase().trim();
    const jour = (filters.filter_jour ?? '').toString().trim();
    const profId = filters.filter_prof ?? null;
    const lieuId = filters.filter_lieu ?? null;

    return items.filter((item) => {
      const okNom = !nomLC || (item.nom ?? '').toLowerCase().includes(nomLC);

      const okLieu = (lieuId === null) || (item.lieu_id === lieuId);

      const okJour = !jour || (item.jour_semaine === jour);

      const groupes = item.groupes ?? [];
      const okGroupe = !groupeLC || groupes.some(g => (g.nom ?? '').toLowerCase().includes(groupeLC));

      const okProf = (profId === null) || (item.prof_principal_id === profId);

      return okNom && okLieu && okJour && okGroupe && okProf;
    });
  }
}
