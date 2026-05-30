import { Injectable, computed, signal } from '@angular/core';
import { AdherentStore } from './adherent.store';
import { SeanceStore } from './seance.store';
import { MailComposerMapper } from '../mapper/mail-composer.mapper';
import { MailComposerVm, MailType } from '../vm/mail-composer.vm';
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

  selectedSeance: null,
  serieSeances: [],
  sujetSerie: '',

  adherents: [],
  seances: [],

  selectedAdherentIds: [],

  templateSubject: '',
  templateHtml: '',

  generated: [],
  selectedGeneratedIndex: 0,
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
  this.patch({
    adherents: this.adherentStore.vm().list,
    seances: this.seanceStore.vm().list,
    loading: false,
    action: '',
  });
}

  selectType(type: MailType): void {
    this.patch({
      mailType: type,
      step: type === 'vide' || type === 'bienvenue' ? 'AUDIENCE' : 'PARAMS',
      templateSubject: '',
      templateHtml: '',
      generated: [],
      selectedGeneratedIndex: 0,
    });
  }

  patchParams(patch: Partial<MailComposerVm>): void {
    this.patch(patch);
  }

  validateDateRange(): void {
    const vm = this.vm();
    this.patch({
      seances: this.mapper.filterSeancesByDate(
        vm.seances,
        vm.dateDebut,
        vm.dateFin,
      ),
    });
  }

  addSelectedAdherent(adherent: AdherentListItem_VM): void {
    const ids = new Set(this.vm().selectedAdherentIds);
    ids.add(adherent.id);
    this.patch({ selectedAdherentIds: [...ids] });
  }

  removeSelectedAdherent(id: number): void {
    this.patch({
      selectedAdherentIds: this.vm().selectedAdherentIds.filter(x => x !== id),
    });
  }

  clearAudience(): void {
    this.patch({ selectedAdherentIds: [] });
  }

  addAllAdherents(): void {
    this.patch({
      selectedAdherentIds: this.vm().adherents.map(a => a.id),
    });
  }

  addInscrits(): void {
    this.patch({
      selectedAdherentIds: this.vm().adherents
        .filter(a => a.inscrit)
        .map(a => a.id),
    });
  }

  addSeance(seance: Seance_VM): void {
    const exists = this.vm().serieSeances.some(s => s.id === seance.id);
    if (exists) return;

    this.patch({
      serieSeances: [...this.vm().serieSeances, seance],
    });
  }

  removeSeance(seanceId: number): void {
    this.patch({
      serieSeances: this.vm().serieSeances.filter(s => s.id !== seanceId),
    });
  }

async goToDraft(): Promise<void> {
  const vm = this.vm();
  this.patch({
    loading: true,
    action: 'Chargement du template',
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
    vm.selectedAdherentIds.includes(a.id)
  );
  const extra = {
    DATE_DEBUT: vm.dateDebut,
    DATE_FIN: vm.dateFin,
    NOM_CHAMPIONNAT: vm.sujetSerie,
    SEANCE: vm.selectedSeance,

    // IMPORTANT : série
    SEANCES: vm.serieSeances,

    // IMPORTANT : relance
    ALL_SEANCES: vm.seances,
  };

  this.patch({
    generated: selected.flatMap(a =>
      this.mapper.buildGeneratedMails(
        a,
        vm.templateSubject,
        vm.templateHtml,
        extra,
        vm.mailType,
      ),
    ),
    selectedGeneratedIndex: 0,
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

  private getDefaultDates(): { dateDebut: string; dateFin: string } {
  const debut = new Date();

  const fin = new Date(debut);
  fin.setMonth(fin.getMonth() + 1);

  return {
    dateDebut: debut.toISOString().slice(0, 10),
    dateFin: fin.toISOString().slice(0, 10),
  };
}

  async sendOne(index: number): Promise<void> {
    const mail = this.vm().generated[index];
    if (!mail?.to) return;

    await this.messageApi.send({
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
    } as any);

    this.markSent(index);
  }

  async sendAll(): Promise<void> {
    const mails = this.vm().generated.filter(m => m.to);

    await this.messageApi.sendMany(
      mails.map(m => ({
        to: m.to,
        subject: m.subject,
        html: m.html,
      })) as any,
    );

    this.patch({
      generated: this.vm().generated.map(m => ({
        ...m,
        status: m.to ? 'SENT' : 'ERROR',
        error: m.to ? undefined : 'Adresse mail manquante',
      })),
    });
  }

  get selectedAdherents(): AdherentListItem_VM[] {
    const vm = this.vm();
    return vm.adherents.filter(a => vm.selectedAdherentIds.includes(a.id));
  }

  get mailTypes() {
    return this.mapper.getMailTypes();
  }

  private markSent(index: number): void {
    this.patch({
      generated: this.vm().generated.map((m, i) =>
        i === index ? { ...m, status: 'SENT' } : m,
      ),
    });
  }

  private patch(patch: Partial<MailComposerVm>): void {
    this.state.update(current => ({
      ...current,
      ...patch,
    }));
  }
}