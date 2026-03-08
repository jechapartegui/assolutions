import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { LoginComponent } from '../../../assolutions-front/src/app/login/login.component';
import { AppComponent } from './app';
import { routes } from './app.routes';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { StaticClass } from '../../../assolutions-front/src/app/global';
import { ErrorService } from '../../../assolutions-front/src/services/error.service';
import { AppStore } from '../../../assolutions-front/src/app/app.store';
import { GlobalService } from '../../../assolutions-front/src/services/global.services';
import { NotifJechaComponent } from 'apps/assolutions-front/src/app/custom-notification/custom-notification.component';
import { MenuComponent } from 'apps/assolutions-front/src/app/menu/menu.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultifiltersMenuPipe } from 'apps/assolutions-front/src/filters/multifilters-menu.pipe';
import { DureeHHMMPipe } from 'apps/assolutions-front/src/pipe/duree.pipe';
import { CustomButtonComponent } from 'apps/assolutions-front/src/app/custom-button/custom-button.component';
// 👇 import des routes legacy (ton fichier qui contient "const routes: Routes = [...]")

@NgModule({
  declarations: [AppComponent, LoginComponent, MenuComponent,MultifiltersMenuPipe, CustomButtonComponent,
    NotifJechaComponent, DureeHHMMPipe],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,BrowserAnimationsModule,
    HttpClientModule,
    RouterModule.forRoot(routes),
  ],
  providers: [
    StaticClass,
    ErrorService,
    AppStore,

    // Dépendances probables (GlobalService dépend de AppStore, et ça évite les surprises)
    GlobalService,],
  bootstrap: [AppComponent],
})
export class AppModule {}