import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  EvaluationPreuveMedicale,
  PreuveMedicale,
  TypeLicence,
} from '@shared/index';

import { DossierPersonneApiService } from '../../services/dossier-personne-api.service';
import { ErrorService } from '../../services/error.service';

type ProofType = 'QS_SPORT' | 'CERTIFICAT';

@Component({
  selector: 'app-medical-proof-editor',
  templateUrl: './medical-proof-editor.component.html',
  styleUrls: ['./medical-proof-editor.component.css'],
  standalone: false,
})
export class MedicalProofEditorComponent implements OnChanges {
  @Input({ required: true }) personId = 0;
  @Input({ required: true }) seasonId = 0;
  @Input() licenceType: TypeLicence = 'LOISIR';
  @Input() showHistory = true;
  @Output() evaluationChange = new EventEmitter<EvaluationPreuveMedicale>();

  loading = false;
  proofs: PreuveMedicale[] = [];
  evaluation: EvaluationPreuveMedicale | null = null;

  type: ProofType = 'QS_SPORT';
  date = new Date().toISOString().slice(0, 10);
  qsNegative = true;
  doctorName = '';
  rpps = '';
  competition = false;
  comment = '';

  selectedFileName = '';
  selectedMimeType = '';
  selectedDataUrl = '';

  constructor(private readonly api: DossierPersonneApiService) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (
      changes['personId'] ||
      changes['seasonId'] ||
      changes['licenceType']
    ) {
      this.competition = this.licenceType === 'COMPETITION';
      await this.reload();
    }
  }

  get canSave(): boolean {
    if (!this.personId || !this.seasonId || !this.date || !this.selectedDataUrl) {
      return false;
    }
    if (this.type === 'CERTIFICAT') {
      return !!this.doctorName.trim() && !!this.rpps.trim();
    }
    return typeof this.qsNegative === 'boolean';
  }

  async reload(): Promise<void> {
    if (!this.personId || !this.seasonId) return;
    this.loading = true;
    try {
      const [proofs, evaluation] = await Promise.all([
        this.api.listMedicalProofs(this.personId, this.seasonId),
        this.api.evaluateMedicalProof(
          this.personId,
          this.seasonId,
          this.licenceType,
        ),
      ]);
      this.proofs = proofs ?? [];
      this.evaluation = evaluation;
      this.evaluationChange.emit(evaluation);
    } catch (error) {
      this.emitError($localize`:@@medical.load:Charger la situation médicale`, error);
    } finally {
      this.loading = false;
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowed =
      file.type === 'application/pdf' || file.type.startsWith('image/');
    if (!allowed) {
      input.value = '';
      this.emitError(
        $localize`:@@medical.addProof:Ajouter le justificatif`,
        new Error($localize`:@@medical.invalidFileType:Le fichier doit être un PDF ou une image.`),
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      input.value = '';
      this.emitError(
        $localize`:@@medical.addProof:Ajouter le justificatif`,
        new Error($localize`:@@medical.maxFileSize:Le fichier ne doit pas dépasser 10 Mo.`),
      );
      return;
    }

    this.selectedFileName = file.name;
    this.selectedMimeType = file.type || 'application/octet-stream';
    this.selectedDataUrl = await this.readDataUrl(file);
  }

  clearFile(input?: HTMLInputElement): void {
    this.selectedFileName = '';
    this.selectedMimeType = '';
    this.selectedDataUrl = '';
    if (input) input.value = '';
  }

  async save(): Promise<void> {
    if (!this.canSave) return;
    this.loading = true;
    try {
      const document = await this.api.saveDocument({
        personne_id: this.personId,
        typedoc:
          this.type === 'CERTIFICAT' ? 'CERTIFICAT_MEDICAL' : 'QS_SPORT',
        titre:
          this.type === 'CERTIFICAT'
            ? $localize`:@@medical.certificateTitle:Certificat médical du ${this.date}:DATE:`
            : $localize`:@@medical.questionnaireTitle:Questionnaire de santé ${this.seasonId}:SEASON_ID:`,
        mimetype: this.selectedMimeType,
        data_base64: this.selectedDataUrl,
        date_document: this.date,
      });

      await this.api.saveMedicalProof({
        personne_id: this.personId,
        saison_id: this.seasonId,
        type_preuve: this.type,
        date_document: this.date,
        qs_reponses_negatives:
          this.type === 'QS_SPORT' ? this.qsNegative : null,
        valable_competition:
          this.type === 'CERTIFICAT' && this.competition,
        medecin_nom: this.type === 'CERTIFICAT' ? this.doctorName.trim() : null,
        medecin_rpps: this.type === 'CERTIFICAT' ? this.rpps.trim() : null,
        document_id: document.id,
        commentaire: this.comment.trim() || null,
      });

      this.resetForm();
      await this.reload();
    } catch (error) {
      this.emitError($localize`:@@medical.save:Enregistrer la situation médicale`, error);
    } finally {
      this.loading = false;
    }
  }

  proofLabel(proof: PreuveMedicale): string {
    if (proof.type_preuve === 'QS_SPORT') {
      return proof.qs_reponses_negatives
        ? $localize`:@@medical.negativeQuestionnaire:Questionnaire de santé négatif`
        : $localize`:@@medical.positiveQuestionnaire:Questionnaire avec réponse positive`;
    }
    return proof.valable_competition
      ? $localize`:@@medical.competitionCertificate:Certificat médical compétition`
      : $localize`:@@medical.certificate:Certificat médical`;
  }

  private resetForm(): void {
    this.type = 'QS_SPORT';
    this.date = new Date().toISOString().slice(0, 10);
    this.qsNegative = true;
    this.doctorName = '';
    this.rpps = '';
    this.competition = this.licenceType === 'COMPETITION';
    this.comment = '';
    this.clearFile();
  }

  private readDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () =>
        reject(new Error($localize`:@@document.readFailed:Lecture du fichier impossible`));
      reader.readAsDataURL(file);
    });
  }

  private emitError(label: string, error: any): void {
    const message =
      error?.error?.message ??
      error?.error?.error?.message ??
      error?.message ??
      $localize`:@@common.errorOccurred:Une erreur est survenue`;
    ErrorService.instance.emitChange(
      ErrorService.instance.CreateError(
        label,
        Array.isArray(message) ? message.join(' · ') : String(message),
      ),
    );
  }
}
