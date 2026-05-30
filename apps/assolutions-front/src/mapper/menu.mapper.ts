import { Injectable } from '@angular/core';
import { KeyValuePair } from '@shared/lib/autres.interface';
import {
  AdhMenHydrated,
  Cours_VM,
  Groupe,
  Lieu_VM,
  MesSeanceHydrated,
  MesSeances_VM,
  ProfLight_VM,
  Seance_VM,
  calculerHeureFin as calculerHeureFinUtil,
  mapSeanceToVM,
} from '@shared/index';
import { AdherentMenu } from '../class/adherent-menu';
import { MenuReferencesVm } from '../vm/menu.vm';

@Injectable({ providedIn: 'root' })
export class MenuMapper {
  buildReferencesVm(
    listeprof: ProfLight_VM[],
    listelieu: Lieu_VM[],
    listegroupe: Groupe[],
    listeCours: Cours_VM[],
  ): MenuReferencesVm {
    const liste_prof_filter: KeyValuePair[] = listeprof
      .map((x) => ({
        key: x.contrat_id ?? x.id ?? 0,
        value: `${x.prenom ?? ''} ${x.nom ?? ''}`.trim(),
      }))
      .sort((a, b) => a.value.localeCompare(b.value, 'fr'));

    const liste_lieu_filter = listelieu
      .map((x) => x.nom)
      .filter((x): x is string => !!x)
      .sort((a, b) => a.localeCompare(b, 'fr'));

    const liste_groupe_filter = listegroupe
      .map((x) => x.nom)
      .filter((x): x is string => !!x)
      .sort((a, b) => a.localeCompare(b, 'fr'));

    const liste_cours_filter = listeCours
      .map((x) => x.nom)
      .filter((x): x is string => !!x)
      .sort((a, b) => a.localeCompare(b, 'fr'));

    return {
      listeprof,
      listelieu,
      listegroupe,
      listeCours,
      liste_prof_filter,
      liste_lieu_filter,
      liste_groupe_filter,
      liste_cours_filter,
    };
  }

  
toMesSeancesVm(
  hydrated: MesSeanceHydrated[],
  refs: MenuReferencesVm,
): MesSeances_VM[] {
  const lieuxById = new Map(
    (refs.listelieu ?? []).map((l) => [l.id, l])
  );

  const coursById = new Map(
    (refs.listeCours ?? []).map((c) => [c.id, c])
  );

  const profsByContratId = new Map(
    (refs.listeprof ?? [])
      .filter((p) => typeof p.contrat_id === 'number')
      .map((p) => [p.contrat_id as number, p])
  );

  const contratsBySeanceId = new Map<number, number[]>();

  for (const ms of hydrated ?? []) {
    const seanceId = (ms.seance as any)?.seance_id ?? (ms.seance as any)?.id;
    if (!seanceId) continue;

    const contratIds = (ms.seanceProfesseurs ?? [])
      .map((sp) => sp.professeurcontract_id)
      .filter((id): id is number => typeof id === 'number');

    contratsBySeanceId.set(seanceId, contratIds);
  }

  return (hydrated ?? []).map((ms) => {
    const seanceId = (ms.seance as any)?.seance_id ?? (ms.seance as any)?.id;

    let seanceVm = mapSeanceToVM(ms.seance, {
      lieuxById,
      coursById,
      profsByContratId,
      contratsBySeanceId,
    });

    const mappedProfs = (ms.seanceProfesseurs ?? [])
      .map((sp) => {
        const contratId = sp.professeurcontract_id;
        if (typeof contratId === 'number' && profsByContratId.has(contratId)) {
          return profsByContratId.get(contratId);
        }

        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    seanceVm = {
      ...seanceVm,
      id: seanceVm.id ?? seanceId ?? 0,
      seanceProfesseurs: mappedProfs,
      cours_nom:
        seanceVm.cours_nom ??
        coursById.get(seanceVm.cours)?.nom ??
        '',
      lieu_nom:
        seanceVm.lieu_nom ??
        lieuxById.get(seanceVm.lieu_id)?.nom ??
        '',
      heure_fin:
        seanceVm.heure_fin ??
        (seanceVm.heure_debut && seanceVm.duree_seance
          ? this.calculerHeureFin(seanceVm.heure_debut, seanceVm.duree_seance)
          : ''),
    };

    return {
      seance: seanceVm,
      statutInscription: ms.statutInscription ?? null,
      statutPrésence: ms.statutPrésence ?? null,
    };
  });
}

toAdherentMenu(
  hydrated: AdhMenHydrated,
  refs: MenuReferencesVm,
  profil: 'ADH' | 'PROF',
): AdherentMenu {
  const rider = new AdherentMenu();
  const dateMin = new Date();
  if(profil === 'PROF') {
    dateMin.setMonth(dateMin.getDay() - 2);
  }
  const dateMax = new Date();
  dateMax.setMonth(dateMax.getMonth() + 1);

  rider.id = hydrated.personne.id;
  rider.nom = hydrated.personne.nom ?? '';
  rider.prenom = hydrated.personne.prenom ?? '';
  rider.surnom = hydrated.personne.surnom ?? '';
  rider.photo = hydrated.personne.photo ?? null;
  rider.libelle = `${rider.prenom} ${rider.nom}`.trim();
  rider.profil = profil;
  rider.afficher = false;

  rider.filters.filter_date_apres = dateMax;
  rider.filters.filter_date_avant = dateMin;
  console.log('Before:', hydrated.mes_seances);
  rider.MesSeances = this.toMesSeancesVm(hydrated.mes_seances, refs);
  console.log('Mapped MesSeances_VM:', rider.MesSeances);
  return rider;
}

enrichMesSeances(
  mesSeances: MesSeances_VM[],
  refs: MenuReferencesVm
): MesSeances_VM[] {
  const lieuxById = new Map(
    (refs.listelieu ?? []).map((l) => [l.id, l])
  );

  const coursById = new Map(
    (refs.listeCours ?? []).map((c) => [c.id, c])
  );

  const profsByContratId = new Map(
    (refs.listeprof ?? [])
      .filter((p) => typeof p.contrat_id === 'number')
      .map((p) => [p.contrat_id as number, p])
  );

  return (mesSeances ?? []).map((ms) => {
    const seance = ms.seance as any;
    if (!seance) return ms;

    const cours = coursById.get(seance.cours);
    const lieu = lieuxById.get(seance.lieu_id);

    const currentProfs = Array.isArray(seance.seanceProfesseurs)
      ? seance.seanceProfesseurs
      : [];

    const mappedProfs = currentProfs.map((sp: any) => {
      if (sp?.contrat_id && profsByContratId.has(sp.contrat_id)) {
        return profsByContratId.get(sp.contrat_id);
      }

      if (sp?.professeurcontract_id && profsByContratId.has(sp.professeurcontract_id)) {
        return profsByContratId.get(sp.professeurcontract_id);
      }

      return sp;
    }).filter(Boolean);

    const enrichedSeance: Seance_VM = {
      ...seance,
      cours_nom: cours?.nom ?? seance.cours_nom ?? seance.label ?? '',
      lieu_nom: lieu?.nom ?? seance.lieu_nom ?? '',
      seanceProfesseurs: mappedProfs,
      heure_fin:
        seance.heure_debut && seance.duree_seance
          ? this.calculerHeureFin(seance.heure_debut, seance.duree_seance)
          : seance.heure_fin ?? '',
    };

    return {
      ...ms,
      seance: enrichedSeance,
    };
  });
}
  sortRiderSeances(riders: AdherentMenu[]): AdherentMenu[] {
    for (const rider of riders ?? []) {
      rider.MesSeances = [...(rider.MesSeances ?? [])].sort((a, b) => {
        const dateA = this.toTimestamp(a);
        const dateB = this.toTimestamp(b);
        return dateA - dateB;
      });
    }

    return riders ?? [];
  }

  calculerHeureFin(heureDebut: string, duree: number): string {
    return calculerHeureFinUtil(heureDebut, duree);
  }

  private toTimestamp(ms: MesSeances_VM): number {
    const date = ms.seance.date_seance ??  '';
    const heure = ms.seance.heure_debut ?? '00:00';

    const d = new Date(date);
    const [h, m] = heure.split(':').map(Number);

    d.setHours(h || 0, m || 0, 0, 0);
    return d.getTime();
  }
}