import { Pipe, PipeTransform } from '@angular/core';
import { FilterSeance } from '../app/seance/seance.component';
import { Seance_VM } from '@shared/lib/seance.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersSeance',
  pure: false,
})
export class MultifiltersSeancePipe implements PipeTransform {
  transform(items: Seance_VM[], filters: FilterSeance): Seance_VM[] {
    if (!Array.isArray(items) || !filters) return items ?? [];

    const nomLC = (filters.filter_nom ?? '').toLowerCase().trim();
    const lieuLC = (filters.filter_lieu ?? '').toLowerCase().trim();
    const groupeLC = (filters.filter_groupe ?? '').toLowerCase().trim();
    const profLC = (filters.filter_prof ?? '').toLowerCase().trim();
    const statut = (filters.filter_statut ?? '').trim();

    // dates: strings "YYYY-MM-DD" -> compare en ISO (robuste TZ)
    const bornemin = (filters.filter_date_apres ?? '').toString().trim();
    const bornemax = (filters.filter_date_avant ?? '').toString().trim();

    return items.filter((item) => {
      // nom
      const okNom = !nomLC || (item.nom ?? '').toLowerCase().includes(nomLC);

      // date séance en ISO court
      const dIso = item.date_seance ? new Date(item.date_seance).toISOString().slice(0, 10) : '';
      const okDateMin = !bornemin || (dIso && dIso >= bornemin);
      const okDateMax = !bornemax || (dIso && dIso <= bornemax);
      const okDate = okDateMin && okDateMax;

      // lieu (match par libellé)
      const okLieu = !lieuLC || (item.lieu_nom ?? '').toLowerCase().includes(lieuLC);

      // groupes
      const groupes = item.groupes ?? [];
      const okGroupe = !groupeLC || groupes.some(g => (g.nom ?? '').toLowerCase().includes(groupeLC));

      // profs : nom/prénom concat
      const profs = item.seanceProfesseurs ?? [];
      const okProf =
        !profLC ||
        profs.some(p => {
          const full = `${p.personne?.prenom ?? ''} ${p.personne?.nom ?? ''}`.toLowerCase();
          return full.includes(profLC);
        });

      // statut
      const okStatut = !statut || item.statut === statut;

      return okNom && okDate && okLieu && okGroupe && okProf && okStatut;
    });
  }
}
