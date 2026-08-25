/* eslint-disable @nx/enforce-module-boundaries */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExcelColumn, ExcelExportService } from 'apps/assolutions-front/src/services/excel-export.service';
import { PersonneApiService } from 'apps/assolutions-front/src/services/personne-api.service';
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

  selectedPhoto: { src: string; label: string } | null = null;
  exportFfrsLoading = false;

  constructor(
    public readonly store: AdherentStore,
    private readonly excel: ExcelExportService,
    private readonly personneApi: PersonneApiService,
  ) {}

  isSelected(id: number): boolean {
    return (this.vm.selectedIds ?? []).includes(id);
  }

  openPhoto(event: Event, adherent: AdherentListItem_VM): void {
    event.stopPropagation();
    if (!adherent.photo) return;
    this.selectedPhoto = {
      src: adherent.photo,
      label: adherent.libelle || `${adherent.prenom ?? ''} ${adherent.nom ?? ''}`.trim() || 'Photo adhérent',
    };
  }

  closePhoto(): void {
    this.selectedPhoto = null;
  }

  exportExcel(): void {
    const rows = this.getFilteredAdherent();

    const columns: ExcelColumn<AdherentListItem_VM>[] = [
      { header: $localize`:@@common.id:ID`, value: a => a.id },
      { header: $localize`:@@person.lastname:Nom`, value: a => a.nom },
      { header: $localize`:@@person.firstname:Prénom`, value: a => a.prenom },
      { header: $localize`:@@person.nickname:Surnom`, value: a => a.surnom },
      {
        header: $localize`:@@common.label:Libellé`,
        value: a => a.libelle || `${a.prenom ?? ''} ${a.nom ?? ''}`.trim()
      },
      {
        header: $localize`:@@person.birthdate:Date de naissance`,
        value: a => this.dateOnly(a.date_naissance)
      },
      {
        header: $localize`:@@person.age:Âge`,
        value: a => this.ageOnly(a.date_naissance)
      },
      {
        header: $localize`:@@person.gender:Sexe`,
        value: a => this.getSexeLabel(a.sexe)
      },
      {
        header: $localize`:@@group.active:Groupes actifs`,
        value: a => (a.groupesActifs ?? []).map(g => g.nom).join(', ')
      },
      {
        header: $localize`:@@address.full:Adresse`,
        value: a => [a.adresse?.Street, a.adresse?.PostCode, a.adresse?.City, a.adresse?.Country]
          .filter(Boolean)
          .join(' ')
      },
      {
        header: $localize`:@@contact.preferred:Contact préféré`,
        value: a => this.get_contact(a)
      },
      {
        header: $localize`:@@member.registered:Inscrit`,
        value: a => a.inscrit
      },
    ];

    this.excel.export('adherents', rows, columns);
  }

  async exportFfrs(): Promise<void> {
    if (!this.isAdmin || this.exportFfrsLoading) return;

    const filtered = this.getFilteredAdherent();
    const selected = new Set((this.vm.selectedIds ?? []).map(Number));
    const source = this.vm.multiSelectMode && selected.size
      ? filtered.filter((item) => selected.has(Number(item.id)))
      : filtered;
    const ids = source.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);

    if (!ids.length) {
      window.alert($localize`:@@member.exportFfrsEmpty:Aucun adhérent à exporter vers la FFRS.`);
      return;
    }

    this.exportFfrsLoading = true;
    try {
      const result = await this.personneApi.exportFfrs(ids, this.vm.activeSaison?.id ?? null);
      const saison = (this.vm.activeSaison?.nom ?? 'saison')
        .toString()
        .trim()
        .replace(/[^a-zA-Z0-9_-]+/g, '-');

      this.excel.exportMatrix(
        `ffrs-preinscriptions-${saison}`,
        'Exemple',
        result.headers,
        result.rows,
      );

      if (result.warnings?.length) {
        console.warn('Export FFRS - données à compléter', result.warnings);
      }
      console.info('Export FFRS - dates de certificats médicaux détectées', result.medicalCertificateDates);
    } catch (error) {
      console.error('Export FFRS impossible', error);
      window.alert($localize`:@@member.exportFfrsError:Impossible de générer l’export FFRS.`);
    } finally {
      this.exportFfrsLoading = false;
    }
  }

  private dateOnly(value: Date | string | null | undefined): string {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private ageOnly(value: Date | string | null | undefined): number | '' {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const birthdayPassed = today.getMonth() > date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
    return birthdayPassed ? age : age - 1;
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
    const nextSens = this.vm.selectedSort === type && this.vm.selectedSortSens === 'ASC' ? 'DESC' : 'ASC';
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
    const hasHadBirthdayThisYear = today.getMonth() > date.getMonth() ||
      (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
    if (!hasHadBirthdayThisYear) age--;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy} (${age} ans)`;
  }

  get_contact(adherent: AdherentListItem_VM): string {
    const contacts = adherent.contact ?? [];
    if (!contacts.length) return '';
    const preferred = contacts.find((c: any) => c.Pref);
    if (preferred) return preferred.Value ?? '';
    const mail = contacts.find((c: any) => (c.Type ?? '').toString().toLowerCase().includes('mail'));
    if (mail) return mail.Value ?? '';
    return contacts[0]?.Value ?? '';
  }

  getSexeLabel(sexe: boolean | null | undefined): string {
    if (sexe === null || sexe === undefined) return '';
    return sexe ? 'H' : 'F';
  }

  getFilteredAdherent(): AdherentListItem_VM[] {
    return (this.vm.list ?? []).filter((adherent) => {
      const libelle = [adherent.prenom ?? '', adherent.nom ?? '', adherent.surnom ?? ''].join(' ').toLowerCase().trim();
      const archive = adherent.archive ?? false;
      const inscrit = adherent.inscrit ?? true;
      const groupes = adherent.groupesActifs ?? [];
      const dateNaissance = adherent.date_naissance ? new Date(adherent.date_naissance) : null;
      const sexe = adherent.sexe;
      const dateNaissanceTime = dateNaissance ? dateNaissance.getTime() : null;
      const dateApresTime = this.vm.filter.filter_date_naissance_apres ? new Date(this.vm.filter.filter_date_naissance_apres).getTime() : null;
      const dateAvantTime = this.vm.filter.filter_date_naissance_avant ? new Date(this.vm.filter.filter_date_naissance_avant).getTime() : null;

      return (
        (!this.vm.filter.filter_nom || libelle.includes(this.vm.filter.filter_nom.toLowerCase())) &&
        (this.vm.filter.filter_archive === null || archive === this.vm.filter.filter_archive) &&
        (this.vm.filter.filter_sexe === null || sexe === this.vm.filter.filter_sexe) &&
        (this.vm.filter.filter_inscrit === null || inscrit === this.vm.filter.filter_inscrit) &&
        (!this.vm.filter.filter_groupe || groupes.some((g: any) => (g.nom ?? '').toLowerCase().includes(this.vm.filter.filter_groupe!.toLowerCase()))) &&
        (!dateApresTime || (dateNaissanceTime !== null && dateNaissanceTime >= dateApresTime)) &&
        (!dateAvantTime || (dateNaissanceTime !== null && dateNaissanceTime <= dateAvantTime))
      );
    });
  }
}
