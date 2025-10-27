import { Pipe, PipeTransform } from '@angular/core';
import { FilterAdherent } from '../app/adherent/adherent.component';
import { Adherent_VM } from '@shared/lib/member.interface';

@Pipe({
  standalone:false,
  name: 'multifiltersAdherent',
  pure: false, // recalcul à chaque cycle, comme chez toi
})
export class MultifiltersAdherentPipe implements PipeTransform {
  transform(items: Adherent_VM[], filters: FilterAdherent, saison_id: number): Adherent_VM[] {
    if (!Array.isArray(items) || !filters) return items ?? [];

    // Prépare les filtres (lowercase une fois, etc.)
    const nomLC = (filters.filter_nom ?? '').toLowerCase().trim();
    const groupeLC = (filters.filter_groupe ?? '').toLowerCase().trim();

    // Dates: on compare en ISO "YYYY-MM-DD" pour éviter les pièges de timezone
    const bornemin = (filters.filter_date_apres ?? '').toString().trim(); // "YYYY-MM-DD" ou ""
    const bornemax = (filters.filter_date_avant ?? '').toString().trim(); // "YYYY-MM-DD" ou ""

    return items.filter((item) => {
      // libellé normalisé en lowercase
      const libelleLC = (item.libelle ?? '').toLowerCase();

      // 1) NOM
      const okNom =
        !nomLC || libelleLC.includes(nomLC);

      // 2) DATE NAISSANCE (string ISO courte "YYYY-MM-DD")
      // Sécurisé: si date_naissance vide → rejoue comme "pas de filtre"
      const dobIso = item.date_naissance
        ? new Date(item.date_naissance).toISOString().slice(0, 10)
        : '';

      const okDateMin = !bornemin || (dobIso && dobIso >= bornemin);
      const okDateMax = !bornemax || (dobIso && dobIso <= bornemax);
      const okDate = okDateMin && okDateMax;

      // 3) GROUPE
      // On tente d'abord l'inscription ACTIVE de la saison demandée,
      // sinon n'importe quelle inscription de cette saison, sinon []
      const inscriptionSaison =
        item.inscriptionsSaison?.find(x => x.active && x.saison_id === saison_id) ??
        item.inscriptionsSaison?.find(x => x.saison_id === saison_id) ??
        null;

      const groupes = inscriptionSaison?.groupes ?? [];
      const okGroupe =
        !groupeLC ||
        groupes.some(g => (g.nom ?? '').toLowerCase().includes(groupeLC));

      // 4) INSCRIT (pour la saison affichée)
      const okInscrit =
        filters.filter_inscrit === null
          ? true
          : !!item.inscriptionsSaison?.some(x => x.saison_id === saison_id) === !!filters.filter_inscrit;

      // 5) SEXE
      const okSexe =
        filters.filter_sexe === null || item.sexe === filters.filter_sexe;

      return okNom && okDate && okGroupe && okInscrit && okSexe;
    });
  }
}
