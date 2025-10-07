import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { LieuNestService } from '../../services/lieu.nest.service';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { AppStore } from '../app.store';
import { GlobalService } from '../../services/global.services';

@Component({
  standalone: false,
  selector: 'app-lieu',
  templateUrl: './lieu.component.html',
  styleUrls: ['./lieu.component.css']
})
export class LieuComponent implements OnInit {
  valid_address: boolean;
  editLieu: Lieu_VM;
  afficher_filtre:boolean=false;
  filter_nom = "";
  action: string = "";
  public loading:boolean=false;
  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef<HTMLDivElement>;
  lieux: Lieu_VM[] = [];
  lieux_all: Lieu_VM[] = [];  
  sort_nom: string;
  save :string="";
  constructor(public router: Router, public lieu_serv: LieuNestService, public store:AppStore, public GlobalService:GlobalService) { }
trackById = (_: number, l: Lieu_VM) => l.id;
  ngOnInit(): void {
    this.loading = true;
    if (this.store.isLoggedIn) {

      if ((this.store.appli() === "APPLI")) {
        this.router.navigate(['/menu']);
        this.store.updateSelectedMenu("MENU");
        return;
      }
      this.UpdateListeLieu();
      // Chargez la liste des cours
      
    }
  }

  
ExportExcel() {
throw new Error('Method not implemented.');
}
  Creer(): void {
    this.editLieu = new Lieu_VM();
  }
 
  Save() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un lieu`;
    if (this.editLieu) {
      if (this.editLieu.id == 0) {

        this.lieu_serv.Add(this.editLieu).then((id) => {
          if (id > 0) {
            this.editLieu.id = id;
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            
            this.save = JSON.stringify(this.editLieu);
            this.UpdateListeLieu();
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
      else {
        this.lieu_serv.Update(this.editLieu).then(() => {

          this.action = $localize`Mettre à jour un lieu`;
        

            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.save = JSON.stringify(this.editLieu);
            this.UpdateListeLieu();
          

        }).catch((err) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }
    }
  }
  Retour(): void {
    
  let h = JSON.stringify(this.editLieu);
  if(h != this.save && this.save !=""){
    let confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (confirm) {
      this.editLieu = null;
      this.UpdateListeLieu();
    }
  }
}

  valid_adresse(isValid: boolean): void {
  this.valid_address = isValid;
}
 private normalize = (s?: string) =>
    (s ?? "")
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  UpdateListeLieu(){
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les lieux`;
    this.lieu_serv.GetAll().then((lieu) => {
      // ➕ on garde la source complète et on applique le filtre courant
      this.lieux_all = lieu ?? [];
      this.FiltrerListeLieu();
      this.loading = false;
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
      return;
    })
  }

  Filter(even:string){
    this.filter_nom = even;
    this.FiltrerListeLieu();
  }

  FiltrerListeLieu(){
    const q = this.normalize(this.filter_nom);
    if (!q) {
      this.lieux = [...this.lieux_all];
    } else {
      this.lieux = this.lieux_all.filter(l =>
        this.normalize(l.nom).includes(q)
      );
    }
    // si un tri est actif, on le ré-applique sur la liste filtrée
    if (this.sort_nom !== "NO") {
      this.Sort("ASC", "nom");
    }
  }
SaveAdresse(thisAdresse :Adresse){
    this.editLieu.adresse = thisAdresse;
    if(this.valid_address && this.editLieu.nom.length>4){
      this.Save();
    }
  }


  Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
    switch (champ) {
      case "nom":
        this.sort_nom = sens;      
        this.lieux.sort((a, b) => {
          const nomA = a.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.nom.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;

    }


  }
  Edit(lieu: Lieu_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.lieu_serv.Get(lieu.id).then((ss) => {
      this.editLieu =ss;
      this.save = JSON.stringify(this.editLieu);
    }).catch((err: HttpErrorResponse) => {
      let o = errorService.CreateError(this.action, err.message);
      errorService.emitChange(o);
    })
  }
  Delete(lieu: Lieu_VM): void {
    const errorService = ErrorService.instance;

    let confirmation = window.confirm($localize`Voulez-vous supprimer ce lieu ? Cela risque d'affecté le chargement des séances/cours dans ce lieu ?. `);
    if (confirmation) {
      this.action = $localize`Supprimer un lieu`;
      if (lieu) {
        this.lieu_serv.Delete(lieu.id).then((result) => {
          if (result) {           
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        }).catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        })
      }
    }
  }
}