import { AdherentListItem_VM } from './adherent-page.vm';
import { MailAddressVm, Seance_VM } from '@shared/index';

export type MailStep = 'TYPE' | 'PARAMS' | 'AUDIENCE' | 'BROUILLON' | 'ENVOI';

export type MailType =
  | 'relance'
  | 'annulation'
  | 'convocation'
  | 'bienvenue'
  | 'serie_seance'
  | 'vide';

export type AudienceType = 'TOUS' | 'INSCRITS' | 'GROUPE' | 'SEANCE_TOUS' | 'SEANCE_PRESENT' | 'SEANCE_CONVOQUE' | 'ADHERENT';

export interface GeneratedMailVm {
  adherent: AdherentListItem_VM;
  to: MailAddressVm;
  subject: string;
  html: string;
  status: 'READY' | 'SENT' | 'ERROR';
  error?: string;
}

export interface MailComposerVm {
  step: MailStep;
  loading: boolean;
  action: string;

  saisonId: number;

  mailType: MailType | null;
  audienceType: AudienceType;

  dateDebut: string;
  dateFin: string;

  selectedSeance: Seance_VM | null;
  serieSeances: Seance_VM[];
  sujetSerie: string;

  adherents: AdherentListItem_VM[];
  seances: Seance_VM[];

  selectedAdherentIds: number[];

  templateSubject: string;
  templateHtml: string;

  generated: GeneratedMailVm[];
  selectedGeneratedIndex: number;
}