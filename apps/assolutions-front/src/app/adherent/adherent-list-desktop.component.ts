import { Component, ElementRef, EventEmitter, Input, Output } from '@angular/core';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Groupe} from '@shared/lib/groupes.interface';
import { Saison } from '@shared/lib/saison.interface';
import { FilterAdherent, SortSens } from '../adherent/adherent.component';

@Component({
    standalone: false,
  selector: 'app-adherent-list-desktop',
  templateUrl: './adherent-list-desktop.component.html',
})
export class AdherentListDesktopComponent {
  @Input() Liste: Adherent_VM[] = [];
  @Input() filteredListe: Adherent_VM[] = [];
  @Input() filters!: FilterAdherent;
  @Input() active_saison!: Saison;
  @Input() liste_saison: Saison[] = [];
  @Input() liste_groupe_filter: Groupe[] = [];
  @Input() selectedIds!: Set<number>;
  @Input() bulkWorking = false;
  @Input() bulkLabel = '';
  @Input() hasSelection = false;
  @Input() showScrollToTop = false;
  @Input() store: any;
  @Input() refreshing = false;
  @Input() needsReload = false;
  @Input() defaultAvatar = '../../assets/photo_H.png';
  @Input() sort_nom: SortSens = 'NO';
  @Input() sort_date: SortSens = 'NO';
  @Input() sort_sexe: SortSens = 'NO';
  @Input() afficher_filtre = false;
  @Input() selected_filter = '';
  @Input() scrollableContent!: ElementRef;
  @Input() getActiveSaisonLabel = '';

  @Output() reloadRequested = new EventEmitter<void>();
  @Output() toggleSelection = new EventEmitter<{ id: number; checked: boolean }>();
  @Output() toggleSelectAll = new EventEmitter<boolean>();
  @Output() deleteOne = new EventEmitter<Adherent_VM>();
  @Output() readOne = new EventEmitter<Adherent_VM>();
  @Output() sortChange = new EventEmitter<{ sens: SortSens; champ: string }>();
  @Output() filterEditStart = new EventEmitter<any>();
  @Output() filterEditEnd = new EventEmitter<any>();
  @Output() filterEditCancel = new EventEmitter<any>();
  @Output() filterChange = new EventEmitter<{ key: string; value: any }>();
  @Output() clearFilter = new EventEmitter<string>();
  @Output() clearAllFilters = new EventEmitter<void>();
  @Output() toggleAfficherFiltre = new EventEmitter<void>();
  @Output() selectedFilterChange = new EventEmitter<string>();
  @Output() activeSaisonChange = new EventEmitter<Saison>();
  @Output() createAdherent = new EventEmitter<void>();
  @Output() exportExcel = new EventEmitter<void>();
  @Output() gotoImport = new EventEmitter<void>();
  @Output() bulkDelete = new EventEmitter<void>();
  @Output() bulkCopy = new EventEmitter<void>();
  @Output() bulkClear = new EventEmitter<void>();
  @Output() scrollTop = new EventEmitter<void>();

  isSelected(adherentId: number): boolean {
    return this.selectedIds?.has(adherentId) ?? false;
  }

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

  isInscrtitionActive(adh: Adherent_VM, saison_id: number): boolean {
    return !!adh.inscriptionsSaison?.some((x) => x.saison_id === saison_id);
  }

  toValueContactPref(cont: any[]) {
    if (!cont || cont.length === 0) return $localize`Aucun contact`;
    const pref = cont.find((x) => x.Pref === true);
    return pref ? pref.Value : cont[0].Value;
  }

  onImgError(evt: Event) {
    (evt.target as HTMLImageElement).src = this.defaultAvatar;
  }
}