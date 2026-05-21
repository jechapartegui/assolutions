import { Injectable, computed, signal } from '@angular/core';
import { AdherentListItem_VM } from '../vm/adherent-page.vm';
import {
  createInitialGroupePageVm,
  GroupePageVm,
} from '../vm/groupe-page.vm';
import { GroupeRepository } from '../repository/groupe.repository';
import { Groupe, LienGroupe_VM } from '@shared/index';
import { AppStore } from '../app/app.store';

@Injectable({ providedIn: 'root' })
export class GroupeStore {
  private readonly state = signal<GroupePageVm>(createInitialGroupePageVm());
  readonly vm = computed(() => this.state());

  private initPromise: Promise<void> | null = null;

  constructor(private readonly repository: GroupeRepository, private readonly appstore:AppStore) {}

  async init(saisonId: number): Promise<void> {
    const current = this.state();
    if (current.activeSaisonId === saisonId && current.groupes.length > 0 && current.adherents.length > 0) {
      return;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = this.reload(saisonId);
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async reload(saisonId = this.state().activeSaisonId): Promise<void> {
    if (!saisonId) return;

    this.patch({ loading: true, action: 'Chargement des groupes' });
    const data = await this.repository.loadPageData(saisonId);

    const selectedStillExists = data.groupes.some((g) => g.id === this.state().selectedGroupeId);
    const selectedGroupeId = selectedStillExists
      ? this.state().selectedGroupeId
      : data.groupes[0]?.id ?? null;

    this.state.set({
      ...this.state(),
      ...data,
      activeSaisonId: saisonId,
      selectedGroupeId,
      loading: false,
      action: '',
    });
  }

  patch(partial: Partial<GroupePageVm>): void {
    this.state.update((vm) => ({ ...vm, ...partial }));
  }

  selectGroupe(id: number): void {
    this.patch({ selectedGroupeId: id, editGroupe: null, adherentToAddId: null });
  }

  startCreate(): void {
    this.patch({
      editGroupe: {
        id: 0,
        saison_id: this.state().activeSaisonId,
        project_id: this.appstore.selectedProjectId(),
        nom: '',
        whatsapp: '', visible: false,
      },
    });
  }

  startEdit(groupe: Groupe): void {
    this.patch({
      selectedGroupeId: groupe.id,
      editGroupe: { ...groupe },
    });
  }

  cancelEdit(): void {
    this.patch({ editGroupe: null });
  }

  patchEdit(partial: Partial<Groupe>): void {
    const current = this.state().editGroupe;
    if (!current) return;

    this.patch({ editGroupe: { ...current, ...partial } });
  }

  async saveEdit(): Promise<void> {
    const current = this.state().editGroupe;
    const saisonId = this.state().activeSaisonId ?? 0;
    if (!current || !saisonId) return;

    const nom = (current.nom ?? '').trim();
    if (!nom) throw new Error('Le nom du groupe est obligatoire');

    const duplicate = this.state().groupes.some(
      (g) => g.id !== current.id && g.nom.trim().toLowerCase() === nom.toLowerCase(),
    );
    if (duplicate) throw new Error('Un groupe existe déjà avec ce nom');

    this.patch({ loading: true, action: current.id ? 'Mise à jour du groupe' : 'Création du groupe' });

    const saved = current.id
      ? await this.repository.updateGroupe({ ...current, nom }, saisonId)
      : await this.repository.createGroupe({ ...current, nom }, saisonId);

    const groupes = current.id
      ? this.state().groupes.map((g) => (g.id === saved.id ? saved : g))
      : [...this.state().groupes, saved];

    this.patch({
      groupes,
      selectedGroupeId: saved.id,
      editGroupe: null,
      loading: false,
      action: '',
    });
  }

  async deleteGroupe(groupe: Groupe): Promise<void> {
    this.patch({ loading: true, action: 'Suppression du groupe' });

    await this.repository.deleteGroupe(groupe.id, this.state().adherents);

    const groupes = this.state().groupes.filter((g) => g.id !== groupe.id);
    const adherents = this.state().adherents.map((a) => this.withoutGroupe(a, groupe.id));

    this.patch({
      groupes,
      adherents,
      selectedGroupeId: groupes[0]?.id ?? null,
      editGroupe: null,
      loading: false,
      action: '',
    });
  }

  async addSelectedAdherentToSelectedGroupe(): Promise<void> {
    const adherentId = this.state().adherentToAddId;
    const groupe = this.selectedGroupe();
    if (!adherentId || !groupe) return;

    const adherent = this.state().adherents.find((a) => a.id === adherentId);
    if (!adherent) return;

    if (this.isAdherentInGroupe(adherent, groupe.id)) {
      throw new Error('Cet adhérent est déjà dans le groupe');
    }

    this.patch({ loading: true, action: 'Ajout de l’adhérent au groupe' });
    const lienId = await this.repository.addAdherentToGroupe(adherent.id, groupe.id);

    const adherents = this.state().adherents.map((a) => {
      if (a.id !== adherent.id) return a;
      return {
        ...a,
        groupesActifs: [
          ...(a.groupesActifs ?? []),
          { id: groupe.id, nom: groupe.nom, id_lien: lienId ?? 0 } as LienGroupe_VM,
        ],
      } as AdherentListItem_VM;
    });

    this.patch({ adherents, adherentToAddId: null, loading: false, action: '' });
  }

  async removeAdherentFromSelectedGroupe(adherent: AdherentListItem_VM): Promise<void> {
    const groupe = this.selectedGroupe();
    if (!groupe) return;

    this.patch({ loading: true, action: 'Suppression de l’adhérent du groupe' });
    await this.repository.removeAdherentFromGroupe(adherent, groupe.id);

    const adherents = this.state().adherents.map((a) =>
      a.id === adherent.id ? this.withoutGroupe(a, groupe.id) : a,
    );

    this.patch({ adherents, loading: false, action: '' });
  }

  selectedGroupe(): Groupe | null {
    const id = this.state().selectedGroupeId;
    return this.state().groupes.find((g) => g.id === id) ?? null;
  }

  membersOfSelectedGroupe(): AdherentListItem_VM[] {
    const groupe = this.selectedGroupe();
    if (!groupe) return [];
    return this.state().adherents.filter((a) => this.isAdherentInGroupe(a, groupe.id));
  }

  availableAdherentsForSelectedGroupe(): AdherentListItem_VM[] {
    const groupe = this.selectedGroupe();
    const filter = this.state().filterAdherent.trim().toLowerCase();
    if (!groupe) return [];

    return this.state().adherents
      .filter((a) => !this.isAdherentInGroupe(a, groupe.id))
      .filter((a) => {
        const label = `${a.libelle ?? ''} ${a.prenom ?? ''} ${a.nom ?? ''} ${a.surnom ?? ''}`.toLowerCase();
        return !filter || label.includes(filter);
      })
      .sort((a, b) => (a.libelle ?? '').localeCompare(b.libelle ?? '', 'fr', { sensitivity: 'base' }));
  }

  isAdherentInGroupe(adherent: AdherentListItem_VM, groupeId: number): boolean {
    return (adherent.groupesActifs ?? []).some((g: LienGroupe_VM) => g.id === Number(groupeId));
  }

  countMembers(groupeId: number): number {
    return this.state().adherents.filter((a) => this.isAdherentInGroupe(a, groupeId)).length;
  }

  private withoutGroupe(adherent: AdherentListItem_VM, groupeId: number): AdherentListItem_VM {
    return {
      ...adherent,
      groupesActifs: (adherent.groupesActifs ?? []).filter((g: LienGroupe_VM) => g.id !== Number(groupeId)),
    } as AdherentListItem_VM;
  }


  setFilterAdherent(value: string): void {
    this.patch({ filterAdherent: value ?? '' });
  }

  setAdherentToAddId(value: number | null): void {
    this.patch({ adherentToAddId: value });
  }

  


 
}
