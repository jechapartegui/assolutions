import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Compte, compte } from 'src/class/compte';
import { liste_projet, projet } from 'src/class/projet';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';
import { ProjetService } from 'src/services/projet.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  Source: Compte = new Compte(new compte());
  action: string;
  projets: liste_projet[];
  projets_select: liste_projet =null;
  loading: boolean;
  profil:"ADHERENT" | "PROF" | "ADMIN" = null;
  psw_projet: string = null;
  constructor(private compte_serv: CompteService, private project_serv: ProjetService, private router: Router, private route:ActivatedRoute) { 
    this.Source.Login = "jechapartegui@gmail.com";
    this.Source.Password = "Gulfed2606";
  }

  ngOnInit() : void{
    let token:string;
    let user:string;
    this.route.queryParams.subscribe(params => {
      const errorService = ErrorService.instance;
      this.action = $localize`Connexion par token`;
      if ('token_connexion' in params) {
        token = params['token_connexion'];
        if ('username' in params) {
          this.loading = true;
          user = params['username'];
          this.compte_serv.LoginToken(token,user).then((retour) =>{
            if(retour){
              this.router.navigate(['/menu']);
            } 
          }).catch((error: Error) => {
            let o = errorService.CreateError(this.action, error.message);
            errorService.emitChange(o);
            this.loading = false;
          });
        }
      }
    })
  }
  Login() {
    this.action = $localize`Se connecter`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;
    this.compte_serv.Login(this.Source.Login, this.Source.Password, true).then((pr) => {
      this.projets = [];
      pr.forEach((pp) => {
        let curpro = this.projets.find(x => x.id == pp.id);
        if(curpro){
          if(pp.adherent == true){
            curpro.adherent = true;
          }
          if(pp.prof == true){
            curpro.prof = true;
          }
          if(pp.admin == true){
            curpro.admin = true;
          }
          if(pp.password == true){
            curpro.password = true;
          }
          if(pp.actif == true){
            curpro.actif = true;
          }
        } else {
          this.projets.push(pp);
        }
      })
      if (pr.length == 0) {
        let o = errorService.CreateError(this.action, $localize`Aucun projet lié`);
        errorService.emitChange(o);
        this.loading = false;
      } else if (pr.length == 1) {
        let _pr: liste_projet = pr[0];
        this.projets_select = _pr;
        if (_pr.adherent && !_pr.prof && !_pr.admin) {
          this.ConnectToProject("ADHERENT");
        } else if (!_pr.adherent && _pr.prof && !_pr.admin) {
          this.ConnectToProject("PROF");
        } else if (!_pr.adherent && !_pr.prof && _pr.admin) {
          this.ConnectToProject("ADMIN");
        } else {
          this.loading = false;
        }
      }
      this.loading = false;
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
      this.loading = false;
    });
  }
  LogOut(){

  }

  SelectProject(event) {
    this.projets_select = this.projets.find(x => x.id == event);
  }

  ConnectToProject(charg: "ADHERENT" | "PROF" | "ADMIN" = "ADHERENT") {
    this.action = $localize`Se connecter au projet`;
    this.loading = true;
    // Appel à la méthode Check_Login du service RidersService
    const errorService = ErrorService.instance;
    console.log(this.projets_select);
    this.project_serv.ConnectToProject(this.projets_select, this.Source.Login, this.psw_projet).then((result) => {
      if (result) {
        if (this.projets_select.actif) {
          GlobalService.instance.updateMenuType(charg);         
          GlobalService.instance.updateSelectedMenuStatus("MENU");
          GlobalService.instance.updateProjet(new projet(this.projets_select))
          this.router.navigate(['/menu']);
          this.loading = false;
        } else {
          let o = errorService.CreateError(this.action, $localize`Projet inactif`);
          errorService.emitChange(o);
          this.loading = false;
        }
      } else {
        let o = errorService.CreateError(this.action, $localize`Erreur inconnue`);
        errorService.emitChange(o);
        this.loading = false;
      }
    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
      this.loading = false;
    });

  }

}
