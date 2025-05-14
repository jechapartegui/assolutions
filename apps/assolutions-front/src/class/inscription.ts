import { ItemContact } from "@shared/compte/src/lib/member.interface";
import { seance } from "./seance";
import { full_inscription_seance, inscription_seance } from "@shared/compte/src/lib/inscription_seance.interface";



export class InscriptionMaSeance {
      public datasource: full_inscription_seance;
      constructor(is: full_inscription_seance) {
            this.datasource = is;
            this.SetLibelle(this);
            this.Contacts = this.datasource.contacts;
            this.ContactsUrgence = this.datasource.contacts_prevenir;
            const foundContact = this.Contacts.find(x => x.Pref === true);
            this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
            this.ContactPrefereType = foundContact ? foundContact.Type : null;

      }
      public isVisible:boolean = false;
      public get StatutInscription(): string {
            return this.datasource.statut_inscription;
      }
      public set StatutInscription(v: string) {
            this.datasource.statut_inscription = v;
      }
      public get StatutSeance(): string {
            return this.datasource.statut_seance;
      }
      public set StatutSeance(v: string) {
            this.datasource.statut_seance = v;
      }
      
      public get RiderID(): number {
            return this.datasource.rider_id;
      }
      public set RiderID(v: number) {
            this.datasource.rider_id = v;
      }
      public get SeanceID(): number {
            return this.datasource.seance_id;
      }
      public set SeanceID(v: number) {
            this.datasource.seance_id = v;
      }
      public get ID(): number {
            return this.datasource.id;
      }
      public set ID(v: number) {
            this.datasource.id = v;
      }
      public set Nom(v: string) {
            this.datasource.nom = v;
            this.SetLibelle(this);
      }

      public get Prenom(): string {
            return this.datasource.prenom;
      }
      public set Prenom(v: string) {
            this.datasource.prenom = v;
            this.SetLibelle(this);
      }

      public get Surnom(): string {
            return this.datasource.surnom;
      }
      public set Surnom(v: string) {
            this.datasource.surnom = v;
            this.SetLibelle(this);
      }


      private _ContactPrefere: string;
      public get ContactPrefere(): string {
            return this._ContactPrefere;
      }
      public set ContactPrefere(v: string) {
            this._ContactPrefere = v;
      }

      private _ContactPrefereType: string;
      public get ContactPrefereType(): string {
            return this._ContactPrefereType;
      }
      public set ContactPrefereType(v: string) {
            this._ContactPrefereType = v;
      }



      public Contacts: ItemContact[];
      public ContactsUrgence: ItemContact[];





      public Libelle: string;


      public SetLibelle(adh: InscriptionMaSeance) {
            let t = adh.datasource;
            this.Libelle = "";
            if (t.prenom && t.prenom.length > 0) {
                  this.Libelle = t.prenom;
            }
            if (t.nom && t.nom.length > 0) {
                  if (this.Libelle && this.Libelle.length > 0) {
                        this.Libelle = this.Libelle + " " + t.nom;
                  } else {
                        this.Libelle = t.nom;
                  }
            }
            if (t.surnom && t.surnom.length > 0) {
                  if (this.Libelle && this.Libelle.length > 0) {
                        this.Libelle = this.Libelle + " " + t.surnom;
                  } else {
                        this.Libelle = t.surnom;
                  }
            }
      }
}


export class InscriptionSeance {
      public thisSeance: seance;
      public thisInscription: inscription_seance;

      public constructor(seance: seance, inscription: inscription_seance, rider_id: number) {
            this.thisSeance = seance;

            if (inscription) {
                  this.thisInscription = inscription;
            } else {
                this.thisInscription = {
                  id: 0,
                  date_inscription: null,
                  rider_id: rider_id,
                  seance_id: seance.seance_id,
                  statut_inscription: null,
                  statut_seance: null,
                  };

            }

      }
}



