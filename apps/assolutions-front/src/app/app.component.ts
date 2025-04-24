import { Component,  ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from '../environments/environment.prod';
import { CompteService } from '../services/compte.service';
import { ErrorService } from '../services/error.service';
import { GlobalService } from '../services/global.services';

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
    public erroservice: ErrorService,
    public compte_serv:CompteService,
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
   
  }

  DisplayError(val) {
    this.child.display_notification(val);
  }
  
}
