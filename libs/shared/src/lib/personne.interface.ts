import { Adresse } from "./adresse.interface";
import { corelistobject } from "./corelistobject.interface";

export class PersonneLight_VM extends corelistobject {
     prenom:string = "";
     surnom:string = "";
     date_naissance:Date = new Date();
     sexe:boolean=false;
}

export class Personne_VM extends PersonneLight_VM {
    adresse: Adresse = new Adresse();
    compte:number;
    contact:ItemContact[] = [];
    contact_prevenir:ItemContact[]= [];
    login:string;
    photo:any;
    archive:boolean = false;


    // ✅ override optionnel (si tu veux forcer un libellé “baked”)
  private _libelleOverride?: string;

  get ContactPrefereType(): string {
    const contactPrefere = this.contact.find(c => c.Pref);
    return contactPrefere ? contactPrefere.Type : '';
  }

  // ✅ Getter stable : si override => on l’affiche, sinon calcul normal
  get libelle(): string {
    if (this._libelleOverride && this._libelleOverride.trim().length > 0) {
      return this._libelleOverride;
    }
    const parts: string[] = [];
    if (this.prenom) parts.push(this.prenom);
    if (this.nom) parts.push(this.nom);
    if (this.surnom) parts.push(this.surnom);
    return parts.join(' ');
  }

  // ✅ Setter : plus jamais d’erreur “only a getter”
  set libelle(v: string) {
    this._libelleOverride = (v ?? '').toString();
  }

  /** Appelle le getter sur *n'importe quel* objet (instance ou JSON plat). */
  static callLibelle(obj: any): string {
    const get = Object.getOwnPropertyDescriptor(Personne_VM.prototype, 'libelle')?.get;
    return get ? get.call(obj) : '';
  }

  /**
   * “Baked” version safe :
   * - Ajoute un accessor get/set sur l’objet
   * - Permet libelle = "..." sans crash
   * - Conserve un fallback calculé si override vide
   */
  static bakeLibelle(obj: any): void {
    const value = Personne_VM.callLibelle(obj);
    Object.defineProperty(obj, 'libelle', {
      get() {
        // si quelqu’un a forcé un libellé
        if ((this as any)._libelleOverride && (this as any)._libelleOverride.trim().length > 0) {
          return (this as any)._libelleOverride;
        }
        // sinon on recalcule à partir des champs (marche pour JSON plat)
        const parts: string[] = [];
        if ((this as any).prenom) parts.push((this as any).prenom);
        if ((this as any).nom) parts.push((this as any).nom);
        if ((this as any).surnom) parts.push((this as any).surnom);
        return parts.join(' ');
      },
      set(v: string) {
        (this as any)._libelleOverride = (v ?? '').toString();
      },
      enumerable: true,
      configurable: true
    });

    // optionnel : initialise l’override avec la valeur calculée du moment
    (obj as any)._libelleOverride = value;
  }
  }



export interface ItemContact {

  Type: string;
  Value: string;
  Notes: string;
  Pref: boolean;
}