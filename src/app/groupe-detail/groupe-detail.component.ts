import { Component, Input } from '@angular/core';
import { Groupe } from 'src/class/groupe';

@Component({
  selector: 'app-groupe-detail',
  templateUrl: './groupe-detail.component.html',
  styleUrls: ['./groupe-detail.component.css']
})
export class GroupeDetailComponent {
  @Input() liste_groupe:Groupe[];
  @Input() Groupes:Groupe[];
  current_groupe_key:number;
  @Input() groupe_dispo:Groupe[]=[];

  ngOnInit(): void {
    this.MAJListeGroupe();
  }

  AjouterGroupe() {
    const indexToUpdate = this.liste_groupe.findIndex(cc => cc.id === this.current_groupe_key);
    const newValue = this.liste_groupe[indexToUpdate];
    this.Groupes.push(newValue);
    this.current_groupe_key = null;
    this.MAJListeGroupe();

  }
  RemoveGroupe(item) {
    this.Groupes = this.Groupes.filter(e => e.id !== item.id);
    this.MAJListeGroupe();
  }
  MAJListeGroupe() {
    this.groupe_dispo = this.groupe_dispo;
    this.Groupes.forEach((element: Groupe) => {
      let element_to_remove = this.groupe_dispo.find(e => e.id == element.id);
      if (element_to_remove) {
        this.groupe_dispo = this.groupe_dispo.filter(e => e.id !== element_to_remove.id);
      }
    });
  }
}

