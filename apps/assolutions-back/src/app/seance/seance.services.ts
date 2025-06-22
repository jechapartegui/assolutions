import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seance } from '../bdd/seance';
import { Between, In } from 'typeorm';
import { LienGroupe } from '../bdd/lien-groupe';
import { MesSeances, seance } from '@shared/compte/src/lib/seance.interface';
import { InscriptionSeance } from '../bdd/inscription-seance';
import { SeanceProfesseur } from '../bdd/seance_professeur';
import { ProfService } from '../prof/prof.services';

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
  async GetAll(saison_id: number): Promise<seance[]> {
    return (await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
      },
      order: {
        date_seance: 'ASC',
        heure_debut: 'ASC',
      },
    })).map(x => toSeance(x));
  }

  async GetByDate(
    saison_id: number,
    date_debut: string,
    date_fin: string
  ): Promise<seance[]> {
    const dateDebut = startOfDay(new Date(date_debut));
    const dateFin = endOfDay(new Date(date_fin));
    return (await this.seanceRepo.find({
      where: {
        saison_id: saison_id,
        date_seance: Between(dateDebut, dateFin),
      },
      order: {
        date_seance: 'ASC',
        heure_debut: 'ASC',
      },
    })).map(x => toSeance(x));
  }
  async Get(id: number): Promise<seance> {
    const seance = await this.seanceRepo.findOne({
      where: { seance_id: id },
      relations: ['lieu', 'cours'],
    });
    if (!seance) {
      throw new UnauthorizedException('SEANCE_NOT_FOUND');
    }
    return toSeance(seance);
  }
  async Add(projectId: number, seance: seance): Promise<seance> {
    const entity = toSeanceEntity(seance, projectId);
    const savedSeance = await this.seanceRepo.save(entity);
    return toSeance(savedSeance);
  }
  async AddRange(
    projectId: number,
    seance: seance,
    date_debut_serie: Date,
    date_fin_serie: Date,
    jour_semaine: string
  ): Promise<seance[]> {
    const startDate = startOfDay(date_debut_serie);
    const endDate = endOfDay(date_fin_serie);
    const seances: seance[] = [];
    
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
    
    return savedSeances.map(x => toSeance(x));
  }

  async Update(projectId: number, seance: seance): Promise<seance> {
    const entity = toSeanceEntity(seance, projectId);
    const updatedSeance = await this.seanceRepo.save(entity);
    return toSeance(updatedSeance);
  }

  async Delete(id: number): Promise<void> {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: id } });
    if (!seance) {
      throw new UnauthorizedException('SEANCE_NOT_FOUND');
    }
    await this.seanceRepo.delete({ seance_id: id });
  }


}

export function toSeance(row: Seance): seance {
  return {
    seance_id: row.seance_id,
    nom: row.libelle ?? '',
    date: new Date(row.date_seance),
    heureDebut: row.heure_debut,
    heureFin: calculerHeureFin(row.heure_debut, row.duree_seance),
    duree: row.duree_seance,
    lieu: row.lieu?.nom ?? '', // nom, libelle ou autre propriété à adapter
    lieuId: row.lieu_id,
    typeSeance: row.type_seance,
    coursId: row.cours ?? undefined,
    cours: row.coursEntity?.nom ?? '', // même remarque ici
    statut: row.statut,
    professeur: [], // à alimenter via ta logique métier
    ageMin: row.est_limite_age_minimum ? row.age_minimum : null,
    ageMax: row.est_limite_age_maximum ? row.age_maximum : undefined,
    placeMax: row.est_place_maximum ? row.place_maximum : undefined,
    essaiPossible: !!row.essai_possible,
    nbEssaiPossible: row.essai_possible ? row.nb_essai_possible : undefined,
    infoSeance: row.info_seance || '',
    convocationNominative: !!row.convocation_nominative,
    rdv: row.rdv || '',
    afficherPresent: !!row.afficher_present
  };
}
export function toSeanceEntity(obj: seance, saison_id: number): Seance {
  const entity = new Seance();

  entity.seance_id = obj.seance_id ?? 0; // Assurez-vous que l'ID est défini, sinon utilisez 0
  entity.saison_id = saison_id;
  entity.cours = obj.coursId ?? 0;
  entity.libelle = obj.nom;
  entity.type_seance = obj.typeSeance;
  entity.date_seance = new Date(obj.date);
  entity.heure_debut = obj.heureDebut;
  entity.duree_seance = obj.duree;
  entity.lieu_id = obj.lieuId;
  entity.statut = obj.statut;
  entity.age_minimum = obj.ageMin ?? null;
  entity.age_maximum = obj.ageMax ?? null;
  entity.place_maximum = obj.placeMax ?? null;
  entity.essai_possible = !!obj.essaiPossible;
  entity.nb_essai_possible = obj.essaiPossible ? obj.nbEssaiPossible ?? null : null;
  entity.info_seance = obj.infoSeance ?? '';
  entity.convocation_nominative = !!obj.convocationNominative;
  entity.afficher_present = !!obj.afficherPresent;
  entity.rdv = obj.rdv ?? '';
  entity.est_limite_age_minimum = obj.ageMin !== undefined;
  entity.est_limite_age_maximum = obj.ageMax !== undefined;
  entity.est_place_maximum = obj.placeMax !== undefined;

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
