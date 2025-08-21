import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { GroupeService } from '../../services/groupe.service';
import { LienGroupe_VM } from '@shared/lib/groupe.interface';
import { KeyValuePair } from '@shared/lib/autres.interface';


@Component({
  standalone: false,
  selector: 'app-groupe-detail',
  templateUrl: './groupe-detail.component.html',
  styleUrls: ['./groupe-detail.component.css']
})
export class GroupeDetailComponent {
  @Input() liste_groupe: KeyValuePair[];
  @Input() id_source: number;
  @Input() objet_source: string;
  @Input() Groupes: LienGroupe_VM[];
  current_groupe_key: number = 0;
  @Input() groupe_dispo: KeyValuePair[] = [];
  @Output() groupesUpdated = new EventEmitter<LienGroupe_VM[]>();  // Ajout du @Output()
  public action: string = "";
  titre_groupe: string = $localize`Groupes`;
  @Input() edit: boolean = true; // Si true, on peut ajouter/supprimer des groupes
  constructor(public gr_serv: GroupeService) { }

  ngOnInit(): void {
    this.MAJListeGroupe();
  }

  AjouterGroupe() {
    const errorService = ErrorService.instance;
    this.action = $localize`Ajouter un groupe`;
    const groupe = this.liste_groupe.find(cc => Number(cc.key) === Number(this.current_groupe_key));

let newValue: LienGroupe_VM | null = null;
if (groupe) {
  newValue = new LienGroupe_VM(Number(groupe.key), groupe.value, 0);
}
    if (this.id_source > 0) {
      this.gr_serv.AddLien(this.id_source, this.objet_source, Number(this.current_groupe_key)).then((id) => {
        this.Groupes.push(newValue);
        this.current_groupe_key = null;
        this.MAJListeGroupe();
        this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
      }).catch((err) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
    } else {
      this.Groupes.push(newValue);
      this.current_groupe_key = null;
      this.MAJListeGroupe();
      this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
    }

  }
  RemoveGroupe(item :LienGroupe_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un groupe`;
    if (this.id_source > 0) {
      this.gr_serv.DeleteLien(item.id_lien).then((ok) => {
        if (ok) {
          this.Groupes = this.Groupes.filter(e => Number(e.id) !== Number(item.id));
          this.MAJListeGroupe();
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
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
      this.MAJListeGroupe();
      this.groupesUpdated.emit(this.Groupes);  // Emettre l'event après l'ajout
    }
  }
  MAJListeGroupe() {
    this.groupe_dispo = this.liste_groupe;
    this.Groupes.forEach((element: LienGroupe_VM) => {
      let element_to_remove = this.groupe_dispo.find(e => Number(e.key) == element.id);
      if (element_to_remove) {
        this.groupe_dispo = this.groupe_dispo.filter(e => e.key !== element_to_remove.key);
      }
    });
  }
}

