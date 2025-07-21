import { FullInscriptionSeance_VM, InscriptionSeance_VM, InscriptionStatus_VM, SeanceStatus_VM } from "@shared/src/lib/inscription_seance.interface";
import { Seance_VM, } from "@shared/src";
import { ItemContact } from "@shared/src/lib/personne.interface";



export class InscriptionMaSeance {
      public datasource: FullInscriptionSeance_VM;
      constructor(is: FullInscriptionSeance_VM) {
            this.datasource = is;
            this.Libelle = is.person.libelle;
            this.Prenom = is.person.prenom;
            this.Surnom = is.person.surnom;
            this.Nom = is.person.nom;
            this.ID = is.id;
            this.SeanceID = is.seance_id;
            this.RiderID = is.person.id;
            this.Contacts = is.person.contact;
            this.ContactsUrgence = is.person.contact_prevenir;
            const foundContact = this.Contacts.find(x => x.Pref === true);
            this.ContactPrefere = foundContact ? foundContact.Value : $localize`Non saisi`;
            this.ContactPrefereType = foundContact ? foundContact.Type : null;

      }
      public isVisible:boolean = false;
      public get StatutInscription(): InscriptionStatus_VM {
            return this.datasource.statut_inscription;
      }
      public set StatutInscription(v: InscriptionStatus_VM) {
            this.datasource.statut_inscription = v;
      }
      public get StatutSeance(): SeanceStatus_VM {
            return this.datasource.statut_seance;
      }
      public set StatutSeance(v: SeanceStatus_VM) {
            this.datasource.statut_seance = v;
      }
      
      public RiderID: number;
      public SeanceID: number;
      public ID: number;
      public Nom:string;

      public Prenom:string;

      public Surnom:string;

      public libelle:string;


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



}


export class InscriptionSeance {
      public thisSeance: Seance_VM;
      public thisInscription: InscriptionSeance_VM;

      public constructor(seance: Seance_VM, inscription: InscriptionSeance_VM, rider_id: number) {
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



