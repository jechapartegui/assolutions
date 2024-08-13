import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Professeur } from 'src/class/professeur';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { ProfesseurService } from 'src/services/professeur.service';

@Component({
  selector: 'app-professeur',
  templateUrl: './professeur.component.html',
  styleUrls: ['./professeur.component.css']
})
export class ProfesseurComponent implements OnInit {
  public action: string;
  public  ListeProf:Professeur[];
  constructor(private prof_serv:ProfesseurService, private router:Router){

  }
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les comptes`;

    if (GlobalService.is_logged_in) {

      if ((GlobalService.menu === "ADHERENT") || (GlobalService.menu === "PROF")) {
        this.router.navigate(['/menu']);
        return;
      }

      this.prof_serv.GetProfAll().then((cpt) => {
        this.ListeProf = cpt;
      }).catch((error: HttpErrorResponse) => {
        let n = errorService.CreateError("Chargement", error);
        errorService.emitChange(n);
      });
    } else {

      this.router.navigate(['/login']);
      return;
    }
  }
}
