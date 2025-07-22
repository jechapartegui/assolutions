import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ValidationItem } from "@shared/src";
import { Lieu_VM } from "@shared/src/lib/lieu.interface";
import type { ReglesDateLieu } from "apps/assolutions-front/src/class/regles";
import { GlobalService } from "apps/assolutions-front/src/services/global.services";
import { LieuNestService } from "apps/assolutions-front/src/services/lieu.nest.service";
import { SaisonService } from "apps/assolutions-front/src/services/saison.service";

@Component({
  selector: 'datelieu',
  templateUrl: './datelieu.component.html',
  styleUrls: ['./datelieu.component.css'],
})
export class DateLieuComponent implements OnInit  {
@Input() ID: number = 0;
@Input() date: Date;
@Input() lieu_id: number;
@Input() duree: number;
@Input() date_debut: Date = null; // pour les créneaux, date de début
@Input() date_fin: Date = null; // pour les créneaux, date de fin
@Input() serie:boolean = false; // si true, on est dans une série de créneaux
@Input() heure: string;
@Input() jour_semaine: string;
@Input() creneau: boolean = false; // si true, au lieu de choisir une date, on choisit un créneau
@Input() Regles: ReglesDateLieu;
@Input() title:string  =$localize`Date de la séance`;
@Output() datelieuChange = new EventEmitter<donnee_date_lieu>();
 estValid:boolean;
@Output() valid = new EventEmitter<boolean>();
edit: boolean = false;
save: string = null;
date_min: Date = null;
date_max: Date = null;
public lieux : Lieu_VM[] = [];

constructor(private lieuService: LieuNestService, private saison_serv:SaisonService, private dbs:GlobalService) { }

    async ngOnInit(): Promise<void> {
let ddl: donnee_date_lieu = {
    date: this.date,
    lieu_id: this.lieu_id,
    duree: this.duree,
    heure: this.heure,
    jour_semaine: this.jour_semaine,
    date_debut: this.date_debut,
    date_fin: this.date_fin,
};
this.save = JSON.stringify(ddl);
        await this.lieuService.GetAll().then((lieux) => {
            this.lieux = lieux;
        });
        if(this.Regles.date_dans_saison){
            await this.saison_serv.Get(this.dbs.saison_active).then((saison) => {
                this.date_min = saison.date_debut;
                this.date_max = saison.date_fin;
            })
        } else {
            this.date_min = this.Regles.date_min;
            this.date_max = this.Regles.date_max;
        }
    }

    ngOnChanges(): void {
     this.validerTout();
    }
    
     public Save(){
        this.datelieuChange.emit();
        this.edit = false;
     }
    public Cancel(){
        let adh:donnee_date_lieu = JSON.parse(this.save);
        this.duree = adh.duree; 
        this.heure = adh.heure;
        this.jour_semaine = adh.jour_semaine;        
        this.lieu_id = adh.lieu_id;
        this.date = adh.date;
        this.date_debut = adh.date_debut;
        this.date_fin = adh.date_fin;      

        this.edit = false;
    }
    public rDate:ValidationItem;
    public rDateDebut:ValidationItem;
    public rDateFin:ValidationItem;
    public rCreneau:ValidationItem;
    public rHeure:ValidationItem;
    public rDuree:ValidationItem;
    public rLieu:ValidationItem;
    
    calculerHeureFin(heureDebut: string, dureeMinutes: number): string {
  const [hours, minutes] = heureDebut.split(':').map(Number);
  const debut = new Date();
  debut.setHours(hours, minutes, 0, 0);

  // Ajoute la durée
  debut.setMinutes(debut.getMinutes() + dureeMinutes);

  // Reformate en "HH:MM"
  const heure = debut.getHours().toString().padStart(2, '0');
  const minute = debut.getMinutes().toString().padStart(2, '0');

  return `${heure}:${minute}`;
}
    
    public validerTout(): void {
   
      if(this.creneau){
        if(this.Regles.creneau_obligatoire){
            if(this.jour_semaine in ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']){
                this.rCreneau = { key: true, value: "" };
            } else {
                this.rCreneau = { key: false, value: $localize`Le créneau doit être un jour de la semaine` };
            }
            } else {
                this.rCreneau = { key: true, value: "" };
            }
          this.rDate = { key: true, value: "" };
        if(this.serie){
            this.rDateDebut = GlobalService.instance.validerDate(this.date_debut, this.date_min, this.date_max, true, $localize`Date de début`);
            this.rDateFin = GlobalService.instance.validerDate(this.date_fin, this.date_min, this.date_max, true, $localize`Date de fin`);
        }
    } else {
        this.rCreneau = { key: true, value: "" };
        this.rDateDebut = { key: true, value: "" };
        this.rDateFin = { key: true, value: "" };
        this.rDate = GlobalService.instance.validerDate(this.date, this.date_min, this.date_max, this.Regles.date_obligatoire, this.title);
      }
      this.rHeure = GlobalService.instance.validerHeure(this.heure, this.Regles.heure_min, this.Regles.heure_max, this.Regles.heure_obligatoire, $localize`Heure de début`);
      this.rDuree = GlobalService.instance.validerNombre(this.duree, this.Regles.duree_min, this.Regles.duree_max, this.Regles.duree_obligatoire, $localize`Durée`);
      this.rLieu = GlobalService.instance.validerSaisie(this.lieu_id, this.Regles.lieu_obligatoire, $localize`Lieu`);
      // valide si tout est bon
      this.estValid = this.rDate.key && this.rCreneau.key && this.rHeure.key && this.rDuree.key && this.rLieu.key && (this.serie ? (this.rDateDebut.key && this.rDateFin.key) : true); 
      // 🔥 émettre vers le parent
      this.valid.emit(this.estValid);
    }
    thislieu(lieu_id: number): Lieu_VM {
        return this.lieux.find(l => l.id === lieu_id);
    }
    getLieuNom(lieu_id: number): string {
  const lieu = this.thislieu(lieu_id);
  return lieu?.nom || $localize`:@@noLieu:pas de lieu trouvé`;
}
getLieuAdresse(lieu_id: number): string {
  const lieu = this.thislieu(lieu_id);
  return lieu ? `${lieu.adresse.Street}, ${lieu.adresse.PostCode} ${lieu.adresse.City}` : $localize`:@@noLieu:pas de lieu trouvé`;
}
}

export type donnee_date_lieu = {
    date: Date;
    lieu_id: number;
    duree: number;
    heure: string;
    jour_semaine: string;
    date_debut: Date;
    date_fin: Date;
}