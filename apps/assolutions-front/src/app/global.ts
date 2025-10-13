import { GenericLink_VM } from "@shared/index";
import { Doc } from "../class/doc";


export class StaticClass{

  public ListeObjet:GenericLink_VM[] = [];
  public ClassComptable:ClassComptable[] = [];
  public TypeStock:TypeStock[] = [];
  public TypeTransaction:TypeTransaction[] = [];


  public downloadDocument(docu:Doc) {
    if (docu) {
      const blob = new Blob([docu.document], {
        type: 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      console.error('Aucun document disponible à télécharger');
    }
  }

  public formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  // Méthode pour ajouter un nouveau document (en remplacement)
  public uploadDocument(file: File) : Doc {
    const reader = new FileReader();
    let docu:Doc = new Doc();
    reader.onload = (e: any) => {
      const result = e.target.result;
      docu.titre = file.name;      
      docu.document = new Blob([result], { type: file.type });
    };
    reader.readAsArrayBuffer(file);
    return docu;
  }

  /** Encode un objet minimal {i,l?,r?} en base64-URL */
private toSlug(payload: { i: number; l?: string; r?: 0 | 1 }): string {
  const json = JSON.stringify(payload);                           // ex: {"i":1,"l":"mail","r":1}
  const b64  = btoa(unescape(encodeURIComponent(json)));          // base64
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,''); // base64url sans padding
}

/** Base des shortlinks */
private shortBase(): string {
  return `${location.origin}/s`;
}

/** 1) /ma-seance?id=1 → court */
public shortLinkSeance(id: number): string {
  return `${this.shortBase()}/${this.toSlug({ i: id })}`;
}
/** 2) /ma-seance?id=1&login=... → court */
public shortLinkSeanceWithLogin(id: number, login: string): string {
  return `${this.shortBase()}/${this.toSlug({ i: id, l: login })}`;
}
/** 3) /ma-seance?id=1&login=...&reponse=oui|non → court */
public hortLinkSeanceWithLoginAndAnswer(id: number, login: string, reponseOui: boolean): string {
  return `${this.shortBase()}/${this.toSlug({ i: id, l: login, r: reponseOui ? 1 : 0 })}`;
}
/** 4) /ma-seance?id=1&reponse=oui|non → court */
public shortLinkSeanceWithAnswer(id: number, reponseOui: boolean): string {
  return `${this.shortBase()}/${this.toSlug({ i: id, r: reponseOui ? 1 : 0 })}`;
}

  parseDate(dateString: string): Date | null {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }
  
    const dateParts = dateString.split('/');
    if (dateParts.length !== 3) {
      return null; // La chaîne n'est pas dans le format attendu, renvoyer null ou gérer l'erreur selon votre besoin.
    }
  
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1;
    const year = parseInt(dateParts[2]);
    return new Date(year, month, day);
  }
  
  parseExcelDate(excelDate: number): Date | null {
    if (typeof excelDate !== 'number') {
      return null;
    }
  
    const date = new Date(1900, 0, excelDate - 1);
  
    // Pour compenser un problème avec les années bissextiles en 1900,
    // ajustez l'année pour les dates avant le 1er mars 1900
    if (excelDate <= 60) {
      date.setFullYear(date.getFullYear() + 1);
    }
    date.setHours(12);
    return date;
  }
   convertListToString(list: string[]): string {
    return list.join(',');
  }
  convertStringToList(inputString: string): string[] {
    return inputString.split(',');
  }
  
     
}

