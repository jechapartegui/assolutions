import { Component, OnInit } from '@angular/core';
import { AppStore } from '../app.store';
import { MailComposerStore } from '../../store/mail-composer.store';
import { AdherentListItem_VM } from '../../vm/adherent-page.vm';
import { Seance_VM } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-envoi-mail',
  templateUrl: './envoi-mail.component.html',
  styleUrls: ['./envoi-mail.component.css'],
})
export class EnvoiMailComponent implements OnInit {
  readonly saisonStorageKey = 'assolutions.consultationSaisonId';

  constructor(
    public mailStore: MailComposerStore,
    private appStore: AppStore,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.mailStore.init(this.saisonId);
    console.log(this.mailStore.vm());
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

  selectType(type: any): void {
    this.mailStore.selectType(type);
  }

  updateDateDebut(value: string): void {
    this.mailStore.patchParams({ dateDebut: value });
  }

  updateDateFin(value: string): void {
    this.mailStore.patchParams({ dateFin: value });
  }

  validateDateRange(): void {
    this.mailStore.validateDateRange();
    console.log(this.mailStore.vm().seances);
    this.mailStore.patchParams({ step: 'AUDIENCE' });
    console.log(this.mailStore.vm().seances);
  }

  selectSeance(seance: Seance_VM): void {
    this.mailStore.patchParams({ selectedSeance: seance });
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
    this.mailStore.patchParams({ templateSubject: value });
  }

  updateHtml(value: string): void {
    this.mailStore.patchParams({ templateHtml: value });
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
    return seance.nom || `Séance #${seance.id}`;
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
}