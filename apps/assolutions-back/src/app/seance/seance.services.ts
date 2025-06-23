import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seance } from '../bdd/seance';
import { Between, In } from 'typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
import { MesSeances, SeanceProfesseurVM, SeanceVM } from '@shared/compte/src/lib/seance.interface';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { ProfService } from '../prof/prof.services';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { LienGroupe_VM } from '@shared/compte/src/lib/groupe.interface';

@Injectable()
export class SeanceService {
  constructor(
    @InjectRepository(Seance)
    private readonly seanceRepo: Repository<Seance>,
    @InjectRepository(SeanceProfesseur)
    private readonly SeanceProfesseurRepo: Repository<SeanceProfesseur>,
    @InjectRepository(LienGroupe)
    private readonly lienGrouperepo: Repository<LienGroupe>,
    @InjectRepository(InscriptionSeance)
    private readonly inscriptionseancerepo: Repository<InscriptionSeance>,
    private profservice:ProfService
  ) // @InjectRepository(Projet)
  // private readonly projetRepo: Repository<Projet>,
  {}

  async GetSeanceSaison(saison_id:number): Promise<Seance[]>{
    return this.seanceRepo.find({
       where: {
        saison_id: saison_id
       } 
    })
  }

  async MySeance(
    adhrent_id: number,
    age: number,
    saison_id: number,
    groupe_id: number[],
    date_debut: Date = new Date(),
    date_fin: Date
  ): Promise<MesSeances[]> {
    const dateDebut = startOfDay(date_debut);
    const dateFin = endOfDay(date_fin);

    const seances = await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
        date_seance: Between(dateDebut, dateFin),
      },
    });

    if (!seances || seances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    const filteredSeances: MesSeances[] = [];

    for (const seance of seances) {
      const maSeance: MesSeances = {
        id: seance.seance_id,
        nom: seance.libelle,
        date: new Date(seance.date_seance),
        heureDebut: seance.heure_debut,
        heureFin: calculerHeureFin(seance.heure_debut, seance.duree_seance),
        duree: seance.duree_seance,
        inscription_id: undefined,
        lieu: '', // sera enrichi plus tard
        lieuId: seance.lieu_id,
        typeSeance: seance.type_seance,
        coursId: seance.cours ?? undefined,
        cours: '', // sera enrichi plus tard
        statut: seance.statut,
        statutInscription: undefined,
        professeur: [],
      };
      //check si présence signalée...
      const ins = await this.inscriptionseancerepo.findOne({
        where: {
          seance_id: seance.seance_id,
          rider_id: adhrent_id,
        },
      });
      if (ins) {
        maSeance.inscription_id = ins.id;
        maSeance.statutInscription = ins!.statut_inscription;
         maSeance.professeur = await  this.profservice.GetProfSeance(seance.seance_id);
        filteredSeances.push(maSeance);
      } else {
        let ajout: boolean = true;
        // filter age
        if (seance.est_limite_age_minimum && age < seance.age_minimum!) {
          ajout = false;
        }
        if (seance.est_limite_age_maximum && age > seance.age_maximum!) {
          ajout = false;
        }

        //filter groupe

        const liens = await this.lienGrouperepo.find({
          where: {
            objet_id: seance.seance_id,
            groupe_id: In(groupe_id),
            objet_type: 'seance',
          },
        });

        if (liens.length == 0) {
          ajout = false;
        }
        if(ajout==true) {
         maSeance.professeur = await  this.profservice.GetProfSeance(seance.seance_id);
          filteredSeances.push(maSeance);
        }
      }
    }

    if (filteredSeances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    return filteredSeances;
  }

  async MySeanceProf(
    adhrent_id: number,
    saison_id: number,
    date_debut: Date = new Date(),
    date_fin: Date
  ): Promise<MesSeances[]> {
    const dateDebut = startOfDay(date_debut);
    const dateFin = endOfDay(date_fin);

    const seances = await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
        date_seance: Between(dateDebut, dateFin),
      },
    });

    if (!seances || seances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    const profseance = await  this.SeanceProfesseurRepo.find({
      where: {  
        professeur_id: adhrent_id,
        seance_id: In(seances.map(s => s.seance_id)),
      },
    });
   const seancesFiltrees = seances.filter((s) => profseance.some((p) => p.seance_id === s.seance_id));

    const filteredSeances: MesSeances[] = [];

    for (const seance of seancesFiltrees) {
      const maSeance: MesSeances = {
        id: seance.seance_id,
        nom: seance.libelle,
        date: new Date(seance.date_seance),
        heureDebut: seance.heure_debut,
        heureFin: calculerHeureFin(seance.heure_debut, seance.duree_seance),
        duree: seance.duree_seance,
        lieu: '', // sera enrichi plus tard
        lieuId: seance.lieu_id,
        typeSeance: seance.type_seance,
        coursId: seance.cours ?? undefined,
        cours: '', // sera enrichi plus tard
        statut: seance.statut,
        statutInscription: undefined,
        professeur: [],
      };

      filteredSeances.push(maSeance);
    }

    if (filteredSeances.length === 0) {
      throw new UnauthorizedException('NO_SESSION_FOUND');
    }

    return filteredSeances;
  }
  async GetAll(saison_id: number): Promise<SeanceVM[]> {
    const seances = await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
      },
      relations: [
      'lieu',
      'cours',
      'professeursSeance',
      'professeursSeance.personne',
      ],
      order: {
        date_seance: 'ASC',
        heure_debut: 'ASC',
      },
    });

  if (seances.length === 0) return [];
  const seanceIds = seances.map(s => s.seance_id);

  const lienGroupes = await this.lienGrouperepo.find({
    where: {
      objet_type: 'seance',
      objet_id: In(seanceIds),
    },
    relations: ['groupe'],
  });

  // Grouper les lienGroupes par séance
  const groupesParSeance = new Map<number, LienGroupe[]>();
  for (const lg of lienGroupes) {
    const list = groupesParSeance.get(lg.objet_id) ?? [];
    list.push(lg);
    groupesParSeance.set(lg.objet_id, list);
  }

  // Attacher les groupes à chaque séance
  for (const seance of seances) {
    seance.lienGroupes = groupesParSeance.get(seance.seance_id) ?? [];
  }

  return seances.map(toSeanceVM);
  }

  async GetByDate(
    saison_id: number,
    date_debut: string,
    date_fin: string
  ): Promise<SeanceVM[]> {
    const dateDebut = startOfDay(new Date(date_debut));
    const dateFin = endOfDay(new Date(date_fin));
    const seances = await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
        date_seance: Between(dateDebut, dateFin),
      },
      relations: [
      'lieu',
      'cours',
      'professeursSeance',
      'professeursSeance.personne',
      ],
      order: {
        date_seance: 'ASC',
        heure_debut: 'ASC',
      }
    });

  if (seances.length === 0) return [];
  const seanceIds = seances.map(s => s.seance_id);

  const lienGroupes = await this.lienGrouperepo.find({
    where: {
      objet_type: 'seance',
      objet_id: In(seanceIds),
    },
    relations: ['groupe'],
  });

  // Grouper les lienGroupes par séance
  const groupesParSeance = new Map<number, LienGroupe[]>();
  for (const lg of lienGroupes) {
    const list = groupesParSeance.get(lg.objet_id) ?? [];
    list.push(lg);
    groupesParSeance.set(lg.objet_id, list);
  }

  // Attacher les groupes à chaque séance
  for (const seance of seances) {
    seance.lienGroupes = groupesParSeance.get(seance.seance_id) ?? [];
  }

  return seances.map(toSeanceVM);
  }
  async Get(id: number): Promise<SeanceVM> {
    const seance = await this.seanceRepo.findOne({
      where: { seance_id: id },
      relations: ['lieu', 'cours', 'professeursSeance', 'professeursSeance.personne'],
    });
     if (!seance) throw new NotFoundException('Séance non trouvée');

  const lienGroupes = await this.lienGrouperepo.find({
    where: { objet_type: 'seance', objet_id: seance.seance_id },
    relations: ['groupe'],
  });

  // On attache les liens à la séance
    seance.lienGroupes = lienGroupes;
    return toSeanceVM(seance);
  }
  async Add(projectId: number, seance: SeanceVM): Promise<SeanceVM> {
    const entity = toSeanceEntity(seance, projectId);
    const savedSeance = await this.seanceRepo.save(entity);
    await this.updateGroupesForSeance(savedSeance.seance_id, seance.groupes);
    return toSeanceVM(savedSeance);
  }
  async AddRange(
    projectId: number,
    seance: SeanceVM,
    date_debut_serie: Date,
    date_fin_serie: Date,
    jour_semaine: string
  ): Promise<SeanceVM[]> {
    const startDate = startOfDay(date_debut_serie);
    const endDate = endOfDay(date_fin_serie);
    const seances: SeanceVM[] = [];
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (currentDate.toLocaleString('fr-FR', { weekday: 'long' }) === jour_semaine) {
        const newSeance = { ...seance, date: new Date(currentDate) };
        seances.push(newSeance);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const entities = seances.map(s => toSeanceEntity(s, projectId));
    const savedSeances = await this.seanceRepo.save(entities);
 for (let i = 0; i < savedSeances.length; i++) {
  const saved = savedSeances[i];
  const original = seances[i];
  await this.updateGroupesForSeance(saved.seance_id, original.groupes);
  await this.updateProfForSeance(saved.seance_id, original.seanceProfesseurs);
}

return savedSeances.map(toSeanceVM);
  }

  async Update(projectId: number, seance: SeanceVM): Promise<SeanceVM> {
    const entity = toSeanceEntity(seance, projectId);
    const updatedSeance = await this.seanceRepo.save(entity);
    await this.updateGroupesForSeance(updatedSeance.seance_id, seance.groupes);
    await this.updateProfForSeance(updatedSeance.seance_id, seance.seanceProfesseurs);
    return toSeanceVM(updatedSeance);
  }

  async Delete(id: number): Promise<void> {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: id } });
    if (!seance) {
      throw new UnauthorizedException('SEANCE_NOT_FOUND');
    }
    await this.seanceRepo.delete({ seance_id: id });
    await this.updateGroupesForSeance(id, []);
    await this.updateProfForSeance(id, []);
  }

