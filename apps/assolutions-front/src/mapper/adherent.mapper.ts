import { Injectable } from '@angular/core';
import { Adresse } from '@shared/lib/adresse.interface';
import { ItemContact, Personne, Personne_VM } from '@shared/lib/personne.interface';
import { Saison } from '@shared/lib/saison.interface';
import { InscriptionSaison } from '@shared/lib/inscription-saison.interface';
import { InscriptionSeance } from '@shared/lib/inscription-seance.interface';
import { Groupe, LienGroupe_VM } from '@shared/lib/groupes.interface';
import {
  AdherentDetail_VM,
  AdherentFilterVm,
  AdherentListItem_VM,
  AdherentPageData,
  AdherentReferencesVm,
} from '../vm/adherent-page.vm';
import { LienGroupe } from '@shared/lib/lien-groupe.interface';
import { raw } from 'express';
import { ContactDto } from '../services/contact-api.service';

@Injectable({ providedIn: 'root' })
export class AdherentMapper {
  buildReferencesVm(listeSaison: Saison[], liste_groupe_filter:Groupe[]): AdherentReferencesVm {
    return {
      liste_groupe_filter,
      listeSaison,
      listeArchive: [
        { key: false, value: 'Actifs' },
        { key: true, value: 'Archivés' },
      ],
    };
  }

  buildPageData(
    refs: AdherentReferencesVm,
    list: AdherentListItem_VM[],
    activeSaison: Saison | null,
  ): AdherentPageData {
    return {
      refs,
      list: this.sortByNom([...list], 'ASC'),
      activeSaison,
    };
  }

  createDefaultFilter(): AdherentFilterVm {
    return new AdherentFilterVm();
  }

  toPersonneVm(raw: Personne): Personne_VM {
    const vm = new Personne_VM();

    vm.id = raw.id ?? 0;
    vm.compte = raw.compte ?? 0;
    vm.nom = raw.last_name ?? '';
    vm.prenom = raw.first_name ?? '';
    vm.surnom = raw.nickname ?? '';
    vm.date_naissance = raw.date_naissance ? new Date(raw.date_naissance) : new Date();
    vm.sexe = !!raw.gender;
    vm.archive = !!raw.archive;
    vm.login = raw.login ?? '';
    vm.contact = [];
    vm.adresse = JSON.parse(raw.address) ?? new Adresse();

    vm.contact = [];
    vm.contact_prevenir = [];

    Personne_VM.bakeLibelle(vm);
    return vm;
  }

toAdherentListItemVm(params: {
  rawPersonne: Personne;
  activeSaisonId: number;
  inscriptionSaisonActive: InscriptionSaison | null;
  nbInscriptionsSeance: number;
  contacts: ContactDto[];  
  photo: string | null;
  groupesActifs: LienGroupe_VM[];
}): AdherentListItem_VM {
  const {
    rawPersonne,
    activeSaisonId,
    inscriptionSaisonActive,
    nbInscriptionsSeance,
    photo,
    groupesActifs,
  } = params;

  const base = this.toPersonneVm(rawPersonne);
  const vm = new AdherentListItem_VM();

  Object.assign(vm, base);
vm.contact = (params.contacts ?? [])
  .filter(x => x.contact_list === 'liste_contact')
  .map(c => ({
    id: c.id,
    Diffusion: c.diffusion ?? false,
    Type: c.contact_type,
    Value: c.contact_value ?? '',
    Info: c.info ?? '',
    Pref: c.pref,
  }));
  vm.saisonActiveId = activeSaisonId;
  vm.inscrit = !!inscriptionSaisonActive;
  vm.groupesActifs = groupesActifs ?? [];
  vm.nbInscriptionsSeance = nbInscriptionsSeance ?? 0;
  vm.photo = photo ?? null;

  Personne_VM.bakeLibelle(vm);

  return vm;
}

toLienGroupeVm(raw: any): LienGroupe_VM {
  return new LienGroupe_VM(raw.groupe_id, raw.nom, raw.id_lien);
}

toAdherentDetailVm(
  rawPersonne: Personne,
  inscriptionsSaison: InscriptionSaison[],
  inscriptionsSeance: InscriptionSeance[],
  groupesSaisonActive: LienGroupe[],
  contacts: ContactDto[],
  activeSaisonId: number,
  liste_groupes: Groupe[],
): AdherentDetail_VM {
  const base = this.toPersonneVm(rawPersonne);
  const vm = new AdherentDetail_VM();

  Object.assign(vm, base);
  vm.contact = (contacts ?? [])
  .filter(x => x.contact_list === 'liste_contact')
  .map(c => ({
    id: c.id,
    Diffusion: c.diffusion ?? false,
    Type: c.contact_type,
    Value: c.contact_value ?? '',
    Info: c.info ?? '',
    Pref: c.pref,
  }));
  vm.inscriptionsSaison = inscriptionsSaison ?? [];
  vm.inscriptionsSeance = inscriptionsSeance ?? [];
  vm.groupesParSaison = groupesSaisonActive.map(groupe => {
    const groupeInfo = liste_groupes.find(g => g.id === groupe.groupe_id);
    return new LienGroupe_VM(groupe.groupe_id, groupeInfo ? groupeInfo.nom : 'Groupe inconnu', groupe.id);
  });

  

  vm.inscrit = vm.inscriptionsSaison.some(
    (x) => x.saison_id === activeSaisonId && x.active === true,
  );

  Personne_VM.bakeLibelle(vm);
  return vm;
}

  sortByNom(list: AdherentListItem_VM[], sens: 'ASC' | 'DESC'): AdherentListItem_VM[] {
    return [...list].sort((a, b) => {
      const cmp = (a.nom ?? '').localeCompare(b.nom ?? '', 'fr', { sensitivity: 'base' });
      return sens === 'ASC' ? cmp : -cmp;
    });
  }

sortBySexe(list: AdherentListItem_VM[], sens: 'ASC' | 'DESC'): AdherentListItem_VM[] {
  return [...list].sort((a, b) => {
    const aVal = a.sexe ?? false;
    const bVal = b.sexe ?? false;

    const cmp = Number(aVal) - Number(bVal); // false=0, true=1

    return sens === 'ASC' ? cmp : -cmp;
  });
}
  sortByDateNaissance(list: AdherentListItem_VM[], sens: 'ASC' | 'DESC'): AdherentListItem_VM[] {
    return [...list].sort((a, b) => {
      const da = new Date(a.date_naissance).getTime();
      const db = new Date(b.date_naissance).getTime();
      return sens === 'ASC' ? da - db : db - da;
    });
  }
}