const HEADERS_ADHERENT: Record<string, HeaderDef> = {
  id:           { label: 'ID', type: 'number' },
  nom:          { label: 'Nom', type: 'string', required: true },
  prenom:       { label: 'Prénom', type: 'string', required: true },
  date_naissance:{ label: 'Date de naissance', type: 'date', validators:['required'] },
  sexe:         { label: 'Sexe', type: 'boolean' }, // BOOL(oui/non) etc.
  login:        { label: 'Login', type: 'string', validators:['email'] },
  surnom:       { label: 'Surnom', type: 'string' },
  adresse_Street:{ label: 'Voie', type: 'string' },
  adresse_PostCode:{ label: 'Code Postal', type: 'string', validators:['postalcode'] },
  adresse_City: { label: 'Ville', type: 'string' },
  adresse_Country:{ label: 'Pays', type: 'string', default:'France' },
  contact_email_pref:{ label: 'Contact préféré email ?', type:'boolean' },
  contact_phone_pref:{ label: 'Contact préféré téléphone ?', type:'boolean' },
  contact_email: { label: 'Email', type:'string', validators:['email'] },
  contact_phone: { label: 'Téléphone', type:'string', validators:['phone'] },
  urgence_email: { label: 'Mail si urgence', type:'string' },
  urgence_email_nom:{ label: 'Contact mail si urgence', type:'string' },
  urgence_phone: { label: 'Téléphone si urgence', type:'string' },
  urgence_phone_nom:{ label: 'Contact téléphone si urgence', type:'string' },
  inscrit:      { label: 'Inscrit', type: 'boolean', default: false },
};
const HEADERS_LIEU = {
  id:           { label:'ID', type:'number' },
  nom:          { label:'Nom', type:'string', required:true },
  Street:       { label:'Voie', type:'string' },
  PostCode:     { label:'Code Postal', type:'string', validators:['postalcode'] },
  City:         { label:'Ville', type:'string' },
  Country:      { label:'Pays', type:'string', default:'France' },
  capacity:     { label:'Capacité', type:'number' },
  contact:      { label:'Contact', type:'string' },
  notes:        { label:'Notes', type:'string' },
} satisfies Record<string, HeaderDef>;
const HEADERS_COURS = {
  id:         { label:'ID', type:'number' },
  code:       { label:'Code', type:'string' },
  nom:        { label:'Nom du cours', type:'string', required:true },
  saisonId:   { label:'Saison (ID)', type:'number', validators:['required'] },
  lieuId:     { label:'Lieu (ID)', type:'relation', relation:{ entity:'Lieu', by:['id','name'] } },
  jour:       { label:'Jour de semaine', type:'enum', enumValues:['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'] },
  heure_debut:{ label:'Heure début', type:'string' },
  heure_fin:  { label:'Heure fin', type:'string' },
  capacite:   { label:'Capacité', type:'number' },
  profId:     { label:'Prof (ID)', type:'relation', relation:{ entity:'Professeur', by:['id','name'] } },
  statut:     { label:'Statut', type:'enum', enumValues:['Actif','Inactif','Archivé'] },
  info:       { label:'Infos', type:'string' },
} satisfies Record<string, HeaderDef>;
export const HEADERS_SEANCE = {
  id:          { label:'ID',            type: 'number'   as const },
  coursId:     { label:'Cours (ID)',    type: 'relation' as const,
                 relation:{ entity:'Cours', by:['id','code','name'] },
                 validators:['required'] },
  date:        { label:'Date',          type: 'date'     as const, validators:['required'] },
  heure_debut: { label:'Heure début',   type: 'string'   as const },
  heure_fin:   { label:'Heure fin',     type: 'string'   as const },
  lieuId:      { label:'Lieu (ID)',     type: 'relation' as const,
                 relation:{ entity:'Lieu', by:['id','name'] } },
  statut:      { label:'Statut',        type: 'enum'     as const, enumValues:['Planifiée','Faite','Annulée'] },
  info:        { label:'Infos',         type: 'string'   as const },
} satisfies Record<string, HeaderDef>;
const HEADERS_PAIEMENT = {
  id:          { label:'ID', type:'number' },
  adherentId:  { label:'Adhérent (ID ou login)', type:'relation', relation:{ entity:'Adherent', by:['id','code','name'] }, validators:['required'] },
  date:        { label:'Date paiement', type:'date', validators:['required'] },
  montant:     { label:'Montant', type:'money', validators:['required','nonzero'] },
  moyen:       { label:'Moyen', type:'enum', enumValues:['CB','Virement','Chèque','Espèces','HelloAsso'] },
  reference:   { label:'Référence', type:'string' },
  operationId: { label:'Opération (ID)', type:'number' },
  statut:      { label:'Statut', type:'enum', enumValues:['Payé','En attente','Refusé','Remboursé'] },
  commentaire: { label:'Commentaire', type:'string' },
} satisfies Record<string, HeaderDef>;
const HEADERS_STOCK = {
  id:           { label:'ID', type:'number' },
  reference:    { label:'Référence', type:'string', required:true },
  nom:          { label:'Nom', type:'string', required:true },
  categorie:    { label:'Catégorie', type:'string' },
  taille:       { label:'Taille', type:'string' },
  couleur:      { label:'Couleur', type:'string' },
  quantite:     { label:'Quantité', type:'number' },
  prix_unitaire:{ label:'Prix unitaire', type:'money' },
  emplacement:  { label:'Emplacement', type:'string' },
} satisfies Record<string, HeaderDef>;
const HEADERS_PROFESSEUR = {
  id:          { label:'ID (person)', type:'number' },
  firstName:   { label:'Prénom', type:'string', required:true },
  lastName:    { label:'Nom', type:'string', required:true },
  nickname:    { label:'Surnom', type:'string' },
  birthDate:   { label:'Date de naissance', type:'date' },
  gender:      { label:'Sexe', type:'boolean' },
  email:       { label:'Email', type:'string', validators:['email'] },
  phone:       { label:'Téléphone', type:'string', validators:['phone'] },
  projectId:   { label:'Projet (ID)', type:'number' },
  hourlyRate:  { label:'Taux horaire', type:'money' },
  status:      { label:'Statut', type:'enum', enumValues:['Actif','Inactif'] },
  vatNumber:   { label:'Numéro TVA', type:'string', validators:['vat'] },
  sirenNumber: { label:'Numéro SIREN', type:'string', validators:['siren'] },
  iban:        { label:'IBAN', type:'string', validators:['iban'] },
  info:        { label:'Infos', type:'string' },
}satisfies Record<string, HeaderDef>;
export const HEADERS_CATALOG: HeadersCatalog = {
  'Adherent':   HEADERS_ADHERENT,
  'Lieu':       HEADERS_LIEU,
  'Séance':     HEADERS_SEANCE,
  'Cours':      HEADERS_COURS,
  'Paiement':   HEADERS_PAIEMENT,
  'Professeur': HEADERS_PROFESSEUR,
  'Stock':      HEADERS_STOCK,
};

