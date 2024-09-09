import { ItemContact } from "./contact";
import { seance } from "./seance";

export class inscription_seance {

      public id: number = 0;
      public rider_id: number;
      public seance_id: number;
      public date_inscription: Date = new Date();
      public statut_inscription: StatutPresence = null;
      public statut_seance: StatutPresence = null;
      public nom: string;
      public prenom: string;
      public surnom: string;
      public contacts: string;
      public contacts_prevenir: string;


}
export enum StatutPresence {
      Présent = "présent",
      Absent = "absent",
      Convoqué = "convoqué",
      Essai = "essai"

}

export class InscriptionMaSeance {
      public datasource: inscription_seance;
      constructor(is: inscription_seance) {
            this.datasource = is;
            this.SetLibelle(this);
            this.Contacts = JSON.parse(this.datasource.contacts);
            this.ContactsUrgence = JSON.parse(this.datasource.contacts_prevenir);
            const foundContact = this.Contacts.find(x => x.Pref === true);
            this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
            this.ContactPrefereType = foundContact ? foundContact.Type : null;

      }
      public get StatutInscription(): StatutPresence {
            return this.datasource.statut_inscription;
      }
      public set StatutInscription(v: StatutPresence) {
            this.datasource.statut_inscription = v;
      }
      public get StatutSeance(): StatutPresence {
            return this.datasource.statut_seance;
      }
      public set StatutSeance(v: StatutPresence) {
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
                  this.thisInscription = new inscription_seance();
                  this.thisInscription.id = 0;
                  this.thisInscription.date_inscription = null;
                  this.thisInscription.rider_id = rider_id;
                  this.thisInscription.seance_id = seance.seance_id;
                  this.thisInscription.statut_inscription = null;
                  this.thisInscription.statut_seance = null;
            }

      }
}



