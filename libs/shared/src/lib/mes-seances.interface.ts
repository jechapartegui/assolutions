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
export type PresenceStatusDto =
  | 'présent'
  | 'absent'
  | null;

export interface MesSeanceDto {
  seance: {
    id: number;
  };
  accesInscription?: boolean;
  dansGroupeAdherent?: boolean;
  essaiDisponible?: boolean;
  groupeIds?: number[];
  groupeNoms?: string[];
  statutInscription?: InscriptionStatusDto;
  statutPrésence?: PresenceStatusDto;
}

export interface PersonneDto {
  id: number;
  inscrit?: boolean;
}

export interface AdhMenDto {
  personne: PersonneDto;
  mes_seances: MesSeanceDto[];
}

export interface MesSeanceHydrated {
  seance: Seance;
  seanceProfesseurs: SeanceProfesseur_Light[];
  accesInscription?: boolean;
  dansGroupeAdherent?: boolean;
  essaiDisponible?: boolean;
  groupeIds?: number[];
  groupeNoms?: string[];
  statutInscription: InscriptionStatusDto;
  statutPrésence: PresenceStatusDto;
}

export interface AdhMenHydrated {
  personne: PersonneLight_VM;
  mes_seances: MesSeanceHydrated[];
}
