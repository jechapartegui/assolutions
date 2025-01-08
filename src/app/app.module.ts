import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
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
import { GlobalService } from 'src/services/global.services';
import { ErrorService } from 'src/services/error.service';
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
import { RangePipe } from 'src/filters/range.pipe';
import { GestionListeComponent } from './gestion-liste/gestion-liste.component';
import { OperationsComponent } from './operations/operations.component';
import { ClementineComponent } from './clementine/clementine.component';
import { DocumentComponent } from './document/document.component';
import { MultifiltersStockPipe } from 'src/filters/multifilters-stock.pipe';
import { CustomButtonComponent } from './custom-button/custom-button.component';
import { MultifiltersAdherentPipe } from 'src/filters/multifilters-adherent.pipe';
import { MultifiltersSeancePipe } from 'src/filters/multifilters-seance.pipe';
import { MultifiltersCoursPipe } from 'src/filters/multifilters-cours.pipe';
import { MultifiltersSaisonPipe } from 'src/filters/multifilters-saison.pipe';
import { MultifiltersComptePipe } from 'src/filters/multifilters-compte.pipe';
import { MultifiltersProfPipe } from 'src/filters/multifilters-prof.pipe';
import { FilterLibelleNomPipe } from 'src/filters/filter-libellenom.pipe';
@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MenuComponent,
    AdherentComponent,
    GroupeComponent,
    CoursComponent,
    SeanceComponent,
    ComptabiliteComponent,
    ProfComponent,RangePipe,
    NotifJechaComponent,  AdministrateursComponent,
    ContactItemComponent, 
    MultifiltersStockPipe, MultifiltersSaisonPipe,FilterLibelleNomPipe, MultifiltersProfPipe,  MultifiltersComptePipe, MultifiltersAdherentPipe, MultifiltersSeancePipe, MultifiltersCoursPipe, 
   GroupeDetailComponent, ProfComponent, HoverButtonComponent, MaSeanceComponent, AddressComponent, CompteComponent, InscriptionComponent, ProfesseurComponent, SeancesEssaisComponent, CompteDetailComponent, ReinitMdpComponent,  StockComponent, SuiviMailComponent, ProjetMailComponent, FacturesComponent, ProjetInfoComponent, CompteBancaireComponent, LieuComponent, SaisonComponent, EnvoiMailComponent, TableauDeBordComponent, ImportAdherentComponent, GestionListeComponent, OperationsComponent, ClementineComponent, DocumentComponent, CustomButtonComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    // Ajoutez ici l'un des modules d'animations selon vos besoins
    BrowserAnimationsModule
  ],
  providers: [GlobalService, ErrorService, StaticClass, DatePipe],
  bootstrap: [AppComponent]
})
export class AppModule { }
