/* eslint-disable @nx/enforce-module-boundaries */
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
import { SeanceComponent } from 'apps/assolutions-front/src/app/seance/seance.component';
import { SeanceEditorComponent } from 'apps/assolutions-front/src/app/seance-editor/seance-editor.component';
import { SeanceStore } from 'apps/assolutions-front/src/store/seance.store';
import {SeanceListComponent} from 'apps/assolutions-front/src/app/seance-list/seance-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MultifiltersMenuPipe } from 'apps/assolutions-front/src/filters/multifilters-menu.pipe';
import { DureeHHMMPipe } from 'apps/assolutions-front/src/pipe/duree.pipe';
import { CustomButtonComponent } from 'apps/assolutions-front/src/app/custom-button/custom-button.component';
import { MenuStore } from 'apps/assolutions-front/src/store/menu.store';
import { RefDataStore } from 'apps/assolutions-front/src/store/ref-data.store';
import { CoursEditorComponent } from 'apps/assolutions-front/src/app/cours-editor/cours-editor.component';
import { CoursListComponent } from 'apps/assolutions-front/src/app/cours-list/cours-list.component';
import { CoursStore } from 'apps/assolutions-front/src/store/cours.store';
import { CoursComponent } from 'apps/assolutions-front/src/app/cours/cours.component';
import { AdherentComponent } from 'apps/assolutions-front/src/app/adherent/main/adherent.component';
import { AdherentListComponent } from 'apps/assolutions-front/src/app/adherent/list/adherent-list.component';
import { AdherentEditorComponent } from 'apps/assolutions-front/src/app/adherent/detail/adherent-editor.component';
import { MailTemplatePreviewComponent } from 'apps/assolutions-front/src/app/mail-template-preview/mail-template-preview.component';
import { MaSeanceComponent } from 'apps/assolutions-front/src/app/ma-seance/ma-seance.component';
// 👇 import des routes legacy (ton fichier qui contient "const routes: Routes = [...]")


@NgModule({
  declarations: [AppComponent, LoginComponent, MenuComponent,MultifiltersMenuPipe, CustomButtonComponent, SeanceComponent, SeanceEditorComponent, 
    SeanceListComponent, CoursComponent, CoursEditorComponent, CoursListComponent, MailTemplatePreviewComponent, MaSeanceComponent,
    NotifJechaComponent, DureeHHMMPipe, AdherentComponent, AdherentListComponent, AdherentEditorComponent],
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
MenuStore, RefDataStore, SeanceStore, CoursStore,
    // Dépendances probables (GlobalService dépend de AppStore, et ça évite les surprises)
    GlobalService,],
  bootstrap: [AppComponent],
})
export class AppModule {}