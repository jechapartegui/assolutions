import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { AdherentComponent } from './adherent/main/adherent.component';
import { CoursComponent } from './cours/cours.component';
import { SeanceComponent } from './seance/seance.component';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { CustomButtonComponent } from './custom-button/custom-button.component';
import { MultifiltersMenuPipe } from '../filters/multifilters-menu.pipe';
import { DureeHHMMPipe } from '../pipe/duree.pipe';
import { SeanceEditorComponent } from './seance-editor/seance-editor.component';
import { SeanceListComponent } from './seance-list/seance-list.component';
import { CoursEditorComponent } from './cours-editor/cours-editor.component';
import { CoursListComponent } from './cours-list/cours-list.component';
import { AdherentListComponent } from './adherent/list/adherent-list.component';
import { AdherentEditorComponent } from './adherent/detail/adherent-editor.component';
import { MailTemplatePreviewComponent } from './mail-template-preview/mail-template-preview.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { GroupeComponent } from './groupe/groupe.component';
import { AddInfoEditorComponent } from './add-info-editor/add-info-editor.component';
import { DashboardComponent } from './tdb/dashboard.component';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { AdminProjectComponent } from './admin-project/admin-project.component';
import { LieuComponent } from './lieu/lieu.component';
import { SaisonComponent } from './saison/saison.component';
import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
import { PersonneSelectorComponent } from './component/personne-selector/personne-selector.component';
import { ProfesseurComponent } from './professeur/professeur.component';
import { ContratProfComponent } from './contrat-prof/contrat-prof.component';
import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';
import { ProjetMailComponent } from './projet-mail/projet-mail.component';
import { MailRecordMonitorComponent } from './mail-record-monitor/mail-record-monitor.component';
import { StockComponent } from './stock/stock.component';
import { ComptabiliteComponent } from './comptabilite/comptabilite.component';
import { OperationsComponent } from './operations/operations.component';
import { LieuSelectorComponent } from './component/lieu-selector/lieu-selector.component';
import { CreerCompteComponent } from './creer-compte/creer-compte.component';
import { InscriptionComponent } from './inscription/inscription.component';
import { DossierDocumentUploadComponent } from './souscription/dossier-document-upload.component';
import { PayerBoxDirective } from './souscription/payer-box.directive';
import { SouscriptionTunnelComponent } from './souscription/souscription-tunnel.component';
import { MedicalProofEditorComponent } from './medical-proof-editor/medical-proof-editor.component';
import { HelpComponent } from './help/help.component';
import { CopyTextDirective } from './directives/copy-text.directive';
import { AdherentSelfGroupsDirective } from './directives/adherent-self-groups.directive';
import { RiderScrollHintsDirective } from './directives/rider-scroll-hints.directive';
import { DateFrMaskDirective } from './directives/date-fr-mask.directive';

import { StaticClass } from './global';
import { ErrorService } from '../services/error.service';
import { GlobalService } from '../services/global.services';
import { RefDataStore } from '../store/ref-data.store';
import { MenuStore } from '../store/menu.store';
import { AppStore } from './app.store';
import { SeanceStore } from '../store/seance.store';
import { CoursStore } from '../store/cours.store';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MenuComponent,
    CreerCompteComponent,
    PersonneSelectorComponent,
    LieuSelectorComponent,
    ContratProfComponent,
    ProfesseurComponent,
    EnvoiMailComponent,
    ProjetMailComponent,
    MailRecordMonitorComponent,
    StockComponent,
    ComptabiliteComponent,
    OperationsComponent,
    MultifiltersMenuPipe,
    CustomButtonComponent,
    SeanceComponent,
    SeanceEditorComponent,
    SeanceListComponent,
    LieuComponent,
    SaisonComponent,
    CoursComponent,
    CoursEditorComponent,
    CoursListComponent,
    MailTemplatePreviewComponent,
    MaSeanceComponent,
    DashboardComponent,
    CompteBancaireComponent,
    MenuAdminComponent,
    AdminProjectComponent,
    NotifJechaComponent,
    DureeHHMMPipe,
    AdherentComponent,
    AdherentListComponent,
    AdherentEditorComponent,
    GroupeComponent,
    AddInfoEditorComponent,
    InscriptionComponent,
    DossierDocumentUploadComponent,
    PayerBoxDirective,
    SouscriptionTunnelComponent,
    MedicalProofEditorComponent,
    HelpComponent,
    CopyTextDirective,
    AdherentSelfGroupsDirective,
    RiderScrollHintsDirective,
    DateFrMaskDirective,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    BrowserAnimationsModule,
  ],
  providers: [
    StaticClass,
    ErrorService,
    AppStore,
    MenuStore,
    RefDataStore,
    GlobalService,
    SeanceStore,
    CoursStore,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