private async updateGroupesForSeance(seance_id: number, groupes: LienGroupe_VM[]) {
  await this.lienGrouperepo.delete({ objet_type: 'séance', objet_id: seance_id });

  const nouveauxLiens = groupes.map(vm => {
    const lien = new LienGroupe();
    lien.objet_type = 'séance';
    lien.objet_id = seance_id;
    lien.groupe_id = vm.id;
    return lien;
  });

  await this.lienGrouperepo.save(nouveauxLiens);
}

private async updateProfForSeance(seance_id: number, sp: SeanceProfesseurVM[]) {
  await this.SeanceProfesseurRepo.delete({  seance_id });

  const nouveauxLiens = sp.map(vm => {
    const lien = new SeanceProfesseur();
    lien.professeur_id = vm.professeur_id;
    lien.seance_id = seance_id;
    lien.minutes = vm.minutes;
    lien.minutes_payees = vm.minutes_payees ?? null;
    lien.taux_horaire = vm.taux_horaire ?? null;
    lien.statut = vm.statut;
    lien.info = vm.info ?? '';
    return lien;
  });

  await this.SeanceProfesseurRepo.save(nouveauxLiens);
}
}

function toSeanceVM(seance: Seance): SeanceVM {
  return {
    ...seance,
     seanceProfesseurs: seance.professeursSeance?.map(sp => ({
      seance_id: sp.seance_id,
      id: sp.id,
      professeur_id: sp.professeur_id,
      minutes: sp.minutes ?? null,
      taux_horaire: sp.taux_horaire ?? null,
      minutes_payees: sp.minutes_payees,
      statut: sp.statut,
      info: sp.info ?? '',
      nom: sp.personne?.nom ?? '',
      prenom: sp.personne?.prenom ?? '',
    })) ?? [],
    lieu_nom: seance.lieu?.nom ?? '',
    cours_nom: seance.coursEntity?.nom ?? '',
     groupes: seance.lienGroupes?.map(lg => ({
  id_lien: lg.id,
  id: lg.groupe_id ?? 0,
  nom: lg.groupeEntity?.nom ?? '',
})) ?? [],
  };
}

