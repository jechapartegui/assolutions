import { corelistobject } from "./corelistobject.interface";
import { Groupe } from "./groupes.interface";
import { Lieu_VM } from "./lieu.interface";
import { PersonneLight_VM, ProfLight_VM } from "./personne.interface";

export interface Cours {
  id?: number;

  // DTO fields
  project_id: number;
  nom: string;
  jour_semaine: string;
  heure: string;
  duree: number;
  prof_principal_id: number;
  lieu_id: number;

  age_minimum?: number | null;
  age_maximum?: number | null;

  saison_id: number;

  place_maximum?: number | null;

  convocation_nominative?: boolean;
  afficher_present?: boolean;
  essai_possible?: boolean;

  appointment?: string | null;
}

export class Cours_VM extends corelistobject {
  jour_semaine: string;
  heure: string= "11:00";
  duree: number = 0;
  prof_principal_id: number= 0;
  lieu_id: number= 0;
  saison_id: number= 0;

  age_minimum?: number;
  age_maximum?: number;
  place_maximum?: number;
  essai_possible:boolean =false;

  convocation_nominative: boolean=false;
  afficher_present: boolean=false;
  est_limite_age_minimum: boolean=false;
  est_limite_age_maximum: boolean=false;
  est_place_maximum: boolean=false;
  rdv?:string = "";
  // Champs enrichis
  lieu:Lieu_VM

  // Professeurs liés
  professeursCours: PersonneLight_VM[] = [];

  // Groupes liés
  groupes: Groupe[] =[];
}


export function mapCoursToVM(
  cours: Cours,
  listeLieux: Lieu_VM[],
  listeGroupes: Groupe[],
  listeProfesseurs: ProfLight_VM[],
  options?: {
    groupesByCoursId?: Record<number, number[]>;
    contratsByCoursId?: Record<number, number[]>; // coursId -> [contratId]
  }
): Cours_VM {
  const vm = new Cours_VM();

  vm.id = cours.id ?? 0;
  vm.nom = cours.nom ?? "";

  vm.jour_semaine = cours.jour_semaine;
  vm.heure = cours.heure ?? "11:00";
  vm.duree = cours.duree ?? 0;

  // prof_principal_id référence un contrat professeur.
  vm.prof_principal_id = cours.prof_principal_id ?? 0;

  vm.lieu_id = cours.lieu_id ?? 0;
  vm.saison_id = cours.saison_id ?? 0;

  vm.age_minimum = cours.age_minimum ?? undefined;
  vm.age_maximum = cours.age_maximum ?? undefined;
  vm.place_maximum = cours.place_maximum ?? undefined;

  vm.convocation_nominative = !!cours.convocation_nominative;
  vm.afficher_present = !!cours.afficher_present;
  vm.essai_possible = !!cours.essai_possible;

  vm.rdv = cours.appointment ?? "";

  vm.est_limite_age_minimum = vm.age_minimum != null;
  vm.est_limite_age_maximum = vm.age_maximum != null;
  vm.est_place_maximum = vm.place_maximum != null;

  // Lieu
  vm.lieu = listeLieux.find(l => l.id === vm.lieu_id) ?? ({} as Lieu_VM);

  // contratsByCoursId contient des ids de contrat, tandis que ProfLight_VM.id
  // reste l'id de la personne. Il faut donc comparer avec contrat_id.
  const contratIds = options?.contratsByCoursId?.[vm.id] ?? [];
  vm.professeursCours = listeProfesseurs.filter((p) =>
    contratIds.includes(Number(p.contrat_id ?? p.id ?? 0))
  );

  // Groupes
  const groupeIds = options?.groupesByCoursId?.[vm.id] ?? [];
  vm.groupes = groupeIds
    .map(id => listeGroupes.find(g => g.id === id))
    .filter((g): g is Groupe => !!g);

  return vm;
}

export function mapCoursListToVM(
  coursList: Cours[],
  listeLieux: Lieu_VM[],
  listeGroupes: Groupe[],
  listeProfesseurs: ProfLight_VM[],
  options?: {
    groupesByCoursId?: Record<number, number[]>;
    contratsByCoursId?: Record<number, number[]>;
  }
): Cours_VM[] {
  return coursList.map(c => mapCoursToVM(c, listeLieux, listeGroupes, listeProfesseurs, options));
}

export class ContratProfesseur_VM {
  id:number;
  personne:PersonneLight_VM;
  type_contrat:string;
  type_remuneration:string;
}
