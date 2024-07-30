import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';
import { GroupeComponent } from './groupe/groupe.component';
import { Adherent } from 'src/class/adherent';
import { AdherentComponent } from './adherent/adherent.component';
import { SeanceComponent } from './seance/seance.component';
import { CoursComponent } from './cours/cours.component';
import { MaSeanceComponent } from './ma-seance/ma-seance.component';



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
  
 ];
 
 @NgModule({
   imports: [RouterModule.forRoot(routes)],
   exports: [RouterModule]
 })
 export class AppRoutingModule { }
