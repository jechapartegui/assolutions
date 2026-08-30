import { Component, OnInit } from '@angular/core';
import { AppStore } from '../app.store';
import { MailComposerStore } from '../../store/mail-composer.store';
import { AdherentListItem_VM } from '../../vm/adherent-page.vm';
import { MailStep } from '../../vm/mail-composer.vm';
import { Seance_VM } from '@shared/index';
import { ContratProfApiService } from '../../services/contrat-prof-api.service';
import { PersonneApiService } from '../../services/personne-api.service';

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
  public contractProfessors: AdherentListItem_VM[] = [];
  private readonly baseAdherentIds = new Set<number>();

  constructor(
    public mailStore: MailComposerStore,
    private appStore: AppStore,
    private readonly contratProfApi: ContratProfApiService,
    private readonly personneApi: PersonneApiService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.mailStore.init(this.saisonId);

    this.baseAdherentIds.clear();
    for (const adherent of this.vm.adherents) {
      this.baseAdherentIds.add(Number(adherent.id));
    }

    await this.loadContractProfessors();
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
    const adherents = this.vm.adherents.filter(a => this.baseAdherentIds.has(Number(a.id)));

    if (!search) {
      return adherents;
    }

    return adherents.filter(a => this.matchesRecipientSearch(a, search));
  }

  get filteredContractProfessors(): AdherentListItem_VM[] {
    const search = (this.vm.audienceSearch ?? '').trim().toLowerCase();

    if (!search) return this.contractProfessors;
    return this.contractProfessors.filter(a => this.matchesRecipientSearch(a, search));
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

  addContractProfessor(professor: AdherentListItem_VM): void {
    this.ensureRecipientAvailable(professor);
    this.mailStore.addSelectedAdherent(professor);
  }

  addAllContractProfessors(): void {
    if (!this.contractProfessors.length) return;

    const recipients = [...this.vm.adherents];
    const recipientIds = new Set(recipients.map(a => Number(a.id)));

    for (const professor of this.contractProfessors) {
      if (!recipientIds.has(Number(professor.id))) {
        recipients.push(professor);
        recipientIds.add(Number(professor.id));
      }
    }

    const selectedIds = new Set(this.vm.selectedAdherentIds.map(Number));
    for (const professor of this.contractProfessors) {
      selectedIds.add(Number(professor.id));
    }

    this.mailStore.patchParams({
      adherents: recipients,
      selectedAdherentIds: [...selectedIds],
      audienceType: 'ADHERENT',
      sendInfo: '',
    });
  }

  removeAdherent(adherent: AdherentListItem_VM): void {
    this.mailStore.removeSelectedAdherent(adherent.id);

    if (this.isContractOnlyRecipient(adherent)) {
      this.mailStore.patchParams({
        adherents: this.vm.adherents.filter(a => Number(a.id) !== Number(adherent.id)),
      });
    }
  }

  clearAudience(): void {
    this.mailStore.clearAudience();
    this.mailStore.patchParams({
      adherents: this.vm.adherents.filter(a => this.baseAdherentIds.has(Number(a.id))),
    });
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

  private async loadContractProfessors(): Promise<void> {
    try {
      const contracts = await this.contratProfApi.list(this.saisonId);
      const professorIds = Array.from(
        new Set(
          (contracts ?? [])
            .map(contract => Number(contract.professeur_id))
            .filter(id => Number.isFinite(id) && id > 0),
        ),
      );

      if (!professorIds.length) {
        this.contractProfessors = [];
        return;
      }

      const adherentsById = new Map(
        this.vm.adherents.map(adherent => [Number(adherent.id), adherent]),
      );
      const missingIds = professorIds.filter(id => !adherentsById.has(id));
      const personnes = missingIds.length
        ? await this.personneApi.list_by_id(missingIds)
        : [];
      const personnesById = new Map(
        (personnes ?? []).map(personne => [Number(personne.id), personne]),
      );

      this.contractProfessors = professorIds
        .map(id => adherentsById.get(id) ?? this.toMailRecipient(personnesById.get(id)))
        .filter((recipient): recipient is AdherentListItem_VM => !!recipient)
        .sort((a, b) => a.libelle.localeCompare(b.libelle, 'fr'));
    } catch (error) {
      console.error('Chargement des professeurs sous contrat impossible', error);
      this.contractProfessors = [];
    }
  }

  private toMailRecipient(personne: any): AdherentListItem_VM | null {
    if (!personne?.id) return null;

    const recipient = new AdherentListItem_VM();
    recipient.id = Number(personne.id);
    recipient.nom = String(personne.nom ?? personne.last_name ?? '');
    recipient.prenom = String(personne.prenom ?? personne.first_name ?? '');
    recipient.surnom = String(personne.surnom ?? personne.nickname ?? '');
    recipient.login = String(personne.login ?? '').trim();
    recipient.contact = [];
    recipient.groupesActifs = [];
    recipient.inscrit = false;
    recipient.archive = !!personne.archive;

    const birthDate = personne.date_naissance ? new Date(personne.date_naissance) : null;
    recipient.date_naissance = birthDate && !Number.isNaN(birthDate.getTime())
      ? birthDate
      : (null as any);

    (recipient as any).__contractProfessorOnly = true;
    return recipient;
  }

  private ensureRecipientAvailable(recipient: AdherentListItem_VM): void {
    if (this.vm.adherents.some(a => Number(a.id) === Number(recipient.id))) return;

    this.mailStore.patchParams({
      adherents: [...this.vm.adherents, recipient],
    });
  }

  private isContractOnlyRecipient(recipient: AdherentListItem_VM): boolean {
    return (recipient as any).__contractProfessorOnly === true;
  }

  private matchesRecipientSearch(adherent: AdherentListItem_VM, search: string): boolean {
    const haystack = [
      adherent.libelle,
      adherent.nom,
      adherent.prenom,
      adherent.surnom,
      adherent.login,
      ...this.getAdherentEmails(adherent),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(search);
  }
}
