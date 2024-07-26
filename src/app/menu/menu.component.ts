import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Adherent } from 'src/class/adherent';
import { AdherentService } from 'src/services/adherent.service';
import { ErrorService } from 'src/services/error.service';
import { GlobalService } from 'src/services/global.services';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit {
  action:string
  Riders:Adherent[];
  constructor(private router: Router, private adherent_serv:AdherentService) { }

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger le menu`;
    if (GlobalService.is_logged_in) {
      switch (GlobalService.menu) {
        default:
        case "ADHERENT":
          case "PROF":
          this.adherent_serv.Get(GlobalService.compte.id).then((riders) => {
            this.Riders = riders.map( x => new Adherent(x));
          }).catch((error: Error) => {
            let o = errorService.CreateError(this.action, error.message);
            errorService.emitChange(o);
          });
          break;
        case "ADMIN":

          break;
      }

    } else { let o = errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`);
      errorService.emitChange(o);
      this.router.navigate(['/login']);
    }
  }

}
