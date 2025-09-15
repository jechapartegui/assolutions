import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ErrorService } from '../../services/error.service';
import { GroupeService } from '../../services/groupe.service';
import { Groupe_VM, LienGroupe_VM } from '@shared/lib/groupe.interface';
import { KeyValuePair } from '@shared/lib/autres.interface';


@Component({
  standalone: false,
  selector: 'app-groupe-detail',
  templateUrl: './groupe-detail.component.html',
  styleUrls: ['./groupe-detail.component.css']
})
export class GroupeDetailComponent {
// Sécurise l'accès au lien et évite les erreurs si non trouvé
GetWA(g: LienGroupe_VM): string | null {
  return this.liste_groupe.find(x => x.id === g.id)?.whatsapp ?? null;
}

// Optionnel : petit état visuel "copié !" par id (ou utilisez un Set<number>)
copiedId: number | null = null;

async CopyWA(g: LienGroupe_VM) {
  const url = this.GetWA(g);
  if (!url) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      // Fallback vieux navigateurs
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    this.copiedId = g.id;
    setTimeout(() => (this.copiedId = null), 1500);
  } catch {
    // vous pouvez logger / toaster si besoin
  }
}

  @Input() liste_groupe: Groupe_VM[];
  @Input() id_source: number;
  @Input() objet_source: string;
  @Input() Groupes: LienGroupe_VM[];
  current_groupe_key: number = 0;
  @Input() groupe_dispo: LienGroupe_VM[] = [];
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
    const groupe = this.liste_groupe.find(cc => Number(cc.id) === Number(this.current_groupe_key));

let newValue: LienGroupe_VM | null = null;
if (groupe) {
  newValue = new LienGroupe_VM(groupe.id, groupe.nom, 0);
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
    this.groupe_dispo = this.liste_groupe.map(x => new LienGroupe_VM(x.id, x.nom, 0));
    this.Groupes.forEach((element: LienGroupe_VM) => {
      let element_to_remove = this.groupe_dispo.find(e => Number(e.id) == element.id);
      if (element_to_remove) {
        this.groupe_dispo = this.groupe_dispo.filter(e => e.id !== element_to_remove.id);
      }
    });
  }
}


