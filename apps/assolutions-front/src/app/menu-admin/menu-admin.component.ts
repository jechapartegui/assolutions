import { Component } from "@angular/core";
import { AppStore } from "../app.store";
import { ErrorService } from "../../services/error.service";
import { Router } from "@angular/router";

@Component({
  standalone: false,
  selector: 'app-menu-admin',
  templateUrl: './menu-admin.component.html',
  styleUrls: ['./menu-admin.component.css'],
})
export class MenuAdminComponent {
    constructor(public store:AppStore, public router:Router) {}
  action: string;

      LogOut() {
        const errorService = ErrorService.instance;
        this.action = $localize`Se déconnecter`;
        this.store.clearSession();
        this.router.navigate(['/login']);
                  let o = errorService.OKMessage(this.action);
                  errorService.emitChange(o);
      }
    
      MDP() {
        this.action = $localize`Modifier le mot de passe`;
        this.router.navigate(['reinit-mdp']);
      }
      Dashboard() {
        this.action = $localize`Afficher le tableau de bord`;
        this.router.navigate(['tdb']);
      }
    
}