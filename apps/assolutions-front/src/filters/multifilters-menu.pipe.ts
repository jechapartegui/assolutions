import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { FilterMenu } from '../app/menu/menu.component';
import { MesSeances_VM } from '@shared/lib/seance.interface';

@Pipe({
  standalone: false,
  name: 'multifiltersMenu',
  pure: false,
})
@Injectable({
  providedIn: 'root',
})
export class MultifiltersMenuPipe implements PipeTransform {
  transform(items: MesSeances_VM[], filters: FilterMenu): MesSeances_VM[] {
    if (!items) return [];
    if (!filters) return items;

    const norm = (s?: string | null) =>
      (s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();

    const needleProf = norm(filters.filter_prof);
    const needleGroupe = norm(filters.filter_groupe);
    const needleCours = norm(filters.filter_cours);

    return items.filter((item) => {
      const s = item.seance;
      const dateSeance = new Date(s.date_seance);

      const hasMatchingProf =
        !filters.filter_prof ||
        s.seanceProfesseurs?.some((p: any) => {
          const full = `${p?.prenom ?? p?.personne?.prenom ?? ''} ${p?.nom ?? p?.personne?.nom ?? ''}`;
          return norm(full).includes(needleProf);
        });

      const inSelectedGroup =
        !filters.filter_groupe ||
        (
          filters.filter_groupe === '__MES_GROUPES__'
            ? item.dansGroupeAdherent === true || !!item.statutInscription
            : (item.groupeNoms ?? []).some((nom) => norm(nom) === needleGroupe)
        );

      const hasMatchingCours =
        !filters.filter_cours ||
        norm(s.cours_nom ?? s.nom).includes(needleCours);

      return (
        (!filters.filter_nom || norm(s.nom).includes(norm(filters.filter_nom))) &&
        (!filters.filter_lieu || norm(s.lieu_nom).includes(norm(filters.filter_lieu))) &&
        (!filters.filter_date_avant || dateSeance >= new Date(filters.filter_date_avant)) &&
        (!filters.filter_date_apres || dateSeance <= new Date(filters.filter_date_apres)) &&
        hasMatchingProf &&
        hasMatchingCours &&
        inSelectedGroup &&
        (filters.filter_statut === null || s.statut === filters.filter_statut)
      );
    });
  }
}
