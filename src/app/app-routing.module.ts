import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { MenuComponent } from './menu/menu.component';



const routes: Routes = [
  // { path: '', redirectTo: 'defaut', pathMatch: 'full' }, // Redirection vers 'defaut' pour le path vide
   { path: '', component: LoginComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  { path: 'login', component: LoginComponent }, // Route 'defaut' qui affiche ImportRidersComponent
   { path: 'menu', component: MenuComponent }, // Route 'defaut' qui affiche ImportRidersComponent
  
 ];
 
 @NgModule({
   imports: [RouterModule.forRoot(routes)],
   exports: [RouterModule]
 })
 export class AppRoutingModule { }
