import {
  PersonneLight_VM,
  Seance,
  SeanceProfesseur_Light,
} from '@shared/index';
export type InscriptionStatusDto =
  | 'présent'
  | 'absent'
  | 'convoqué'
  | 'essai'
  | null;

export interface MesSeanceDto {
  seance: {
    id: number;
  };
  statutInscription?: InscriptionStatusDto;
}

export interface PersonneDto {  
  id: number; 
}

export interface AdhMenDto {
  personne: PersonneDto;
  mes_seances: MesSeanceDto[];
}

export interface MesSeanceHydrated {
  seance: Seance;
  seanceProfesseurs: SeanceProfesseur_Light[];
  statutInscription: InscriptionStatusDto;
}

export interface AdhMenHydrated {
  personne: PersonneLight_VM;
  mes_seances: MesSeanceHydrated[];
}