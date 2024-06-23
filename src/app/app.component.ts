import { Component, ViewChild } from '@angular/core';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { environment } from 'src/environments/environment.prod';
import { ErrorService } from 'src/services/error.service';
import { Router } from '@angular/router';
import { GlobalService } from 'src/services/global.services';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Visu Floorball';
  action: string;
  isactive: boolean = false;
  g: StaticClass;
  search_text:string = "";
  envt = environment;
  @ViewChild(NotifJechaComponent, { static: true }) child: NotifJechaComponent;
  constructor(public GlobalService:GlobalService,
    private erroservice: ErrorService,
    private _router: Router,
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

  LogOut(){
    
  }


  DisplayError(val) {
    this.child.display_notification(val);
  }
}
