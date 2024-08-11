import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { compte } from 'src/class/compte';
import { CompteService } from 'src/services/compte.service';
import { ErrorService } from 'src/services/error.service';

@Component({
  selector: 'app-compte',
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css']
})
export class CompteComponent implements OnInit {


sort_login: string;
filter_login: string;
sort_actif: string;
filter_actif: number;
filter_droit: number;
thisCompte:compte;

  ListeCompte: compte[];
  action: string;
  context :"LISTE" | "ECRITURE";
afficher_filtre: any;

  constructor(private cpteserv:CompteService){}
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les comptes`;
      this.cpteserv.GetAll().then((cpt) =>{
        this.ListeCompte = cpt;
      }).catch((error:HttpErrorResponse) => {
        let n = errorService.CreateError("Chargement", error);
        errorService.emitChange(n);
      });
  }

  Sort(arg0: string,arg1: string) {
    throw new Error('Method not implemented.');
    }
    Creer() {
    throw new Error('Method not implemented.');
    }
    ExporterExcel() {
    throw new Error('Method not implemented.');
    }
    ReinitFiltre() {
    throw new Error('Method not implemented.');
    }
    IsEmail(st:string):boolean{
      return true;
    }
    Admin(_t115: any) {
    throw new Error('Method not implemented.');
    }
    Delete(_t115: any) {
    throw new Error('Method not implemented.');
    }
    Save() {
      throw new Error('Method not implemented.');
      }
      Retour(arg0: string) {
      throw new Error('Method not implemented.');
      }
}
