import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { AdherentComponent } from './adherent/adherent.component';
import { GroupeComponent } from './groupe/groupe.component';
import { CoursComponent } from './cours/cours.component';
import { SeanceComponent } from './seance/seance.component';
import { ComptabiliteComponent } from './comptabilite/comptabilite.component';
import { ProfComponent } from './prof/prof.component';
import { StaticClass } from './global';
import { DatePipe } from '@angular/common';
import { NotifJechaComponent } from './custom-notification/custom-notification.component';
import { HttpClientModule } from '@angular/common/http';
import { ContactItemComponent } from './contact-item/contact-item.component';
import { GroupeDetailComponent } from './groupe-detail/groupe-detail.component';
import { HoverButtonComponent } from './hover-button/hover-button.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { AddressComponent } from './address/address.component';
import { CompteComponent } from './compte/compte.component';
import { InscriptionComponent } from './inscription/inscription.component';
import { ProfesseurComponent } from './professeur/professeur.component';
import { SeancesEssaisComponent } from './seances-essais/seances-essais.component';
import { CompteDetailComponent } from './compte-detail/compte-detail.component';
import { ReinitMdpComponent } from './reinit-mdp/reinit-mdp.component';
import { StockComponent } from './stock/stock.component';
import { SuiviMailComponent } from './suivi-mail/suivi-mail.component';
import { ProjetMailComponent } from './projet-mail/projet-mail.component';
import { FacturesComponent } from './factures/factures.component';
import { ProjetInfoComponent } from './projet-info/projet-info.component';
import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
import { LieuComponent } from './lieu/lieu.component';
import { SaisonComponent } from './saison/saison.component';
import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';
import { AdministrateursComponent } from './administrateurs/administrateurs.component';
import { TableauDeBordComponent } from './tdb/tableau-de-bord.component';
import { ImportAdherentComponent } from './import-adherent/import-adherent.component';
import { GestionListeComponent } from './gestion-liste/gestion-liste.component';
import { OperationsComponent } from './operations/operations.component';
import { ClementineComponent } from './clementine/clementine.component';
import { DocumentComponent } from './document/document.component';
import { CustomButtonComponent } from './custom-button/custom-button.component';
import { ErrorService } from '../services/error.service';
import { RangePipe } from '../filters/range.pipe';
import { FilterLibelleNomPipe } from '../filters/filter-libellenom.pipe';
import { MultifiltersAdherentPipe } from '../filters/multifilters-adherent.pipe';
import { MultifiltersComptePipe } from '../filters/multifilters-compte.pipe';
import { MultifiltersCoursPipe } from '../filters/multifilters-cours.pipe';
import { MultifiltersMenuPipe } from '../filters/multifilters-menu.pipe';
import { MultifiltersProfPipe } from '../filters/multifilters-prof.pipe';
import { MultifiltersSaisonPipe } from '../filters/multifilters-saison.pipe';
import { MultifiltersSeancePipe } from '../filters/multifilters-seance.pipe';
import { MultifiltersStockPipe } from '../filters/multifilters-stock.pipe';
import { GlobalService } from '../services/global.services';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { DureeHHMMPipe } from '../pipe/duree.pipe';
import { InfoPersoComponent } from './component/Infoperso/infoperso.component';
import { DateLieuComponent } from './component/datelieu/datelieu.component';
import { CaracSeanceComponent } from './component/caracteristique_seance/caracteristique_seance.component';
import { WeekCalendarComponent } from './public/week-calendrar.component';
import { CoursPage } from './public/course-page-public.component';
import { SeancesPage } from './public/seance-page-public.component';
import { SeanceListComponent } from './public/seance-list-public.component';
import { CourseListPublicComponent } from './public/course-list-public.component';
import { OrEmptyPipe } from '../filters/orempty.pipe';
import { MailTemplatePreviewComponent } from './mail-template-preview/mail-template-preview.component';
import { ShortLinkRedirectComponent } from './short-link-redirect/short-link-redirect.component';
import { LoginProjetComponent } from './login-projet/login-projet.component';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MenuComponent,
    AdherentComponent,
    GroupeComponent,
    CoursComponent,
    SeanceComponent, MailTemplatePreviewComponent, LoginProjetComponent,
    ComptabiliteComponent, InfoPersoComponent, ShortLinkRedirectComponent,
    ProfComponent,RangePipe, CoursPage, SeancesPage, OrEmptyPipe,
    NotifJechaComponent,  AdministrateursComponent, WeekCalendarComponent, SeanceListComponent, CourseListPublicComponent,
    ContactItemComponent, DureeHHMMPipe, DateLieuComponent, CaracSeanceComponent,
    MultifiltersStockPipe, MultifiltersSaisonPipe,FilterLibelleNomPipe, MultifiltersProfPipe,  MultifiltersMenuPipe, MultifiltersComptePipe, MultifiltersAdherentPipe, MultifiltersSeancePipe, MultifiltersCoursPipe, 
   GroupeDetailComponent, ProfComponent, HoverButtonComponent, MaSeanceComponent, AddressComponent, 
   CompteComponent, InscriptionComponent, ProfesseurComponent, SeancesEssaisComponent, CompteDetailComponent, ReinitMdpComponent,  StockComponent, MenuAdminComponent,
   SuiviMailComponent, ProjetMailComponent, FacturesComponent, ProjetInfoComponent, CompteBancaireComponent, LieuComponent, SaisonComponent, EnvoiMailComponent, TableauDeBordComponent, ImportAdherentComponent, GestionListeComponent, OperationsComponent, ClementineComponent, DocumentComponent, CustomButtonComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,   // pour formGroup/formControlName
    AppRoutingModule,
    DatePipe, 
    // Ajoutez ici l'un des modules d'animations selon vos besoins
    BrowserAnimationsModule
  ],
  providers: [GlobalService, ErrorService, StaticClass, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
