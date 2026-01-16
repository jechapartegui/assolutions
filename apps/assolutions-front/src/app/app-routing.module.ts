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
import { DashboardComponent } from './tdb/dashboard.component';
import { ImportComponent } from './import/import.component';
import { GestionListeComponent } from './gestion-liste/gestion-liste.component';
import { OperationsComponent } from './operations/operations.component';
import { ClementineComponent } from './clementine/clementine.component';
import { MenuAdminComponent } from './menu-admin/menu-admin.component';
import { CoursPage } from './public/course-page-public.component';
import { SeancesPage } from './public/seance-page-public.component';
import { ShortLinkRedirectComponent } from './short-link-redirect/short-link-redirect.component';
import { AuthGuard } from './auth.guard';
import { InfoComponent } from './info/info.component';





import type { AppMode } from '@shared/lib/compte.interface';

// Raccourcis
const APPLI_ONLY = { auth: { modes: ['APPLI'] as AppMode[] } };
const ADMIN_ONLY = { auth: { modes: ['ADMIN'] as AppMode[] } };
const LOGGED_ANY = { auth: {} };

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  // APPLI
  { path: 'menu', component: MenuComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
  { path: 'tableau-de-bord', component: DashboardComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
  { path: 'tdb', component: DashboardComponent, canActivate: [AuthGuard], data: APPLI_ONLY },

  // PROF (APPLI + ADMIN)
  { path: 'cours', component: CoursComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'seance', component: SeanceComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'groupe', component: GroupeComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },

  // Logged (tous droits, APPLI + ADMIN)
  { path: 'ma-seance', component: MaSeanceComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent', component: AdherentComponent, canActivate: [AuthGuard], data: LOGGED_ANY },

  // ADMIN
  { path: 'menu-admin', component: MenuAdminComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'saison', component: SaisonComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'professeur', component: ProfesseurComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'compte', component: CompteComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'lieu', component: LieuComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'comptabilite', component: ComptabiliteComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'compte-bancaire', component: CompteBancaireComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'factures', component: FacturesComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'envoi-mail', component: EnvoiMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'projet-info', component: ProjetInfoComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'projet-mail', component: ProjetMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'suivi-mail', component: SuiviMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'administrateurs', component: AdministrateursComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'stock', component: StockComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'import', component: ImportComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'gestion-liste', component: GestionListeComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'operations', component: OperationsComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },

  // Public / rien
  { path: 'info', component: InfoComponent },
  { path: 'seances-essais', component: SeancesEssaisComponent },
  { path: 'reinit-mdp', component: ReinitMdpComponent },
  { path: 'clementine', component: ClementineComponent },
  { path: 'liste-cours-public', component: CoursPage },
  { path: 'liste-seances-public', component: SeancesPage },
  { path: 's/:slug', component: ShortLinkRedirectComponent },
  { path: 's/:code/:answer', component: ShortLinkRedirectComponent },

  { path: '**', redirectTo: 'login' },
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
