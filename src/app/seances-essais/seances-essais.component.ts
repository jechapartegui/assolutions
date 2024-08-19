import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Adherent } from 'src/class/adherent';
import { KeyValuePair } from 'src/class/keyvaluepair';
import { professeur } from 'src/class/professeur';
import { Seance } from 'src/class/seance';
import { AdherentService } from 'src/services/adherent.service';
import { LieuService } from 'src/services/lieu.service';
import { ProfesseurService } from 'src/services/professeur.service';
import { SeancesService } from 'src/services/seance.service';

@Component({
  selector: 'app-seances-essais',
  templateUrl: './seances-essais.component.html',
  styleUrls: ['./seances-essais.component.css']
})
export class SeancesEssaisComponent implements OnInit {
  public date_debut: string = new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)).toISOString().split('T')[0];;
  public date_fin: string = new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7)).toISOString().split('T')[0];;
  public thisAdherent: Adherent = null;
  public ListeSeance: Seance[] = []
  public days: string[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  public listeprof: professeur[];
  public listelieu: KeyValuePair[];
  public project_id: number;
  constructor(public route: ActivatedRoute, public sean_serv: SeancesService, public rider_serv: AdherentService, public prof_serv: ProfesseurService, public lieuserv: LieuService) {

  }
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if ('id' in params) {
        this.project_id = params['id'];
      } else {
        return;
      }}
    );
   
        this.sean_serv.GetPlageDate(this.date_debut, this.date_fin, this.project_id).then((seances) => {
          this.ListeSeance = seances.map(x => new Seance(x));
          this.ListeSeance.sort((a, b) => {
            const nomA = a.heure_debut // Ignore la casse lors du tri
            const nomB = b.heure_debut;
            let comparaison = 0;
            if (nomA > nomB) {
              comparaison = 1;
            } else if (nomA < nomB) {
              comparaison = -1;
            }

            return comparaison; // Inverse pour le tri descendant
          });
        });
  }
  getSeancesForDay(dayIndex: number): any[] {
    return this.ListeSeance.filter(seance => {
      const date = new Date(seance.date_seance); // Convertir en objet Date
      return date.getDay() === dayIndex;
    });
  }
  

}