export type ImportEntity =
  | 'Adherent' | 'Cours' | 'Séance' | 'Lieu' | 'Paiement' | 'Stock' | 'Professeur';

export type HeaderType =
  | 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'relation' | 'array' | 'money';

export interface HeaderDef {
  label: string;
  type: HeaderType;
  required?: boolean;
  enumValues?: string[];
  relation?: { entity: ImportEntity; by: ('id'|'code'|'name')[] };
  default?: any;
  validators?: string[];
}

export type HeadersCatalog = Record<ImportEntity, Readonly<Record<string, HeaderDef>>>;




export enum code_alert {
  OK = 1,
  KO = 2,
  Warning = 3,
  Info = 4
}
export enum jour_semaine{
  lundi = 1,
  mardi = 2,
  mercredi =3,
  jeudi = 4,
  vendredi = 5,
  samedi = 6,
  dimanche = 7
}
export  const configapi= [
  {
    country: "France",
    apiaddress: 'https://api-adresse.data.gouv.fr/',
    apisportscourt: 'https://equipements.sports.gouv.fr/api/records/1.0/search/?dataset=data-es&',
  }
]

export class ClassComptable{numero:string; libelle:string }
export class TypeStock{id:number =0;categorie: string| null = null; libelle: string = $localize`Autre`

  equals(other: TypeStock): boolean {
    return this.categorie === other.categorie && other.libelle === this.libelle;
  }
}
export class TypeTransaction{class_compta:number; libelle:string }