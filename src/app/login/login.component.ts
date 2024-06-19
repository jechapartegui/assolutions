import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Compte } from 'src/class/compte';
import { liste_projet } from 'src/class/projet';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { ProjetService } from 'src/services/projet.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  Source:Compte;
  action:string;
  projets:liste_projet[];
  projets_select:liste_projet;
  psw_projet:string =null;
  constructor(private compte_serv : CompteService, private project_serv:ProjetService, private router:Router){}
  Login(){
    this.action = $localize`Se connecter`;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;
    this.compte_serv.Login(this.Source.Login, this.Source.Password, true).then((pr) =>{
      if(pr.length == 0){
        let o = errorService.CreateError(this.action, $localize`Aucun projet lié`);
        errorService.emitChange(o);
      } else if(pr.length == 1) {
        this.ConnectToProject();
      }
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }

  SelectProject(event){
    this.projets_select = this.projets.find(x => x.id == event);
  }
  ConnectToProject(){
    this.action = $localize`Se connecter au projet`;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;
    this.project_serv.ConnectToProject(this.projets_select, this.Source.Login, this.psw_projet).then((result) =>{
      if(result){
        this.action = $localize`Récupération des infos de l'adhérents`;        
        this.ridersService.GetRiders().then((ok_rider)=>{
          if(ok_rider){
            this.router.navigate(['/menu-inscription']);        
          } else {
            //KO 
            this.action = $localize`Récupération des infos de l'adhérents`;
            let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
            errorService.emitChange(o);
          }
        }).catch((error: Error) => {
          let o = errorService.CreateError(this.action, error.message);
          errorService.emitChange(o);
        });
      } else {
        let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
        errorService.emitChange(o);
      }    
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
    
  }
}
