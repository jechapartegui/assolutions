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

export class ClassComptable{numero:number; libelle:string }
export class TypeStock{id:number =0;categorie: string| null = null; libelle: string = $localize`Autre`

  equals(other: TypeStock): boolean {
    return this.categorie === other.categorie && other.libelle === this.libelle;
  }
}
export class TypeTransaction{class_compta:number; libelle:string }