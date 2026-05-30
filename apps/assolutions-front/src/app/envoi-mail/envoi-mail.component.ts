import { Component, OnInit } from '@angular/core';
import { AppStore } from '../app.store';
import { MailComposerStore } from '../../store/mail-composer.store';
import { AdherentListItem_VM } from '../../vm/adherent-page.vm';
import { MailStep } from '../../vm/mail-composer.vm';
import { Seance_VM } from '@shared/index';

type GroupOption = {
  id: number;
  nom: string;
};

@Component({
  standalone: false,
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css'],
})
export class EnvoiMailComponent implements OnInit {
  constructor(
    public mailStore: MailComposerStore,
    private appStore: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.mailStore.init(this.saisonId);
  }

  get vm() {
    return this.mailStore.vm();
  }

  get saisonId(): number {
    return this.appStore.saison_active().id;
  }

  get selectedAdherents(): AdherentListItem_VM[] {
    return this.mailStore.selectedAdherents;
  }

  get groupOptions(): GroupOption[] {
    const map = new Map<number, string>();

    for (const adherent of this.vm.adherents) {
      for (const groupe of adherent.groupesActifs ?? []) {
        const id = Number((groupe as any).id);
        const nom = (groupe as any).nom ?? `Groupe #${id}`;

        if (Number.isFinite(id)) {
          map.set(id, nom);
        }
      }
    }

    return [...map.entries()]
      .map(([id, nom]) => ({ id, nom }))
      .sort((a, b) => a.nom.localeCompare(b.nom));
  }

  get filteredAdherents(): AdherentListItem_VM[] {
    const search = (this.vm.audienceSearch ?? '').trim().toLowerCase();

    if (!search) {
      return this.vm.adherents;
    }

    return this.vm.adherents.filter(a => {
      const haystack = [
        a.libelle,
        a.nom,
        a.prenom,
        a.surnom,
        a.login,
        ...this.getAdherentEmails(a),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  selectType(type: any): void {
    this.mailStore.selectType(type);
  }

  goStep(step: MailStep): void {
    this.mailStore.goToStep(step);
  }

  updateDateDebut(value: string): void {
    this.mailStore.updateDateDebut(value);
  }

  updateDateFin(value: string): void {
    this.mailStore.updateDateFin(value);
  }

  validateParams(): void {
    this.mailStore.validateParams();
  }

  selectSeance(seance: Seance_VM | null): void {
    this.mailStore.patchParams({
      selectedSeance: seance,
      paramsValidated: false,
      generated: [],
      sendInfo: '',
    });
  }

  addSerieSeance(): void {
    if (!this.vm.selectedSeance) return;
    this.mailStore.addSeance(this.vm.selectedSeance);
  }

  removeSerieSeance(seance: Seance_VM): void {
    this.mailStore.removeSeance(seance.id);
  }

  addAll(): void {
    this.mailStore.addAllAdherents();
  }

  addInscrits(): void {
    this.mailStore.addInscrits();
  }

  addEligibleForSelectedSeance(): void {
    this.mailStore.addEligibleForSelectedSeance();
  }

  updateSelectedGroupId(value: string): void {
    this.mailStore.patchParams({
      selectedGroupId: value ? Number(value) : null,
    });
  }

  addSelectedGroup(): void {
    if (!this.vm.selectedGroupId) return;
    this.mailStore.addGroup(this.vm.selectedGroupId);
  }

  updateAudienceSearch(value: string): void {
    this.mailStore.patchParams({ audienceSearch: value });
  }

  addAdherent(adherent: AdherentListItem_VM): void {
    this.mailStore.addSelectedAdherent(adherent);
  }

  removeAdherent(adherent: AdherentListItem_VM): void {
    this.mailStore.removeSelectedAdherent(adherent.id);
  }

  clearAudience(): void {
    this.mailStore.clearAudience();
  }

  async goDraft(): Promise<void> {
    await this.mailStore.goToDraft();
  }

  updateSubject(value: string): void {
    this.mailStore.patchParams({
      templateSubject: value,
      generated: [],
      sendInfo: '',
    });
  }

  updateHtml(value: string): void {
    this.mailStore.patchParams({
      templateHtml: value,
      generated: [],
      sendInfo: '',
    });
  }

  generate(): void {
    this.mailStore.generatePreview();
  }

  saveTemplate(): void {
    this.mailStore.saveTemplate();
  }

  sendOne(): void {
    this.mailStore.sendOne(this.vm.selectedGeneratedIndex);
  }

  sendAll(): void {
    this.mailStore.sendAll();
  }

  getSeanceLabel(seance: Seance_VM): string {
    return seance?.nom || `Séance #${seance?.id}`;
  }

  getSeanceFullLabel(seance: Seance_VM): string {
    const date = seance?.date_seance
      ? new Date(seance.date_seance).toLocaleDateString('fr-FR')
      : '-';

    const lieu = (seance as any)?.lieu_nom ? ` · ${(seance as any).lieu_nom}` : '';

    return `${date} · ${this.getSeanceLabel(seance)}${lieu}`;
  }

  getAdherentEmails(adherent: AdherentListItem_VM): string[] {
    const contacts = (adherent.contact ?? [])
      .filter(x => x.Type === 'EMAIL' && x.Diffusion === true)
      .map(x => x.Value);

    return Array.from(
      new Set(
        [...contacts, adherent.login]
          .map(x => (x ?? '').toString().trim().toLowerCase())
          .filter(x => x.length > 0),
      ),
    );
  }

  getAdherentEmailLabel(adherent: AdherentListItem_VM): string {
    const emails = this.getAdherentEmails(adherent);
    return emails.length ? emails.join(', ') : 'email manquant';
  }

  getMailToLabel(to: any): string {
    if (!to?.email) return 'adresse manquante';
    return to.name ? `${to.name} <${to.email}>` : to.email;
  }

  canValidateParams(): boolean {
    if (!this.vm.mailType) return false;

    if (this.vm.mailType === 'vide' || this.vm.mailType === 'bienvenue') {
      return true;
    }

    if (!this.vm.dateDebut || !this.vm.dateFin) return false;

    if (this.vm.mailType === 'annulation' || this.vm.mailType === 'convocation') {
      return !!this.vm.selectedSeance;
    }

    if (this.vm.mailType === 'serie_seance') {
      return this.vm.serieSeances.length > 0;
    }

    return true;
  }
}