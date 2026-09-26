import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { EvaluationPreuveMedicale, PreuveMedicale, TypeLicence } from '@shared/index';
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

  readonly qsQuestions = [
    'Un membre de votre famille est-il décédé subitement d’une cause cardiaque ou inexpliquée ?',
    'Avez-vous ressenti une douleur dans la poitrine, des palpitations, un essoufflement inhabituel ou un malaise ?',
    'Avez-vous eu un épisode de respiration sifflante (asthme) ?',
    'Avez-vous eu une perte de connaissance ?',
    'Avez-vous arrêté le sport pendant 30 jours ou plus pour des raisons de santé sans reprendre avec l’accord d’un médecin ?',
    'Avez-vous débuté un traitement médical de longue durée, hors contraception et désensibilisation aux allergies ?',
    'Ressentez-vous une douleur, un manque de force ou une raideur à la suite d’un problème osseux, articulaire ou musculaire survenu durant les 12 derniers mois ?',
    'Votre pratique sportive a-t-elle été interrompue pour des raisons de santé ?',
    'Pensez-vous avoir besoin d’un avis médical pour poursuivre votre pratique sportive ?',
  ];
  qsAnswers: Array<boolean | null> = Array(9).fill(null);

  loading = false;
  proofs: PreuveMedicale[] = [];
  evaluation: EvaluationPreuveMedicale | null = null;
  type: ProofType = 'QS_SPORT';
  date = new Date().toISOString().slice(0, 10);
  doctorName = '';
  rpps = '';
  comment = '';
  selectedFileName = '';
  selectedMimeType = '';
  selectedDataUrl = '';

  constructor(private readonly api: DossierPersonneApiService) {}

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes['personId'] || changes['seasonId'] || changes['licenceType']) await this.reload();
  }

  get qsComplete(): boolean { return this.qsAnswers.every((x) => x !== null); }
  get qsNegative(): boolean { return this.qsComplete && this.qsAnswers.every((x) => x === false); }
  get qsHasPositive(): boolean { return this.qsAnswers.some((x) => x === true); }

  get canSave(): boolean {
    if (!this.personId || !this.seasonId || !this.date) return false;
    if (this.type === 'QS_SPORT') return this.qsComplete;
    return !!this.selectedDataUrl && !!this.doctorName.trim() && !!this.rpps.trim();
  }

  setQsAnswer(index: number, value: boolean): void { this.qsAnswers[index] = value; }

  async reload(): Promise<void> {
    if (!this.personId || !this.seasonId) return;
    this.loading = true;
    try {
      const [proofs, evaluation] = await Promise.all([
        this.api.listMedicalProofs(this.personId, this.seasonId),
        this.api.evaluateMedicalProof(this.personId, this.seasonId, this.licenceType),
      ]);
      this.proofs = proofs ?? []; this.evaluation = evaluation; this.evaluationChange.emit(evaluation);
    } catch (error) { this.emitError('Charger la situation médicale', error); }
    finally { this.loading = false; }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    if (!(file.type === 'application/pdf' || file.type.startsWith('image/')) || file.size > 10 * 1024 * 1024) {
      input.value = ''; this.emitError('Ajouter le justificatif', new Error('Le fichier doit être un PDF ou une image de 10 Mo maximum.')); return;
    }
    this.selectedFileName=file.name; this.selectedMimeType=file.type || 'application/octet-stream'; this.selectedDataUrl=await this.readDataUrl(file);
  }

  clearFile(input?: HTMLInputElement): void { this.selectedFileName=''; this.selectedMimeType=''; this.selectedDataUrl=''; if(input) input.value=''; }

  async save(): Promise<void> {
    if (!this.canSave) return; this.loading=true;
    try {
      let documentId: number | null = null;
      if (this.type === 'CERTIFICAT') {
        const document = await this.api.saveDocument({
          personne_id:this.personId, typedoc:'CERTIFICAT_MEDICAL', titre:`Certificat médical du ${this.date}`,
          mimetype:this.selectedMimeType, data_base64:this.selectedDataUrl, date_document:this.date,
        });
        documentId=document.id;
      }
      await this.api.saveMedicalProof({
        personne_id:this.personId, saison_id:this.seasonId, type_preuve:this.type, date_document:this.date,
        qs_reponses_negatives:this.type==='QS_SPORT' ? this.qsNegative : null,
        valable_competition:this.type==='CERTIFICAT',
        medecin_nom:this.type==='CERTIFICAT' ? this.doctorName.trim() : null,
        medecin_rpps:this.type==='CERTIFICAT' ? this.rpps.trim() : null,
        document_id:documentId as any, commentaire:this.comment.trim() || null,
      });
      this.resetForm(); await this.reload();
    } catch(error) { this.emitError('Enregistrer la situation médicale', error); }
    finally { this.loading=false; }
  }

  proofLabel(proof: PreuveMedicale): string {
    if(proof.type_preuve==='QS_SPORT') return proof.qs_reponses_negatives ? 'Attestation QS Sport — toutes réponses NON' : 'QS Sport — certificat requis';
    return 'Certificat médical';
  }

  private resetForm():void { this.type='QS_SPORT'; this.date=new Date().toISOString().slice(0,10); this.qsAnswers=Array(9).fill(null); this.doctorName=''; this.rpps=''; this.comment=''; this.clearFile(); }
  private readDataUrl(file:File):Promise<string>{return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result??''));r.onerror=()=>reject(new Error('Lecture du fichier impossible'));r.readAsDataURL(file);});}
  private emitError(label:string,error:any):void { const message=error?.error?.message??error?.message??'Une erreur est survenue'; ErrorService.instance.emitChange(ErrorService.instance.CreateError(label,Array.isArray(message)?message.join(' · '):String(message))); }
}
