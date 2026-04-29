export interface CommandeAdhesion {
  id?: number;
  referenceCommande: string;
  dateCommande?: string;
  statutCommande:
    | 'draft'
    | 'pending_payment'
    | 'paid'
    | 'failed'
    | 'cancelled'
    | 'refunded';

  payeur: Payeur;
  adherents: AdherentAdhesion[];

  codePromo?: string | null;
  montantCodePromo?: number | null;

  moyenPaiement?: string | null;
  montantTotal: number;

  source?: 'assolutions' | 'helloasso' | 'admin' | 'import';
  helloAsso?: HelloAssoCheckoutInfo | null;

  metadata?: Record<string, any>;
}
export interface Payeur {
  nom: string;
  prenom: string;
  email: string;
  raisonSociale?: string | null;

  telephone?: string | null;
  telephoneMobile?: string | null;

  adresse?: AdressePostale | null;
}
export interface AdherentAdhesion {
  id?: number;

  nom: string;
  prenom: string;
  prenomUsage?: string | null;

  sexe?: 'M' | 'F' | 'X' | null;
  nationalite?: string | null;
  paysNaissance?: string | null;
  dateNaissance?: string | null;

  email?: string | null;
  telephone?: string | null;
  telephoneMobile?: string | null;

  adresse?: AdressePostale | null;

  carteAdherent?: string | null;

  licence?: LicenceChoisie;
  options?: AdherentOptions;
  tuteurs?: TuteurLegal[];

  pieces?: AdherentPieces;
  consentements?: AdherentConsentements;

  montantTotal: number;
}
export interface AdressePostale {
  numeroVoie?: string | null;
  typeVoie?: string | null;
  nomVoie?: string | null;
  complement?: string | null;
  codePostal?: string | null;
  commune?: string | null;
  pays?: string | null;
}
export interface AdherentOptions {
  ajoutGroupesWhatsapp?: boolean | null;
  rejoindreCataRollerDerby?: boolean | null;
  situationHandicap?: boolean | null;
  refusCompteMaPetiteSponso?: boolean | null;
  montantRefusCompteMaPetiteSponso?: number | null;
}
export interface LicenceChoisie {
  tarifCode?: string | null;
  tarifLabel: string;
  montantTarif: number;

  refusIndividuelleAccident?: boolean | null;
  montantRefusIndividuelleAccident?: number | null;

  gratuitCetteEtape?: boolean | null;
  commentaireFinancierClub?: string | null;
}
export interface TuteurLegal {
  ordre: 1 | 2;
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
}
export interface AdherentConsentements {
  offresCommercialesEmail?: boolean | null;
  newslettersFederalesEmail?: boolean | null;

  informationAssuranceIndividuelleAccident?: boolean | null;
  protectionDonneesFederation?: boolean | null;
  charteTraitementDonnees?: boolean | null;
  garantieResponsabiliteCivile?: boolean | null;

  autorisationPhotoVideoClubFederation?: boolean | null;
}
export interface AdherentPieces {
  photoIdentiteUrl?: string | null;
  photoIdentiteNomFichier?: string | null;

  certificatMedicalUrl?: string | null;
  certificatMedicalNomFichier?: string | null;

  qrSportUtilise?: boolean | null;
  nomMedecin?: string | null;
  dateCertificatMedical?: string | null;
}
export interface HelloAssoCheckoutInfo {
  checkoutIntentId?: string | null;
  redirectUrl?: string | null;
  orderId?: string | null;
  returnedCode?: string | null;
  status?: 'created' | 'redirected' | 'returned' | 'paid' | 'failed';
  payloadSent?: any;
  payloadReturned?: any;
}