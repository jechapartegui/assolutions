import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import type { AppMode } from '@shared/lib/compte.interface';

import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { AdherentComponent } from './adherent/main/adherent.component';
import { SeanceComponent } from './seance/seance.component';
import { CoursComponent } from './cours/cours.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';
import { ShortLinkRedirectComponent } from './short-link-redirect/short-link-redirect.component';
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
import { ComptabiliteComponent } from './comptabilite/comptabilite.component';
import { OperationsComponent } from './operations/operations.component';
import { CreerCompteComponent } from './creer-compte/creer-compte.component';
import { InscriptionComponent } from './inscription/inscription.component';
import { SouscriptionTunnelComponent } from './souscription/souscription-tunnel.component';
import { CodePromoComponent } from './code-promo/code-promo.component';

const APPLI_ONLY = { auth: { modes: ['APPLI'] as AppMode[] } };
const ADMIN_ONLY = { auth: { modes: ['ADMIN'] as AppMode[] } };
const LOGGED_ANY = { auth: {} };

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'creer-compte', component: CreerCompteComponent },
  { path: 'menu', component: MenuComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
  { path: 'mon-compte', component: MonCompteComponent, canActivate: [AuthGuard], data: APPLI_ONLY },
  { path: 'souscription/retour', component: SouscriptionTunnelComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'souscription', component: SouscriptionTunnelComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'cours', component: CoursComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'seance', component: SeanceComponent, canActivate: [AuthGuard], data: { auth: { requireProf: true } } },
  { path: 'ma-seance', component: MaSeanceComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'adherent', component: AdherentComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'groupe', component: GroupeComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 's/:slug', component: ShortLinkRedirectComponent },
  { path: 's/:code/:answer', component: ShortLinkRedirectComponent },
  { path: 'tdb', component: DashboardComponent, canActivate: [AuthGuard], data: LOGGED_ANY },
  { path: 'menu-admin', component: MenuAdminComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'lieu', component: LieuComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'saison', component: SaisonComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'compte-bancaire', component: CompteBancaireComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'contrat-prof', component: ContratProfComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'professeur', component: ProfesseurComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'projet-mail', component: ProjetMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'envoi-mail', component: EnvoiMailComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'inscription', component: InscriptionComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'codes-promo', component: CodePromoComponent, canActivate: [AuthGuard], data: ADMIN_ONLY },
  { path: 'comptabilite', component: ComptabiliteComponent, canActivate: [AuthGuard] },
  { path: 'operations', component: OperationsComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
