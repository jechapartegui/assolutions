import { Routes } from '@angular/router';

import { AuthGuard } from 'apps/assolutions-front/src/app/auth.guard';

import { LoginComponent } from 'apps/assolutions-front/src/app/login/login.component';
import { MenuComponent } from 'apps/assolutions-front/src/app/menu/menu.component';
import { AdherentComponent } from 'apps/assolutions-front/src/app/adherent/main/adherent.component';
import { AdherentEditorComponent } from 'apps/assolutions-front/src/app/adherent/detail/adherent-editor.component';
import { SeanceComponent } from 'apps/assolutions-front/src/app/seance/seance.component';
import { CoursComponent } from 'apps/assolutions-front/src/app/cours/cours.component';

import type { AppMode } from '@shared/lib/compte.interface';

// raccourcis
const APPLI_ONLY = { auth: { modes: ['APPLI'] as AppMode[] } };
const ADMIN_ONLY = { auth: { modes: ['ADMIN'] as AppMode[] } };
const LOGGED_ANY = { auth: {} };

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },

  // APPLI
  { path: 'menu', component: MenuComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
 // { path: 'tableau-de-bord', component: DashboardComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
 // { path: 'tdb', component: DashboardComponent, canActivate: [AuthGuard], data: APPLI_ONLY },

  // PROF (APPLI + ADMIN)
  { path: 'cours', component: CoursComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'seance', component: SeanceComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
   // { path: 'groupe', component: GroupeComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },

  // connectés
  //  { path: 'ma-seance', component: MaSeanceComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent', component: AdherentComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent-edit', component: AdherentEditorComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent-edit/:id', component: AdherentEditorComponent, canActivate: [AuthGuard], data: LOGGED_ANY },

  // // ADMIN
  // { path: 'menu-admin', component: MenuAdminComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'saison', component: SaisonComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'professeur', component: ProfesseurComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'compte', component: CompteComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'lieu', component: LieuComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'comptabilite', component: ComptabiliteComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'compte-bancaire', component: CompteBancaireComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'factures', component: FacturesComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'envoi-mail', component: EnvoiMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'projet-info', component: ProjetInfoComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'projet-mail', component: ProjetMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'suivi-mail', component: SuiviMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'administrateurs', component: AdministrateursComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'stock', component: StockComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'import', component: ImportComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'gestion-liste', component: GestionListeComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  // { path: 'operations', component: OperationsComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },

  // // public
  // { path: 'info', component: InfoComponent },
  // { path: 'seances-essais', component: SeancesEssaisComponent },
  // { path: 'reinit-mdp', component: ReinitMdpComponent },
 // { path: 'clementine', component: ClementineComponent },
  //{ path: 's/:slug', component: ShortLinkRedirectComponent },
  //{ path: 's/:code/:answer', component: ShortLinkRedirectComponent },

  { path: '**', redirectTo: 'login' },
];