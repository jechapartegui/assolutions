import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { AdherentComponent } from './adherent/main/adherent.component';
import { CoursComponent } from './cours/cours.component';
import { SeanceComponent } from './seance/seance.component';
import { StaticClass } from './global';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { HttpClientModule } from '@angular/common/http';
import { CustomButtonComponent } from './custom-button/custom-button.component';
import { ErrorService } from '../services/error.service';
import { MultifiltersMenuPipe } from '../filters/multifilters-menu.pipe';
import { GlobalService } from '../services/global.services';
import { DureeHHMMPipe } from '../pipe/duree.pipe';
import { SeanceEditorComponent } from './seance-editor/seance-editor.component';
import { SeanceListComponent } from './seance-list/seance-list.component';
import { RefDataStore } from '../store/ref-data.store';
import { MenuStore } from '../store/menu.store';
import { AppStore } from './app.store';
import { CoursEditorComponent } from './cours-editor/cours-editor.component';
import { SeanceStore } from '../store/seance.store';
import { CoursListComponent } from './cours-list/cours-list.component';
import { CoursStore } from '../store/cours.store';
import { AdherentListComponent } from './adherent/list/adherent-list.component';
import { AdherentEditorComponent } from './adherent/detail/adherent-editor.component';
import { MailTemplatePreviewComponent } from './mail-template-preview/mail-template-preview.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { GroupeComponent } from './groupe/groupe.component';
import { AddInfoEditorComponent } from './add-info-editor/add-info-editor.component';
import { DashboardComponent } from './tdb/dashboard.component';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { LieuComponent } from './lieu/lieu.component';
import { SaisonComponent } from './saison/saison.component';
import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
import { PersonneSelectorComponent } from './component/personne-selector/personne-selector.component';
import { ProfesseurComponent } from './professeur/professeur.component';
import { ContratProfComponent } from './contrat-prof/contrat-prof.component';
import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';
import { ProjetMailComponent } from './projet-mail/projet-mail.component';
@NgModule({
  declarations: [
    AppComponent, PersonneSelectorComponent, ContratProfComponent, ProfesseurComponent, EnvoiMailComponent, ProjetMailComponent,
    AppComponent, LoginComponent, MenuComponent,MultifiltersMenuPipe, CustomButtonComponent, SeanceComponent, SeanceEditorComponent,  LieuComponent, SaisonComponent,
    SeanceListComponent, CoursComponent, CoursEditorComponent, CoursListComponent, MailTemplatePreviewComponent, MaSeanceComponent, DashboardComponent, CompteBancaireComponent, MenuAdminComponent,
    NotifJechaComponent, DureeHHMMPipe, AdherentComponent, AdherentListComponent, AdherentEditorComponent, GroupeComponent, AddInfoEditorComponent, MenuAdminComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,   // pour formGroup/formControlName
    AppRoutingModule,
    // Ajoutez ici l'un des modules d'animations selon vos besoins
    BrowserAnimationsModule
  ],
  providers: [ StaticClass,
    ErrorService,
    AppStore,
MenuStore, RefDataStore,GlobalService, SeanceStore, CoursStore],
  bootstrap: [AppComponent]
})
export class AppModule { }
