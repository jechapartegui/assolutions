import { Component, OnInit } from '@angular/core';
import { CompteService } from '../../services/compte.service';
import { Compte_VM } from '@shared/lib/compte.interface';

@Component({
  standalone: false,
  selector: 'app-administrateurs',
  templateUrl: './administrateurs.component.html',
  styleUrls: ['./administrateurs.component.css'],
})
export class AdministrateursComponent implements OnInit {
  ListeCompte: Compte_VM[];
  CompteDispo: Compte_VM[];
  action: string;
  psw: string = '';
  selected_compte: number;

  sort_login: string;
  constructor(public cpt_serv: CompteService) {}

  ngOnInit(): void {
    this.UpdateListeCompte();
  }
  Ajouter() {
   
  }

  Delete(cpt) {
   
  }

  UpdateListeCompte() {

  }

  Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
    switch (champ) {
      case 'login':
        this.sort_login = sens;
        this.ListeCompte.sort((a, b) => {
          const nomA = a.email.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.email.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return this.sort_login === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }
}
