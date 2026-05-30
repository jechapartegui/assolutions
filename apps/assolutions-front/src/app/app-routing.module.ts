import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { AdherentComponent } from './adherent/main/adherent.component';
import { SeanceComponent } from './seance/seance.component';
import { CoursComponent } from './cours/cours.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
// import { ProfesseurComponent } from './professeur/professeur.component';
// import { CompteComponent } from './compte/compte.component';
// import { SeancesEssaisComponent } from './seances-essais/seances-essais.component';
// import { SaisonComponent } from './saison/saison.component';
// import { LieuComponent } from './lieu/lieu.component';
// import { ComptabiliteComponent } from './comptabilite/comptabilite.component';
// import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
// import { FacturesComponent } from './factures/factures.component';
// import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';
//import { ProjetInfoComponent } from './projet-info/projet-info.component';
// import { ProjetMailComponent } from './projet-mail/projet-mail.component';
// import { SuiviMailComponent } from './suivi-mail/suivi-mail.component';
// import { StockComponent } from './stock/stock.component';
//import { AdministrateursComponent } from './administrateurs/administrateurs.component';
// import { DashboardComponent } from './tdb/dashboard.component';
// import { ImportComponent } from './import/import.component';
// import { GestionListeComponent } from './gestion-liste/gestion-liste.component';
// import { OperationsComponent } from './operations/operations.component';
//import { ClementineComponent } from './clementine/clementine.component';
//import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { ShortLinkRedirectComponent } from './short-link-redirect/short-link-redirect.component';
import { AuthGuard } from './auth.guard';
//import { InfoComponent } from './info/info.component';





import type { AppMode } from '@shared/lib/compte.interface';
import { MonCompteComponent } from './mon-compte/mon-compte.component';
import { GroupeComponent } from './groupe/groupe.component';
import { DashboardComponent } from './tdb/dashboard.component';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { LieuComponent } from './lieu/lieu.component';
import { SaisonComponent } from './saison/saison.component';
import { CompteBancaireComponent } from './compte-bancaire/compte-bancaire.component';
import { ContratProfComponent } from './contrat-prof/contrat-prof.component';
import { ProfesseurComponent } from './professeur/professeur.component';
import { ProjetMailComponent } from './projet-mail/projet-mail.component';
import { EnvoiMailComponent } from './envoi-mail/envoi-mail.component';

// Raccourcis
const APPLI_ONLY = { auth: { modes: ['APPLI'] as AppMode[] } };
const ADMIN_ONLY = { auth: { modes: ['ADMIN'] as AppMode[] } };
const LOGGED_ANY = { auth: {} };

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  { path: 'menu', component: MenuComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
  { path: 'mon-compte', component: MonCompteComponent, canActivate: [AuthGuard], data: APPLI_ONLY },

  { path: 'cours', component: CoursComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'seance', component: SeanceComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },

  { path: 'ma-seance', component: MaSeanceComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent', component: AdherentComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  {path: 'groupe', component: GroupeComponent, canActivate: [AuthGuard], data: LOGGED_ANY },

  { path: 's/:slug', component: ShortLinkRedirectComponent },
  { path: 's/:code/:answer', component: ShortLinkRedirectComponent },
  { path: 'tdb', component: DashboardComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  {path: 'menu-admin', component: MenuAdminComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'lieu', component: LieuComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'saison', component: SaisonComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'compte-bancaire', component: CompteBancaireComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'contrat-prof', component: ContratProfComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'professeur', component: ProfesseurComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'projet-mail', component: ProjetMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  {path: 'envoi-mail', component: EnvoiMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },


  { path: '**', redirectTo: 'login' },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
