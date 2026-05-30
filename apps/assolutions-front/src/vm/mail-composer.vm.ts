import { AdherentListItem_VM } from './adherent-page.vm';
import { MailAddressVm, Seance_VM } from '@shared/index';

export type MailStep = 'TYPE' | 'PARAMS' | 'AUDIENCE' | 'BROUILLON';

export type MailType =
  | 'relance'
  | 'annulation'
  | 'convocation'
  | 'bienvenue'
  | 'serie_seance'
  | 'vide';

export type AudienceType =
  | 'TOUS'
  | 'INSCRITS'
  | 'GROUPE'
  | 'ELIGIBLES_SEANCE'
  | 'ADHERENT';

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

  allSeances: Seance_VM[];
  seances: Seance_VM[];

  selectedSeance: Seance_VM | null;
  serieSeances: Seance_VM[];
  sujetSerie: string;

  adherents: AdherentListItem_VM[];
  selectedAdherentIds: number[];

  selectedGroupId: number | null;
  audienceSearch: string;

  templateSubject: string;
  templateHtml: string;

  generated: GeneratedMailVm[];
  selectedGeneratedIndex: number;

  paramsValidated: boolean;
  sendInfo: string;
}