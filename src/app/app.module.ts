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
import { FilterCoursPipe } from 'src/filters/filter-cours.pipe';
import { FilterFirstnamePipe } from 'src/filters/filter-firstname.pipe';
import { FilterDateApresPipe } from 'src/filters/filter-dateapres.pipe';
import { FilterDateAvantPipe } from 'src/filters/filter-dateavant.pipe';
import { FilterGroupePipe } from 'src/filters/filter-groupe.pipe';
import { FilterJourPipe } from 'src/filters/filter-jour.pipe';
import { FilterLibellePipe } from 'src/filters/filter-libelle.pipe';
import { FilterLieuPipe } from 'src/filters/filter-lieu.pipe';
import { FilterListProfPipe } from 'src/filters/filter-listeprof.pipe';
import { FilterNamePipe } from 'src/filters/filter-name.pipe';
import { FilterProfPipe } from 'src/filters/filter-prof.pipe';
import { GroupeDetailComponent } from './groupe-detail/groupe-detail.component';
import { FilterLibelleNomPipe } from 'src/filters/filter-libellenom.pipe';
import { FilterDDNApresPipe } from 'src/filters/filter-ddnapres.pipe';
import { FilterDDNAvantPipe } from 'src/filters/filter-ddnavant.pipe';
import { FilterSexePipe } from 'src/filters/filter-sexe.pipe';
import { filterInscriptionSaison } from 'src/filters/filter-inscriptionsaison.pipe';
import { HoverButtonComponent } from './hover-button/hover-button.component';
import { FilterNomSeanceMenuPipe } from 'src/filters/filter-nomseance.pipe';
import { FilterCoursMenuPipe } from 'src/filters/filter-coursmenu.pipe';
import { FilterDateApresMenuPipe } from 'src/filters/filter-dateapresmenu.pipe';
import { FilterDateAvantMenuPipe } from 'src/filters/filter-dateavantmenu.pipe';
import { FilterLieuMenuPipe } from 'src/filters/filter-lieumenu.pipe';
import { FilterListProfMenuPipe } from 'src/filters/filter-listeprofmenu.pipe';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { AddressComponent } from './address/address.component';
import { CompteComponent } from './compte/compte.component';
import { InscriptionComponent } from './inscription/inscription.component';

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
    ProfComponent,
    NotifJechaComponent,
    ContactItemComponent, filterInscriptionSaison, FilterCoursMenuPipe, FilterDateApresMenuPipe, FilterDateAvantMenuPipe, FilterLieuMenuPipe, FilterListProfMenuPipe, FilterCoursPipe, FilterDDNApresPipe, FilterDDNAvantPipe, FilterSexePipe, FilterFirstnamePipe, FilterLibelleNomPipe, FilterDateApresPipe, FilterDateAvantPipe, FilterGroupePipe, FilterJourPipe, FilterLibellePipe,FilterLieuPipe, FilterListProfPipe, FilterNamePipe, FilterNamePipe, FilterProfPipe, FilterNomSeanceMenuPipe
  , GroupeDetailComponent, ProfComponent, HoverButtonComponent, MaSeanceComponent, AddressComponent, CompteComponent, InscriptionComponent],
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
