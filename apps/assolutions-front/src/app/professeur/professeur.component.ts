import { Component, OnInit } from '@angular/core';
import { Professeur } from '@shared/lib/professeur.interface';
import { PersonneLight_VM } from '@shared/lib/personne.interface';
import { ProfesseurStore } from '../../store/professeur.store';

@Component({
  standalone: false,
  selector: 'app-professeur',
  templateUrl: './professeur.component.html',
  styleUrls: ['../contrat-prof/contrat-prof.component.css'],
})
export class ProfesseurComponent implements OnInit {
  constructor(public readonly store: ProfesseurStore) {}

  get loading(): boolean {
    return this.store.loading();
  }

  get saving(): boolean {
    return this.store.saving();
  }

  get profs(): Professeur[] {
    return this.store.profs();
  }

  get selectedPersonneId(): number | null {
    return this.store.selectedPersonneId();
  }

  set selectedPersonneId(value: number | null) {
    this.store.setSelectedPersonneId(value);
  }

  get editing(): Professeur | null {
    return this.store.editing();
  }

  get contratsExistByProfId(): Record<number, boolean> {
    return this.store.contratsExistByProfId();
  }

  get personnesById(): Record<number, PersonneLight_VM> {
    return this.store.personnesById();
  }

  ngOnInit(): void {
    void this.store.init();
  }

  async load(): Promise<void> {
    await this.store.load(true);
  }

  getLibelle(prof: Professeur): string {
    return this.store.getLibelle(prof);
  }

  canDelete(prof: Professeur): boolean {
    return this.store.canDelete(prof);
  }

  async addProfesseur(): Promise<void> {
    await this.store.addProfesseur();
  }

  edit(prof: Professeur): void {
    this.store.edit(prof);
  }

  cancel(): void {
    this.store.cancel();
  }

  patch(field: keyof Professeur, value: any): void {
    this.store.patchEditing(field, value);
  }

  async save(): Promise<void> {
    await this.store.save();
  }

  async remove(prof: Professeur): Promise<void> {
    if (!this.canDelete(prof)) {
      alert('Impossible de supprimer ce professeur : il possède au moins un contrat.');
      return;
    }

    if (!confirm(`Supprimer ${this.getLibelle(prof)} des professeurs ?`)) return;

    await this.store.remove(prof);
  }
}
