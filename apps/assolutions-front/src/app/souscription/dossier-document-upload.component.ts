import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  DossierPersonneEvaluation,
  ExigenceEvaluation,
  TypeLicence,
} from '@shared/index';

import { DossierPersonneApiService } from '../../services/dossier-personne-api.service';
import { ErrorService } from '../../services/error.service';

@Component({
  standalone: false,
  selector: 'app-dossier-document-upload',
  template: `
    <div class="document-upload">
      <input
        #input
        class="input"
        type="file"
        accept="image/*,.pdf"
        [disabled]="loading"
        (change)="upload($event)"
      />
      <p class="help" i18n="@@document.uploadHelp">PDF ou image, 10 Mo maximum.</p>
      <p class="help is-success" *ngIf="message">{{ message }}</p>
    </div>
  `,
  styles: [
    `.document-upload { margin-top: .6rem; max-width: 520px; }`,
  ],
})
export class DossierDocumentUploadComponent {
  @Input({ required: true }) personId!: number;
  @Input({ required: true }) seasonId!: number;
  @Input({ required: true }) groupIds: number[] = [];
  @Input() tariffId: number | null = null;
  @Input() licenceType: TypeLicence = 'LOISIR';
  @Input({ required: true }) requirement!: ExigenceEvaluation;
  @Output() evaluationChange = new EventEmitter<DossierPersonneEvaluation>();

  loading = false;
  message = '';

  constructor(private readonly api: DossierPersonneApiService) {}

  async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.error($localize`:@@document.maxSize:Le fichier dépasse 10 Mo`);
      input.value = '';
      return;
    }

    this.loading = true;
    this.message = '';
    try {
      const data = await this.readFile(file);
      await this.api.saveDocument({
        personne_id: this.personId,
        typedoc: this.requirement.source_code || this.requirement.code,
        titre: file.name,
        mimetype: file.type || 'application/octet-stream',
        data_base64: data,
        date_document: new Date().toISOString().slice(0, 10),
      });
      const evaluation = await this.api.evaluate({
        saison_id: this.seasonId,
        personne_id: this.personId,
        groupe_ids: [...this.groupIds],
        tarif_inscription_id: this.tariffId,
        type_licence: this.licenceType,
      });
      this.message = $localize`:@@document.saved:Document enregistré`;
      this.evaluationChange.emit(evaluation);
      input.value = '';
    } catch (error: any) {
      this.error(
        error?.error?.message ??
          error?.message ??
          $localize`:@@document.saveFailed:Enregistrement impossible`,
      );
    } finally {
      this.loading = false;
    }
  }

  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () =>
        reject(new Error($localize`:@@document.readFailed:Lecture du fichier impossible`));
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.readAsDataURL(file);
    });
  }

  private error(message: string): void {
    ErrorService.instance.emitChange(
      ErrorService.instance.CreateError(
        $localize`:@@document.add:Ajout du document`,
        message,
      ),
    );
  }
}
