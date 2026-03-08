import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Groupe } from '@shared/lib/groupes.interface';
import { Saison } from '@shared/lib/saison.interface';
import { FilterAdherent } from '../adherent/adherent.component';

@Component({
    standalone: false,
  selector: 'app-adherent-list-mobile',
  templateUrl: './adherent-list-mobile.component.html',
})
export class AdherentListMobileComponent {
  @Input() Liste: Adherent_VM[] = [];
  @Input() filteredListe: Adherent_VM[] = [];
  @Input() filters!: FilterAdherent;
  @Input() active_saison!: Saison;
  @Input() liste_groupe_filter: Groupe[] = [];
  @Input() selected_filter = '';
  @Input() selected_sort: any;
  @Input() selected_sort_sens: any;
  @Input() afficher_filtre = false;
  @Input() afficher_tri = false;
  @Input() denseMode = false;
  @Input() defaultAvatar = '../../assets/photo_H.png';
  @Input() store: any;

  @Output() readOne = new EventEmitter<Adherent_VM>();
  @Output() createAdherent = new EventEmitter<void>();
  @Output() toggleAfficherFiltre = new EventEmitter<boolean>();
  @Output() toggleAfficherTri = new EventEmitter<boolean>();
  @Output() selectedFilterChange = new EventEmitter<string>();
  @Output() selectedSortChange = new EventEmitter<string>();
  @Output() selectedSortSensChange = new EventEmitter<string>();
  @Output() sortChange = new EventEmitter<{ sens: any; champ: string }>();
  @Output() clearAllFilters = new EventEmitter<void>();

  calculateAge(dateNaissance: Date): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  currentActiveInscriptionGroupe(adh: Adherent_VM) {
    const active = adh.inscriptionsSaison?.find((x) => x.active);
    return active?.groupes ?? [];
  }

  onImgError(evt: Event) {
    (evt.target as HTMLImageElement).src = this.defaultAvatar;
  }
}