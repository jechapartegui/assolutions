import { Injectable, computed, signal } from '@angular/core';
import { AdherentStore } from './adherent.store';
import { SeanceStore } from './seance.store';
import { MailComposerMapper } from '../mapper/mail-composer.mapper';
import { AudienceType, MailComposerVm, MailStep, MailType } from '../vm/mail-composer.vm';
import { MailProjectApiService } from '../services/mail-project-api.service';
import { MessageApiService } from '../services/message-api.service';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import { Seance_VM } from '@shared/index';

@Injectable({ providedIn: 'root' })
export class MailComposerStore {
  private readonly state = signal<MailComposerVm>({
    step: 'TYPE',
    loading: false,
    action: '',

    saisonId: 0,

    mailType: null,
    audienceType: 'TOUS',

    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })(),

    allSeances: [],
    seances: [],

    selectedSeance: null,
    serieSeances: [],
    sujetSerie: '',

    adherents: [],
    selectedAdherentIds: [],

    selectedGroupId: null,
    audienceSearch: '',

    templateSubject: '',
    templateHtml: '',

    generated: [],
    selectedGeneratedIndex: 0,

    paramsValidated: false,
    sendInfo: '',
  });

  readonly vm = computed(() => this.state());

  constructor(
    private readonly adherentStore: AdherentStore,
    private readonly seanceStore: SeanceStore,
    private readonly mapper: MailComposerMapper,
    private readonly mailProjectApi: MailProjectApiService,
    private readonly messageApi: MessageApiService,
  ) {}

  async init(saisonId: number): Promise<void> {
    const defaultDates = this.getDefaultDates();

    this.patch({
      ...this.mapper.createInitialVm(saisonId),
      ...defaultDates,
      loading: true,
      action: 'Chargement des données mails',
    });

    await Promise.all([
      this.adherentStore.init(saisonId),
      this.seanceStore.init(saisonId),
    ]);

    const seances = this.seanceStore.vm().list;

    this.patch({
      adherents: this.adherentStore.vm().list,
      allSeances: seances,
      seances: this.mapper.filterSeancesByDate(seances, defaultDates.dateDebut, defaultDates.dateFin),
      loading: false,
      action: '',
    });
  }

  selectType(type: MailType): void {
    this.patch({
      mailType: type,
      step: type === 'vide' || type === 'bienvenue' ? 'AUDIENCE' : 'PARAMS',
      audienceType: 'TOUS',
      selectedAdherentIds: [],
      selectedGroupId: null,
      audienceSearch: '',
      selectedSeance: null,
      serieSeances: [],
      sujetSerie: '',
      templateSubject: '',
      templateHtml: '',
      generated: [],
      selectedGeneratedIndex: 0,
      paramsValidated: type === 'vide' || type === 'bienvenue',
      sendInfo: '',
    });
  }

  goToStep(step: MailStep): void {
    const vm = this.vm();

    if (step === 'PARAMS' && (vm.mailType === 'vide' || vm.mailType === 'bienvenue')) {
      return;
    }

    if (step === 'AUDIENCE' && !this.canGoAudience()) {
      return;
    }

    if (step === 'BROUILLON' && vm.selectedAdherentIds.length === 0) {
      return;
    }

    this.patch({ step });
  }

  patchParams(patch: Partial<MailComposerVm>): void {
    this.patch({
      ...patch,
      sendInfo: patch.generated ? this.vm().sendInfo : '',
    });
  }

  updateDateDebut(value: string): void {
    const vm = this.vm();
    const seances = this.mapper.filterSeancesByDate(vm.allSeances, value, vm.dateFin);

    this.patch({
      dateDebut: value,
      seances,
      selectedSeance: this.keepSelectedSeance(vm.selectedSeance, seances),
      paramsValidated: false,
      generated: [],
      sendInfo: '',
    });
  }

  updateDateFin(value: string): void {
    const vm = this.vm();
    const seances = this.mapper.filterSeancesByDate(vm.allSeances, vm.dateDebut, value);

    this.patch({
      dateFin: value,
      seances,
      selectedSeance: this.keepSelectedSeance(vm.selectedSeance, seances),
      paramsValidated: false,
      generated: [],
      sendInfo: '',
    });
  }

  validateParams(): void {
    const vm = this.vm();

    const seances = this.mapper.filterSeancesByDate(vm.allSeances, vm.dateDebut, vm.dateFin);

    if (!this.areParamsValid({ ...vm, seances })) {
      return;
    }

    this.patch({
      seances,
      paramsValidated: true,
      step: 'AUDIENCE',
      generated: [],
      sendInfo: '',
    });
  }

  addSelectedAdherent(adherent: AdherentListItem_VM): void {
    const ids = new Set(this.vm().selectedAdherentIds);
    ids.add(adherent.id);

    this.patch({
      selectedAdherentIds: [...ids],
      audienceType: 'ADHERENT',
      sendInfo: '',
    });
  }

  removeSelectedAdherent(id: number): void {
    this.patch({
      selectedAdherentIds: this.vm().selectedAdherentIds.filter(x => x !== id),
      sendInfo: '',
    });
  }

  clearAudience(): void {
    this.patch({
      selectedAdherentIds: [],
      sendInfo: '',
    });
  }

  addAllAdherents(): void {
    this.patch({
      audienceType: 'TOUS',
      selectedAdherentIds: this.vm().adherents.map(a => a.id),
      sendInfo: '',
    });
  }

  addInscrits(): void {
    this.patch({
      audienceType: 'INSCRITS',
      selectedAdherentIds: this.vm().adherents
        .filter(a => a.inscrit)
        .map(a => a.id),
      sendInfo: '',
    });
  }

  addGroup(groupId: number): void {
    if (!groupId) return;

    const ids = new Set(this.vm().selectedAdherentIds);

    this.vm().adherents
      .filter(a => (a.groupesActifs ?? []).some((g: any) => Number(g.id) === Number(groupId)))
      .forEach(a => ids.add(a.id));

    this.patch({
      audienceType: 'GROUPE',
      selectedGroupId: groupId,
      selectedAdherentIds: [...ids],
      sendInfo: '',
    });
  }

  addEligibleForSelectedSeance(): void {
    const vm = this.vm();
    if (!vm.selectedSeance) return;

    const ids = new Set(vm.selectedAdherentIds);

    vm.adherents
      .filter(a => this.mapper.isAdherentEligibleForSeance(a, vm.selectedSeance as Seance_VM))
      .forEach(a => ids.add(a.id));

    this.patch({
      audienceType: 'ELIGIBLES_SEANCE',
      selectedAdherentIds: [...ids],
      sendInfo: '',
    });
  }

  addSeance(seance: Seance_VM): void {
    const exists = this.vm().serieSeances.some(s => s.id === seance.id);
    if (exists) return;

    this.patch({
      serieSeances: [...this.vm().serieSeances, seance],
      paramsValidated: false,
      sendInfo: '',
    });
  }

  removeSeance(seanceId: number): void {
    this.patch({
      serieSeances: this.vm().serieSeances.filter(s => s.id !== seanceId),
      paramsValidated: false,
      sendInfo: '',
    });
  }

  async goToDraft(): Promise<void> {
    const vm = this.vm();

    if (!vm.selectedAdherentIds.length) return;

    this.patch({
      loading: true,
      action: 'Chargement du template',
      sendInfo: '',
    });

    try {
      if (vm.mailType === 'vide') {
        this.patch({
          templateSubject: '',
          templateHtml: '',
          step: 'BROUILLON',
          loading: false,
          action: '',
        });
        return;
      }

      const template = await this.mailProjectApi.getTemplate(vm.mailType as any);

      this.patch({
        templateSubject: template?.sujet ?? '',
        templateHtml: template?.mail ?? '',
        step: 'BROUILLON',
        loading: false,
        action: '',
      });
    } catch {
      this.patch({
        loading: false,
        action: '',
      });

      throw new Error('Chargement du template impossible');
    }
  }

  generatePreview(): void {
    const vm = this.vm();

    if (!vm.mailType) return;

    const selected = vm.adherents.filter(a =>
      vm.selectedAdherentIds.includes(a.id),
    );

    const extra = {
      DATE_DEBUT: vm.dateDebut,
      DATE_FIN: vm.dateFin,
      NOM_CHAMPIONNAT: vm.sujetSerie,
      SEANCE: vm.selectedSeance,
      SEANCES: vm.serieSeances,
      ALL_SEANCES: vm.allSeances,
    };

    this.patch({
      generated: selected.flatMap(a =>
        this.mapper.buildGeneratedMails(
          a,
          vm.templateSubject,
          vm.templateHtml,
          extra,
          vm.mailType as MailType,
        ),
      ),
      selectedGeneratedIndex: 0,
      sendInfo: '',
    });
  }

  async saveTemplate(): Promise<void> {
    const vm = this.vm();
    if (!vm.mailType || vm.mailType === 'vide') return;

    await this.mailProjectApi.updateTemplate(vm.mailType as any, {
      subject: vm.templateSubject,
      body_html: vm.templateHtml,
    } as any);
  }

  async sendOne(index: number): Promise<void> {
    const mail = this.vm().generated[index];
    if (!mail?.to?.email) return;

    this.patch({
      loading: true,
      action: 'Envoi du mail',
      sendInfo: '',
    });

    try {
      await this.messageApi.send({
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        record: `adherent:${mail.adherent.id}`,
      });

      this.markSent(index);

      this.patch({
        loading: false,
        action: '',
        sendInfo: `Mail envoyé à ${mail.to.email} le ${this.formatNow()}.`,
      });
    } catch (e: any) {
      this.markError(index, e?.message ?? 'Erreur lors de l’envoi');

      this.patch({
        loading: false,
        action: '',
        sendInfo: `Erreur lors de l’envoi du mail à ${mail.to.email}.`,
      });
    }
  }

  async sendAll(): Promise<void> {
    const vm = this.vm();
    const mails = vm.generated.filter(m => !!m.to?.email);

    if (!mails.length) return;

    this.patch({
      loading: true,
      action: `Envoi de ${mails.length} mail(s)`,
      sendInfo: '',
    });

    try {
      await this.messageApi.sendMany(
        mails.map(m => ({
          to: m.to,
          subject: m.subject,
          html: m.html,
          record: `adherent:${m.adherent.id}`,
        })),
      );

      this.patch({
        loading: false,
        action: '',
        generated: this.vm().generated.map(m => ({
          ...m,
          status: m.to?.email ? 'SENT' : 'ERROR',
          error: m.to?.email ? undefined : 'Adresse mail manquante',
        })),
        sendInfo: `${mails.length} mail(s) envoyé(s) le ${this.formatNow()}.`,
      });
    } catch (e: any) {
      this.patch({
        loading: false,
        action: '',
        generated: this.vm().generated.map(m => ({
          ...m,
          status: m.to?.email ? 'ERROR' : m.status,
          error: m.to?.email ? e?.message ?? 'Erreur lors de l’envoi' : m.error,
        })),
        sendInfo: `Erreur lors de l’envoi groupé.`,
      });
    }
  }

  get selectedAdherents(): AdherentListItem_VM[] {
    const vm = this.vm();
    return vm.adherents.filter(a => vm.selectedAdherentIds.includes(a.id));
  }

  get mailTypes() {
    return this.mapper.getMailTypes();
  }

  canGoAudience(): boolean {
    return this.areParamsValid(this.vm());
  }

  canGoDraft(): boolean {
    return this.vm().selectedAdherentIds.length > 0;
  }

  private areParamsValid(vm: MailComposerVm): boolean {
    if (!vm.mailType) return false;

    if (vm.mailType === 'vide' || vm.mailType === 'bienvenue') {
      return true;
    }

    if (!vm.dateDebut || !vm.dateFin) return false;

    if (vm.mailType === 'annulation' || vm.mailType === 'convocation') {
      return !!vm.selectedSeance;
    }

    if (vm.mailType === 'serie_seance') {
      return vm.serieSeances.length > 0;
    }

    return true;
  }

  private keepSelectedSeance(selected: Seance_VM | null, seances: Seance_VM[]): Seance_VM | null {
    if (!selected) return null;
    return seances.some(s => s.id === selected.id) ? selected : null;
  }

  private getDefaultDates(): { dateDebut: string; dateFin: string } {
    const debut = new Date();

    const fin = new Date(debut);
    fin.setMonth(fin.getMonth() + 1);

    return {
      dateDebut: debut.toISOString().slice(0, 10),
      dateFin: fin.toISOString().slice(0, 10),
    };
  }

  private markSent(index: number): void {
    this.patch({
      generated: this.vm().generated.map((m, i) =>
        i === index ? { ...m, status: 'SENT', error: undefined } : m,
      ),
    });
  }

  private markError(index: number, error: string): void {
    this.patch({
      generated: this.vm().generated.map((m, i) =>
        i === index ? { ...m, status: 'ERROR', error } : m,
      ),
    });
  }

  private formatNow(): string {
    return new Date().toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private patch(patch: Partial<MailComposerVm>): void {
    this.state.update(current => ({
      ...current,
      ...patch,
    }));
  }
}