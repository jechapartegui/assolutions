import { corelistobject } from "./corelistobject.interface";
import { Cours_VM } from "./cours.interface";
import { Groupe } from "./groupes.interface";
import { Lieu_VM } from "./lieu.interface";
import {  PersonneLight_VM, ProfLight_VM } from "./personne.interface";

export interface Seance {
  id: number;
  seance_id: number;
  project_id: number;

  saison_id: number;

  cours?: number | null;
  label?: string | null;

  type_seance: string;   // enum DB (string)
  date_seance: string;
  heure_debut: string;   // max 10
  duree_seance: number;
  heure_fin?: string;     // max 10
  lieu_id: number;
  statut: string;        // enum DB (string)

  age_minimum?: number | null;
  age_maximum?: number | null;

  place_maximum?: number | null;

  essai_possible?: boolean;
  nb_essai_possible?: number | null;

  info_seance?: string | null;

  convocation_nominative?: boolean;
  afficher_present?: boolean;

  appointment?: string | null;

  est_limite_age_minimum?: boolean;
  est_limite_age_maximum?: boolean;
  est_place_maximum?: boolean;
}

export type CreateSeanceDto = Omit<Seance, 'id' | 'project_id'>;
export type UpdateSeanceDto = Partial<Omit<Seance, 'id' | 'project_id'>>;


export interface MesSeances_VM {
    seance:Seance_VM
    statutInscription?: 'présent' | 'absent' | 'convoqué' | 'essai'; // Peut être null -> optionnel
    statutPrésence?: 'présent' | 'absent'; // Peut être null -> optionnel
  }
  
  export interface AdherentSeance_VM {
    personne:PersonneLight_VM
    mes_seances: MesSeances_VM[];
  }

// shared/models/seance.dto.ts

export class Seance_VM extends corelistobject {
  saison_id: number = 0;
  cours: number= 0;
  type_seance: 'ENTRAINEMENT' | 'MATCH' | 'SORTIE' | 'EVENEMENT';
  date_seance: Date = new Date();
  heure_debut: string ="11:00";
  duree_seance: number = 0;
  heure_fin: string ="11:00";
  lieu_id: number = 0;
  statut: 'prévue' | 'réalisée' | 'annulée' = 'prévue';
  age_minimum: number | null = null;
  age_maximum: number | null= null;
  place_maximum: number | null= null;
  essai_possible: boolean = false;
  nb_essai_possible: number | null;
  info_seance: string="";
  convocation_nominative: boolean = false;
  afficher_present: boolean = false;
  rdv: string="";
  est_limite_age_minimum: boolean = false;
  est_limite_age_maximum: boolean = false;
  est_place_maximum: boolean = false;

  lieu_nom?: string; // Nom du lieu, optionnel
  cours_nom?: string; // Nom du cours, optionnel

  // Les entités de lien
  seanceProfesseurs: ProfLight_VM[] = [];

  groupes: Groupe[] = []; // Liste des groupes liés à la séance
}

export enum StatutSeance{
  prévue='prévue', réalisée= 'réalisée', annulée ='annulée'
}

export class SeanceProfesseur_VM {
  id: number;
  seance_id: number;
  personne : PersonneLight_VM;
  statut: 'prévue' | 'réalisée' | 'annulée';
  minutes: number;
  cout:number;
  info: string}

export function calculerHeureFin(heureDebut: string, dureeMinutes: number): string {
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

type SeanceProfLinkRow = { seance_id: number; contrat_id: number };

function toBool(v: any): boolean {
  return v === true;
}

function toDate(dateStr: string | null | undefined): Date {
  // attend "YYYY-MM-DD" ou ISO
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function mapSeanceToVM(
  s: Seance,
  ctx: {
    lieuxById: Map<number, Lieu_VM>;
    coursById: Map<number, Cours_VM>;
    profsByContratId: Map<number, ProfLight_VM>;
    contratsBySeanceId: Map<number, number[]>; // seanceId -> [contratId]
  }
): Seance_VM {
  const vm = new Seance_VM();

  // corelistobject
  vm.id = s.seance_id ?? 0;
  vm.nom = (s.label ?? '').toString(); // label -> nom (corelistobject)

  // champs
  vm.saison_id = s.saison_id ?? 0;
  vm.cours = s.cours ?? 0;

  vm.type_seance = s.type_seance as any; // 'ENTRAINEMENT'|'MATCH'|'SORTIE'|'EVENEMENT'
  vm.date_seance = toDate(s.date_seance);
  vm.heure_debut = s.heure_debut ?? '11:00';
  vm.duree_seance = s.duree_seance ?? 0;

  vm.lieu_id = s.lieu_id ?? 0;
  vm.statut = (s.statut as any) ?? 'prévue';

  vm.age_minimum = s.age_minimum ?? null;
  vm.age_maximum = s.age_maximum ?? null;
  vm.place_maximum = s.place_maximum ?? null;

  vm.essai_possible = toBool(s.essai_possible);
  vm.nb_essai_possible = s.nb_essai_possible ?? null;

  vm.info_seance = (s.info_seance ?? '') as string;
  vm.convocation_nominative = toBool(s.convocation_nominative);
  vm.afficher_present = toBool(s.afficher_present);

  vm.rdv = (s.appointment ?? '') as string;

  // flags: si DB fournit déjà, on respecte, sinon on calcule
  vm.est_limite_age_minimum =
    s.est_limite_age_minimum !== undefined ? !!s.est_limite_age_minimum : vm.age_minimum !== null;

  vm.est_limite_age_maximum =
    s.est_limite_age_maximum !== undefined ? !!s.est_limite_age_maximum : vm.age_maximum !== null;

  vm.est_place_maximum =
    s.est_place_maximum !== undefined ? !!s.est_place_maximum : vm.place_maximum !== null;

  // enrichissements simples
  vm.lieu_nom = ctx.lieuxById.get(vm.lieu_id)?.nom;
  vm.cours_nom = ctx.coursById.get(vm.cours)?.nom ?? s.label ?? '';

  // profs liés (par contrat)
  const contratIds = ctx.contratsBySeanceId.get(vm.id) ?? [];
  vm.seanceProfesseurs = contratIds
    .map(cid => ctx.profsByContratId.get(cid))
    .filter((p): p is ProfLight_VM => !!p);

  // groupes : tu les rempliras via ton service de lien groupe si besoin
  vm.groupes = [];

  return vm;
}

export function mapSeanceListToVM(
  seances: Seance[],
  ctx: {
    lieuxById: Map<number, Lieu_VM>;
    coursById: Map<number, Cours_VM>;
    profsByContratId: Map<number, ProfLight_VM>;
    contratsBySeanceId: Map<number, number[]>;
  }
): Seance_VM[] {
  return seances.map(s => mapSeanceToVM(s, ctx));
}



