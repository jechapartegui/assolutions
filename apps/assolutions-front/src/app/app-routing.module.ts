import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { GroupeComponent } from './groupe/groupe.component';
import { AdherentComponent } from './adherent/adherent.component';
import { SeanceComponent } from './seance/seance.component';
import { CoursComponent } from './cours/cours.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { ProfesseurComponent } from './professeur/professeur.component';
import { CompteComponent } from './compte/compte.component';
import { SeancesEssaisComponent } from './seances-essais/seances-essais.component';
import { ReinitMdpComponent } from './reinit-mdp/reinit-mdp.component';
import { SaisonComponent } from './saison/saison.component';
import { LieuComponent } from './lieu/lieu.component';
import { ComptabiliteComponent } from './comptabilite/comptabilite.component';
import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
import { FacturesComponent } from './factures/factures.component';
import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';
import { ProjetInfoComponent } from './projet-info/projet-info.component';
import { ProjetMailComponent } from './projet-mail/projet-mail.component';
import { SuiviMailComponent } from './suivi-mail/suivi-mail.component';
import { StockComponent } from './stock/stock.component';
import { AdministrateursComponent } from './administrateurs/administrateurs.component';
import { TableauDeBordComponent } from './tdb/tableau-de-bord.component';
import { ImportAdherentComponent } from './import-adherent/import-adherent.component';
import { GestionListeComponent } from './gestion-liste/gestion-liste.component';
import { OperationsComponent } from './operations/operations.component';
import { ClementineComponent } from './clementine/clementine.component';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { CoursPage } from './public/course-page-public.component';
import { SeancesPage } from './public/seance-page-public.component';
import { ShortLinkRedirectComponent } from './short-link-redirect/short-link-redirect.component';
import { LoginProjetComponent } from './login-projet/login-projet.component';





const routes: Routes = [
  // { path: '', redirectTo: 'defaut', pathMatch: 'full' }, // Redirection vers 'defaut' pour le path vide
  { path: '', component: LoginComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'login', component: LoginComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'menu', component: MenuComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'cours', component: CoursComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'seance', component: SeanceComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'adherent', component: AdherentComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'groupe', component: GroupeComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'ma-seance', component: MaSeanceComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'professeur', component: ProfesseurComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'compte', component: CompteComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'seances-essais', component: SeancesEssaisComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'reinit-mdp', component: ReinitMdpComponent },
  { path: 'saison', component: SaisonComponent },
  { path: 'lieu', component: LieuComponent },
  { path: 'comptabilite', component: ComptabiliteComponent },
  { path: 'tableau-de-bord', component: TableauDeBordComponent },
  { path: 'compte-bancaire', component: CompteBancaireComponent },
  { path: 'factures', component: FacturesComponent },
  { path: 'envoi-mail', component: EnvoiMailComponent },
  { path: 'projet-info', component: ProjetInfoComponent },
  { path: 'projet-mail', component: ProjetMailComponent },
  { path: 'suivi-mail', component: SuiviMailComponent },
  { path: 'administrateurs', component: AdministrateursComponent },
  { path: 'stock', component: StockComponent },
  { path: 'import-adherent', component: ImportAdherentComponent },
  { path: 'gestion-liste', component: GestionListeComponent },
  { path: 'operations', component: OperationsComponent },
  { path: 'clementine', component: ClementineComponent }, 
  { path: 'login-projet', component: LoginProjetComponent }, 
  { path: 'menu-admin', component: MenuAdminComponent }, 
  { path: 'liste-cours-public', component: CoursPage },
  { path: 'liste-seances-public', component: SeancesPage },
  {path:'menu-admin',component:MenuAdminComponent},
  {path:'tdb',component:TableauDeBordComponent},
{ path: 's/:slug', component: ShortLinkRedirectComponent },
{ path: 's/:code/:answer', component: ShortLinkRedirectComponent }, // legacy (facultatif)



];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
