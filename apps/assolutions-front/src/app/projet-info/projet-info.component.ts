import { Component, Input, OnInit } from '@angular/core';
import { Adresse, Projet_VM } from '@shared/index';
import { AppStore } from '../app.store';
import { Router } from '@angular/router';
import { ProjetService } from '../../services/projet.service';
import { GlobalService } from '../../services/global.services';

@Component({
  standalone: false,
  selector: 'app-projet-info',
  templateUrl: './projet-info.component.html',
  styleUrls: ['./projet-info.component.css']
})
export class ProjetInfoComponent implements OnInit {
  
ContactValide: boolean;
titre_contact: string = "Contact principal";
AdresseValide: boolean;
projetValide: boolean;
edit: boolean = false;
@Input() id: number;

  @Input() thisProject:Projet_VM;


  constructor(public store:AppStore, public router:Router, public proj_serv:ProjetService, public GlobalService:GlobalService) { }
  ngOnInit(): void {
    if(this.store.isLoggedIn){
    this.Load();

    }
  }

  Load(){
  if(this.store.projet().id){
    this.proj_serv.Get(this.store.projet().id).then(res=>{
      this.id = this.store.projet().id;
      this.thisProject=res;
    });
  }  
}

PreSave() {
}
SaveAdresse($event: Adresse) {
}
// Règles simples de validation
rNom = { key: true, value: '' };
rCouleur = { key: true, value: '' };

CheckProjet() {
  // Nom obligatoire
  const nom = (this.thisProject?.nom ?? '').trim();
  this.rNom.key = nom.length > 0;
  this.rNom.value = $localize`Le nom est requis`;

  // Couleur : hex valide (#RGB, #RRGGBB)
  const c = (this.thisProject?.couleur ?? '').trim();
  const hexOk = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(c);
  this.rCouleur.key = !c || hexOk; // facultatif mais valide si rempli
  this.rCouleur.value = $localize`Couleur hexadécimale invalide`;

  this.projetValide = this.rNom.key && this.rCouleur.key;
}

valid_adresse(ok: boolean) { this.AdresseValide = ok; }
valid_contact(ok: boolean) { this.ContactValide = ok; }

Save() {
  if (!this.projetValide || !this.AdresseValide || !this.ContactValide) return;
  // ... map VM -> Entity (toProject), call service, etc.
}

Cancel() {
  // ... recharger les données VM depuis la source / service
  this.edit = false;
  this.CheckProjet();
}
Retour() {
}
    

}