export function toSeanceEntity(obj: SeanceVM, saison_id: number): Seance {
  const entity = new Seance();

  entity.seance_id = obj.seance_id ?? 0; // Assurez-vous que l'ID est défini, sinon utilisez 0
  entity.saison_id = saison_id;
  entity.cours = obj.cours ?? 0;
  entity.libelle = obj.libelle;
  entity.type_seance = obj.type_seance;
  entity.date_seance = new Date(obj.date_seance);
  entity.heure_debut = obj.heure_debut;
  entity.duree_seance = obj.duree_seance;
  entity.lieu_id = obj.lieu_id;
  entity.statut = obj.statut;
  entity.age_minimum = obj.age_minimum ?? null;
  entity.age_maximum = obj.age_maximum ?? null;
  entity.place_maximum = obj.place_maximum ?? null;
  entity.essai_possible = !!obj.essai_possible;
  entity.nb_essai_possible = obj.nb_essai_possible ?? null;
  entity.info_seance = obj.info_seance ?? '';
  entity.convocation_nominative = !!obj.convocation_nominative;
  entity.afficher_present = !!obj.afficher_present;
  entity.rdv = obj.rdv ?? '';
  entity.est_limite_age_minimum = obj.est_limite_age_minimum !== undefined;
  entity.est_limite_age_maximum = obj.est_limite_age_maximum !== undefined;
  entity.est_place_maximum = obj.est_place_maximum !== undefined;

  return entity;
}

// src/utils/date.utils.ts

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function calculerHeureFin(heureDebut: string, dureeMinutes: number): string {
  const [hours, minutes] = heureDebut.split(':').map(Number);
  const debut = new Date();
  debut.setHours(hours, minutes, 0, 0);

  // Ajoute la durée
  debut.setMinutes(debut.getMinutes() + dureeMinutes);

  // Reformate en "HH:MM"
  const heure = debut.getHours().toString().padStart(2, '0');
  const minute = debut.getMinutes().toString().padStart(2, '0');

  return `${heure}:${minute}`;
}
