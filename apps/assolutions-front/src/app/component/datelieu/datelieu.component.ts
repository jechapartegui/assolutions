import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ValidationItem } from "@shared/compte/src";
import { lieu } from "@shared/compte/src/lib/lieu.interface";
import { ReglesDateLieu } from "apps/assolutions-front/src/class/regles";
import { GlobalService } from "apps/assolutions-front/src/services/global.services";
import { LieuNestService } from "apps/assolutions-front/src/services/lieu.nest.service";
import { SaisonService } from "apps/assolutions-front/src/services/saison.service";

@Component({
  selector: 'datelieu',
  templateUrl: './datelieu.component.html',
  styleUrls: ['./datelieu.component.css'],
})
export class DateLieuComponent implements OnInit  {
@Input() date: Date;
@Input() lieu_id: number;
@Input() duree: number;
@Input() heure: string;
@Input() jour_semaine: string;
@Input() creneau: boolean = false; // si true, au lieu de choisir une date, on choisit un créneau
@Input() Regles: ReglesDateLieu;
@Input() title:string  =$localize`Date de la séance`;
@Output() datelieuChange = new EventEmitter<donnee_date_lieu>();
edit: boolean = false;
save: string = null;
date_min: Date = null;
date_max: Date = null;
public lieux : lieu[] = [];

constructor(private lieuService: LieuNestService, private saison_serv:SaisonService) { }

    async ngOnInit(): Promise<void> {
this.save = JSON.stringify({
    date: this.date,
    lieu_id: this.lieu_id,
    duree: this.duree,
    heure: this.heure,
    jour_semaine: this.jour_semaine,
    creneau: this.creneau
});
        await this.lieuService.GetAll().then((lieux) => {
            this.lieux = lieux;
        });
        if(this.Regles.date_dans_saison){
            await this.saison_serv.Get(GlobalService.saison_active).then((saison) => {
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

        this.lieu_id = adh.lieu_id;
        this.duree = adh.duree; 
        this.heure = adh.heure;
        this.jour_semaine = adh.jour_semaine;
        this.creneau = adh.creneau;
        this.lieu_id = adh.lieu_id;

        this.edit = false;
    }
    public rDate:ValidationItem;
    public rCreneau:ValidationItem;
    public rHeure:ValidationItem;
    public rDuree:ValidationItem;
    public rLieu:ValidationItem;
    
    
    
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
       
    } else {
        this.rCreneau = { key: true, value: "" };
        this.rDate = GlobalService.instance.validerDate(this.date, this.date_min, this.date_max, this.Regles.date_obligatoire, this.title);
      }
      this.rHeure = GlobalService.instance.validerHeure(this.heure, this.Regles.heure_min, this.Regles.heure_max, this.Regles.heure_obligatoire, $localize`Heure de début`);
      this.rDuree = GlobalService.instance.validerNombre(this.duree, this.Regles.duree_min, this.Regles.duree_max, this.Regles.duree_obligatoire, $localize`Durée`);
      this.rLieu = GlobalService.instance.validerChaine(this.thisAdherent.Libelle, this.Regles.Libelle_min, this.Regles.Libelle_max, false, $localize`Surnom`);
      // valide si tout est bon
      this.estValid = this.rDate.key && this.rCreneau.key && this.rHeure.key && this.rDuree.key && this.rLieu.key;
      // 🔥 émettre vers le parent
      this.valid.emit(this.estValid);
    }
}

export type donnee_date_lieu = {
    date: Date;
    lieu_id: number;
    duree: number;
    heure: string;
    jour_semaine: string;
    creneau: boolean; // si true, au lieu de choisir une date, on choisit un créneau
}