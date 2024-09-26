import { Component, ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from 'src/environments/environment.prod';
import { ErrorService } from 'src/services/error.service';
import { Router } from '@angular/router';
import { CompteService } from 'src/services/compte.service';
import { GlobalService } from 'src/services/global.services';
import { LoginService } from 'src/services/login.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'AsSolutions';
  action: string;
  isactive: boolean = false;
  g: StaticClass;
  search_text:string = "";
  envt = environment;
  @ViewChild(NotifJechaComponent, { static: true }) child: NotifJechaComponent;
  constructor(public GlobalService:GlobalService,
    private erroservice: ErrorService,
    private router: Router,
    public compte_serv:CompteService,
    public login_serv:LoginService,
    public globals: StaticClass
  ) {
    this.g = globals;
    erroservice.changeEmitted$.subscribe((data) => {
      this.DisplayError(data);
    })
  }
  public selected_menu: "MATCH" | "CLUB" | "COMPETITION"= "MATCH";
  ngOnInit(): void {
    
  }
  isact() {
    if (this.isactive) {
      this.isactive = false;
    } else {
      this.isactive = true;
    }
  }

  LogOut() {
    this.action = $localize`Se déconnecter`;
    const errorService = ErrorService.instance;
    this.login_serv.Logout().then(ok=>{
      if(ok){

        let o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
        this.router.navigate(['/login']);
      } else {
        
        let o = errorService.UnknownError(this.action);
        errorService.emitChange(o);
      }

    }).catch((error: Error) => {
      let o = errorService.CreateError(this.action, error.message);
      errorService.emitChange(o);
    });
  }

  DisplayError(val) {
    this.child.display_notification(val);
  }
}
