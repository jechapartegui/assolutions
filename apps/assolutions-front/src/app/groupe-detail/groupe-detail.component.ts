import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Groupe } from '../../class/groupe';
import { ErrorService } from '../../services/error.service';
import { GroupeService } from '../../services/groupe.service';


@Component({
  selector: 'app-groupe-detail',
  templateUrl: './groupe-detail.component.html',
  styleUrls: ['./groupe-detail.component.css']
})
export class GroupeDetailComponent {
  @Input() liste_groupe: Groupe[];
  @Input() id_source: number;
  @Input() objet_source: string;
  @Input() Groupes: Groupe[];
  current_groupe_key: number;
  @Input() groupe_dispo: Groupe[] = [];
  @Output() groupesUpdated = new EventEmitter<Groupe[]>();  // Ajout du @Output()
  public action: string = "";
  constructor(public gr_serv: GroupeService) { }

  ngOnInit(): void {
    this.MAJListeGroupe();
  }

  AjouterGroupe() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un groupe`;
    const indexToUpdate = this.liste_groupe.findIndex(cc => cc.id === this.current_groupe_key);
    const newValue = this.liste_groupe[indexToUpdate];
    if (this.id_source > 0) {
      this.gr_serv.AddLien(newValue.id, this.objet_source, this.id_source).then((id) => {
        newValue.lien_groupe_id = id;
        this.Groupes.push(newValue);
        this.current_groupe_key = null;
        this.MAJListeGroupe();
        this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
      }).catch((err) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    } else {
      let max_id = 1;
      this.Groupes.forEach((f) =>{
        if(f.temp_id && f.temp_id>=max_id){
          max_id ++;
        }
      })
      newValue.temp_id = max_id
      this.Groupes.push(newValue);
      this.current_groupe_key = null;
      this.MAJListeGroupe();
      this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
    }

  }
  RemoveGroupe(item) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un groupe`;
    if (this.id_source > 0) {
      this.gr_serv.DeleteLien(item.lien_groupe_id).then((ok) => {
        if (ok) {
          this.Groupes = this.Groupes.filter(e => e.id !== item.id);
          this.MAJListeGroupe();
          this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
        } else {
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);

        }
      }).catch((err) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    } else {
      this.Groupes = this.Groupes.filter(e => e.temp_id !== item.temp_id);
      this.MAJListeGroupe();
      this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
    }
  }
  MAJListeGroupe() {
    this.groupe_dispo = this.liste_groupe;
    this.Groupes.forEach((element: Groupe) => {
      let element_to_remove = this.groupe_dispo.find(e => e.id == element.id);
      if (element_to_remove) {
        this.groupe_dispo = this.groupe_dispo.filter(e => e.id !== element_to_remove.id);
      }
    });
  }
}

