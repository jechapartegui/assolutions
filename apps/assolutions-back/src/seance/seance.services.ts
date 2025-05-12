import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seance } from '../app/bdd/seance';
import { Between, In } from 'typeorm';
import { LienGroupe } from '../app/bdd/lien-groupe';
import { MesSeances } from '@shared/compte/src/lib/seance.interface';
import { InscriptionSeance } from '../app/bdd/inscription-seance';
import { SeanceProfesseur } from '../app/bdd/seance_professeur';

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
    private readonly inscriptionseancerepo: Repository<InscriptionSeance>
  ) // @InjectRepository(Projet)
  // private readonly projetRepo: Repository<Projet>,
  {}

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
        maSeance.statutInscription = ins!.statut_inscription;
        filteredSeances.push(maSeance);
      } else {
        let ajout: boolean = true;
        // filter age
        if (seance.est_limite_age_minimum && age < seance.age_minimum) {
          ajout = false;
        }
        if (seance.est_limite_age_maximum && age < seance.age_maximum) {
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
    seances.filter((s) => { 
      s.seance_id in profseance.map((p) => p.seance_id)
    }); 
    const filteredSeances: MesSeances[] = [];

    for (const seance of seances) {
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
