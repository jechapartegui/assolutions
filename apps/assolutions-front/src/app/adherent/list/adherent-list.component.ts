import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AdherentStore } from 'apps/assolutions-front/src/store/adherent.store';
import { AdherentListItem_VM, AdherentPageVm } from 'apps/assolutions-front/src/vm/adherent-page.vm';

@Component({
  selector: 'app-adherent-list',
  templateUrl: './adherent-list.component.html',
  styleUrls: ['./adherent-list.component.css'],
  standalone: false,
})
export class AdherentListComponent {
  @Input({ required: true }) vm!: AdherentPageVm;
@Input() isAdmin = false;
  @Output() openAdherent = new EventEmitter<number>();
  @Output() createAdherent = new EventEmitter<void>();

  constructor(public readonly store: AdherentStore) {}
isSelected(id: number): boolean {
  return (this.vm.selectedIds ?? []).includes(id);
}

toggleSelection(id: number): void {
  this.store.toggleSelectedAdherent(id);
}

toggleMultiSelectMode(): void {
  this.store.toggleMultiSelectMode();
}

async deleteSelection(): Promise<void> {
  const count = this.vm.selectedIds?.length ?? 0;
  if (!count) return;

  const confirmDelete = window.confirm(
    count === 1
      ? 'Voulez-vous supprimer l adhérent sélectionné ?'
      : `Voulez-vous supprimer les ${count} adhérents sélectionnés ?`
  );

  if (!confirmDelete) return;

  await this.store.deleteSelectedAdherents();
}
  sort(type: 'nom' | 'date_naissance' | 'sexe'): void {
    const nextSens =
      this.vm.selectedSort === type && this.vm.selectedSortSens === 'ASC'
        ? 'DESC'
        : 'ASC';

    this.store.applySort(type, nextSens);
  }

  getInitiales(adherent: AdherentListItem_VM): string {
  const prenom = (adherent.prenom ?? '').trim();
  const nom = (adherent.nom ?? '').trim();
  const surnom = (adherent.surnom ?? '').trim();

  const first = prenom.charAt(0) || surnom.charAt(0) || '';
  const last = nom.charAt(0) || '';

  const value = `${first}${last}`.trim();
  return value || '?';
}

  open(item: AdherentListItem_VM): void {
    console.log('Opening adherent', item);
    this.openAdherent.emit(item.id);
  }

  clearFilters(): void {
    this.vm.filter.reset();
  }
date_age(dateNaissance: Date | string | null | undefined): string {
  if (!dateNaissance) return '';

  const date = dateNaissance instanceof Date ? dateNaissance : new Date(dateNaissance);
  if (isNaN(date.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

  if (!hasHadBirthdayThisYear) {
    age--;
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy} (${age} ans)`;
}
get_contact(adherent: AdherentListItem_VM): string {
  const contacts = adherent.contact ?? [];
  if (!contacts.length) return '';

  const preferred = contacts.find((c: any) => c.Pref);
  if (preferred) {
    return preferred.Value ?? '';
  }

  const mail = contacts.find((c: any) =>
    (c.Type ?? '').toString().toLowerCase().includes('mail')
  );
  if (mail) {
    return mail.Value ?? '';
  }

  const first = contacts[0];
  return  first?.Value ?? '';
}
getSexeLabel(sexe: boolean | null | undefined): string {
  if (sexe === null || sexe === undefined) return '';
  return sexe ? 'H' : 'F';
}
getFilteredAdherent(): AdherentListItem_VM[] {
  return (this.vm.list ?? []).filter((adherent) => {
    const libelle = [
      adherent.prenom ?? '',
      adherent.nom ?? '',
      adherent.surnom ?? ''
    ]
      .join(' ')
      .toLowerCase()
      .trim();

    const archive = adherent.archive ?? false;
    const inscrit = adherent.inscrit ?? true;
    const groupes = adherent.groupesActifs ?? [];
    const dateNaissance = adherent.date_naissance ? new Date(adherent.date_naissance) : null;
    const sexe = adherent.sexe;
    const dateNaissanceTime = dateNaissance ? dateNaissance.getTime() : null;
    const dateApresTime = this.vm.filter.filter_date_naissance_apres
      ? new Date(this.vm.filter.filter_date_naissance_apres).getTime()
      : null;
    const dateAvantTime = this.vm.filter.filter_date_naissance_avant
      ? new Date(this.vm.filter.filter_date_naissance_avant).getTime()
      : null;

    return (
      (!this.vm.filter.filter_nom ||
        libelle.includes(this.vm.filter.filter_nom.toLowerCase())) &&

      (this.vm.filter.filter_archive === null ||
        archive === this.vm.filter.filter_archive) &&

      (this.vm.filter.filter_sexe === null ||
        sexe === this.vm.filter.filter_sexe) &&

      (this.vm.filter.filter_inscrit === null ||
        inscrit === this.vm.filter.filter_inscrit) &&

      (!this.vm.filter.filter_groupe ||
        groupes.some((g: any) =>
          (g.nom ?? '').toLowerCase().includes(this.vm.filter.filter_groupe!.toLowerCase())
        )) &&

      (!dateApresTime ||
        (dateNaissanceTime !== null && dateNaissanceTime >= dateApresTime)) &&

      (!dateAvantTime ||
        (dateNaissanceTime !== null && dateNaissanceTime <= dateAvantTime))
    );
  });
}

}