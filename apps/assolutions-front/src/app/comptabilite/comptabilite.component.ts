import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddInfoService } from '../../services/addinfo.service';
import { ComptabiliteService } from '../../services/comptabilite.service';
import { CompteBancaireService } from '../../services/compte-bancaire.service';
import { ErrorService } from '../../services/error.service';
import { OperationService } from '../../services/operation.service';
import { SaisonService } from '../../services/saison.service';
import { StockService } from '../../services/stock.service';
import { StaticClass } from '../global';
import { Saison_VM } from '@shared/lib/saison.interface';
import { CompteBancaire_VM, FluxFinancier_VM, GenericLink_VM, Operation_VM, Stock_VM, ValidationItem } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-comptabilite',
  templateUrl: './comptabilite.component.html',
  styleUrls: ['./comptabilite.component.css'],
})
export class ComptabiliteComponent implements OnInit {
  // --- State (safely initialized) ---
  active_saison: number = 0;
  liste_saison: Saison_VM[] = [];
  FluxFinanciers: FluxFinancier_VM[] = [];
  editFluxFlinancier: FluxFinancier_VM | null = null;
  stocks: GenericLink_VM[] = [];
  liste_compte_bancaire: CompteBancaire_VM[] = [];

  public filters: filterFF = new filterFF();

  sort_libelle_ff: 'NO' | 'ASC' | 'DESC' = 'NO';
  sort_date_ff: 'NO' | 'ASC' | 'DESC' = 'NO';
  sort_montant_ff: 'NO' | 'ASC' | 'DESC' = 'NO';
  sort_sens_ff: 'NO' | 'ASC' | 'DESC' = 'NO';

  action = '';
  liste_destintaire: GenericLink_VM[] = [];
  liste_lieu: GenericLink_VM[] = [];

  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef | undefined;
  showScrollToTop: boolean = false;

  vue: 'COMPTA' | 'BUDGET' | 'LISTE' = 'LISTE';

  public loading: boolean = false;
  public afficher_filtre: boolean = false;
  public selected_filter: string | null = null;

  rIE:ValidationItem = { key: true, value: '' };
  rLibelle: ValidationItem = { key: true, value: '' };
  rDate: ValidationItem = { key: true, value: '' };
  rMontant: ValidationItem = { key: true, value: '' };
  is_valid: boolean = false;

  histo: string = '';

  private scrollAttachAttempts = 0;
  private readonly maxScrollAttachAttempts = 50; // safety

  public edit_infoessentielle:boolean = false;

  constructor(
    public compta_serv: ComptabiliteService,
    public trns_serv: OperationService,
    public saison_sev: SaisonService,
    public cb_serv: CompteBancaireService,
    public ai_serv: AddInfoService,
    public router: Router,
    public route: ActivatedRoute,
    public SC: StaticClass,
    public addinfo_serv: AddInfoService,
    public stock_serv: StockService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.route.queryParams.subscribe((params) => {
        if ('vue' in params) {
          this.vue = params['vue'] as any;
        }
      });

      const errorService = ErrorService.instance;
      this.action = $localize`Charger les saisons`;

      const liste_saison = await this.saison_sev.GetAll();
      this.liste_saison = Array.isArray(liste_saison) ? liste_saison : [];
      this.active_saison = this.liste_saison.find((x) => x.active)?.id ?? this.liste_saison[0]?.id ?? 0;

      this.action = $localize`Charger les comptes`;
      try {
        const cpts = await this.cb_serv.getAll();
        this.liste_compte_bancaire = Array.isArray(cpts) ? cpts : [];
      } catch (err: any) {
        const o = errorService.CreateError(this.action, (err as HttpErrorResponse)?.message ?? String(err));
        errorService.emitChange(o);
      }

      // Charger les LV si besoin, puis VoirSituation
      const needsLV = !this.SC?.ClassComptable?.length || !this.SC?.TypeStock?.length || !this.SC?.TypeTransaction?.length || !this.SC?.CategorieStock?.length;
      if (needsLV) {
        try {
          await this.addinfo_serv.ChargerLV(true);
        } catch (err) {
          const o = ErrorService.instance.CreateError($localize`Charger les listes de valeurs`, (err as HttpErrorResponse)?.message ?? String(err));
          ErrorService.instance.emitChange(o);
        }
      }

      // Charger liste d'objets si absent
      if (!this.SC?.ListeObjet?.length) {
        try {
          const types = ['rider', 'compte', 'lieu', 'prof'];
          const liste = await this.addinfo_serv.getall_liste(types);
          this.SC.ListeObjet = Array.isArray(liste) ? liste : [];
        } catch (err) {
          const o = ErrorService.instance.CreateError($localize`Charger la liste des destinataires/lieux`, (err as HttpErrorResponse)?.message ?? String(err));
          ErrorService.instance.emitChange(o);
          this.SC.ListeObjet = [];
        }
      }

      // Dérivés
      this.liste_destintaire = (this.SC?.ListeObjet ?? []).filter(
        (x) => x.type === 'rider' || x.type === 'compte' || x.type === 'prof'
      );
      this.liste_lieu = (this.SC?.ListeObjet ?? []).filter(
        (x) => x.type === 'rider' || x.type === 'lieu' || x.type === 'autre'
      );

      await this.VoirSituation();
      this.waitForScrollableContainer();
    } catch (err) {
      const o = ErrorService.instance.CreateError(this.action || 'Init', (err as HttpErrorResponse)?.message ?? String(err));
      ErrorService.instance.emitChange(o);
    }
  }

  getActiveSaison(): string {
    const s = (this.liste_saison ?? []).find((x) => x.id === this.active_saison);
    return s?.nom ?? '';
  }

  async VoirSituation(): Promise<void> {
    const errorService = ErrorService.instance;
    try {
      this.action = $localize`Charger la situation`;
      const liste = await this.compta_serv.getAllSeason(this.active_saison);
      this.FluxFinanciers = Array.isArray(liste) ? liste : [];
    } catch (err) {
      const o = errorService.CreateError(this.action, (err as HttpErrorResponse)?.message ?? String(err));
      errorService.emitChange(o);
      this.FluxFinanciers = [];
    }
  }

  Sort_ff(sens: 'NO' | 'ASC' | 'DESC', champ: 'libelle' | 'date' | 'montant' | 'sens'): void {
    if (!this.FluxFinanciers?.length) return;

    const cmp = (a: number | string, b: number | string) => (a > b ? 1 : a < b ? -1 : 0);

    switch (champ) {
      case 'libelle': {
        this.sort_libelle_ff = sens;
        this.sort_date_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          const comparaison = cmp((a.libelle || '').toUpperCase(), (b.libelle || '').toUpperCase());
          return sens === 'ASC' ? comparaison : -comparaison;
        });
        break;
      }
      case 'date': {
        this.sort_date_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          const comparaison = cmp(da, db);
          return sens === 'ASC' ? comparaison : -comparaison;
        });
        break;
      }
      case 'montant': {
        this.sort_montant_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_date_ff = 'NO';
        this.sort_sens_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          const ma = Number(a.montant) || 0;
          const mb = Number(b.montant) || 0;
          const comparaison = cmp(ma, mb);
          return sens === 'ASC' ? comparaison : -comparaison;
        });
        break;
      }
      case 'sens': {
        this.sort_sens_ff = sens;
        this.sort_libelle_ff = 'NO';
        this.sort_date_ff = 'NO';
        this.sort_montant_ff = 'NO';
        this.FluxFinanciers.sort((a, b) => {
          const sa = !!a.recette;
          const sb = !!b.recette;
          const comparaison = cmp(Number(sa), Number(sb));
          return sens === 'ASC' ? comparaison : -comparaison;
        });
        break;
      }
    }
  }

  Payer_ff(t: FluxFinancier_VM): void {
    if (!t) return;
    t.statut = 1;
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour un flux`;
    this.compta_serv.update(t).then((ok) => {
      if (ok) {
        errorService.emitChange(errorService.OKMessage(this.action));
        (t.liste_operation ?? []).forEach((ope) => {
          this.action = $localize`Mettre à jour une opération`;
          ope.paiement_execute = true;
          this.trns_serv
            .update(ope)
            .then((ret) => {
              if (!ret) {
                errorService.emitChange(errorService.UnknownError(this.action));
              }
            })
            .catch((err: HttpErrorResponse) => {
              errorService.emitChange(errorService.CreateError(this.action, err.message));
            });
        });
      }
    });
  }

  autoSave(): void {
    if (this.is_valid) {
      this.Save_ff();
    }
  }

  Save_ff(): void {
    if (!this.editFluxFlinancier) return;
    const errorService = ErrorService.instance;
    this.action = $localize`Mettre à jour un flux`;

    // snapshot pour détection de modifications
    const h = JSON.stringify(this.histo);

    const ensureArrays = () => {
      this.editFluxFlinancier!.liste_operation = Array.isArray(this.editFluxFlinancier!.liste_operation)
        ? this.editFluxFlinancier!.liste_operation
        : [];
      this.editFluxFlinancier!.liste_stock = Array.isArray(this.editFluxFlinancier!.liste_stock)
        ? this.editFluxFlinancier!.liste_stock
        : [];
    };
    ensureArrays();

    if ((this.editFluxFlinancier.id ?? 0) === -1) {
      // CREATE
      this.compta_serv
        .add(this.editFluxFlinancier)
        .then((ffx) => {
          this.editFluxFlinancier!.id = ffx.id;
          // opérations
          (this.editFluxFlinancier!.liste_operation ?? []).forEach((ope) => {
            ope.flux_financier_id = ffx.id;
            this.action = $localize`Ajouter une opération`;
            this.trns_serv
              .add(ope)
              .then((op) => (ope.id = op.id))
              .catch((err: HttpErrorResponse) => {
                errorService.emitChange(errorService.CreateError(this.action, err.message));
              });
          });
          // stocks
          (this.editFluxFlinancier!.liste_stock ?? []).forEach((stk) => {
            stk.flux_financier_id = ffx.id;
            this.action = $localize`Ajouter un stock`;
            this.stock_serv
              .add(stk)
              .then((idop) => (stk.id = idop))
              .catch((err: HttpErrorResponse) => {
                errorService.emitChange(errorService.CreateError(this.action, err.message));
              });
          });
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(this.action, err.message));
        });
    } else {
      // UPDATE
      this.compta_serv
        .update(this.editFluxFlinancier)
        .then((ok) => {
          if (ok) {
            errorService.emitChange(errorService.OKMessage(this.action));
            // opérations
            (this.editFluxFlinancier!.liste_operation ?? []).forEach((ope) => {
              if (!ope.id || ope.id === 0) {
                ope.flux_financier_id = this.editFluxFlinancier!.id;
                this.action = $localize`Ajouter une opération`;
                this.trns_serv
                  .add(ope)
                  .then((operation_vm) => (ope.id = operation_vm.id))
                  .catch((err: HttpErrorResponse) => {
                    errorService.emitChange(errorService.CreateError(this.action, err.message));
                  });
              } else {
                this.action = $localize`Mettre à jour une opération`;
                this.trns_serv
                  .update(ope)
                  .then((ret) => {
                    if (!ret) {
                      errorService.emitChange(errorService.UnknownError(this.action));
                    }
                  })
                  .catch((err: HttpErrorResponse) => {
                    errorService.emitChange(errorService.CreateError(this.action, err.message));
                  });
              }
            });
            // stocks
            (this.editFluxFlinancier!.liste_stock ?? []).forEach((stk) => {
              if (!stk.id || stk.id === 0) {
                stk.flux_financier_id = this.editFluxFlinancier!.id;
                this.action = $localize`Ajouter un stock`;
                this.stock_serv
                  .add(stk)
                  .then((idop) => (stk.id = idop))
                  .catch((err: HttpErrorResponse) => {
                    errorService.emitChange(errorService.CreateError(this.action, err.message));
                  });
              } else {
                this.action = $localize`Mettre à jour un stock`;
                this.stock_serv
                  .update(stk)
                  .then((ret) => {
                    if (!ret) {
                      errorService.emitChange(errorService.UnknownError(this.action));
                    }
                  })
                  .catch((err: HttpErrorResponse) => {
                    errorService.emitChange(errorService.CreateError(this.action, err.message));
                  });
              }
            });
          } else {
            errorService.emitChange(errorService.UnknownError(this.action));
          }
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(this.action, err.message));
        });
    }

    // Met à jour l'historique si nécessaire
    this.histo = JSON.stringify(this.editFluxFlinancier ?? '');
  }

  isOKCreate(): boolean {
    const f = this.editFluxFlinancier;
    if (!f) return true; // bloque le bouton si pas d'objet
    if (!f.libelle || f.libelle.length === 0) return true;
    if (f.classe_comptable === undefined || f.classe_comptable === null) return true;
    if (!f.montant || Number(f.montant) === 0) return true;
    if (!f.date) return true;
    if (!f.destinataire) return true;
    const nb = Number(f.nb_paiement ?? 0);
    if (nb < 1 || nb > 36) return true;
    return false;
  }

  isValid(): boolean {
    if (this.isOKCreate()) return true;
    const f = this.editFluxFlinancier!;
    let solde = 0;
    let invalid = false;
    (f.liste_operation ?? []).forEach((ope) => {
      solde = Number(solde) + Number(ope.solde ?? 0);
      if (!ope.destinataire) invalid = true;
      if (!ope.date_operation) invalid = true;
      if (!ope.mode) invalid = true;
    });
    if (solde !== Number(f.montant) && solde !== -Number(f.montant)) invalid = true;
    return invalid;
  }

  FFByClass(ff: number): FluxFinancier_VM[] {
    return (this.FluxFinanciers ?? []).filter((x) => x.classe_comptable === ff);
  }

  VoirClasse(cl: number): void {
    this.vue = 'COMPTA';
    this.FluxFinanciers = this.FFByClass(cl);
    this.editFluxFlinancier = null;
  }

  trouverclasse(cl: number): string {
    const cc = (this.SC?.ClassComptable ?? []).find((x: any) => Number(x.numero) === Number(cl));
    return cc?.libelle ?? '';
  }

  trouverDestinataire(cl: string): string {
    if (!cl) return '';
    const d = (this.liste_destintaire ?? []).find((x) => (x.value ?? '').toLowerCase().includes(cl.toLowerCase()));
    return d?.value ?? '';
  }

  SaveIE(){

  }

  AnnulerIE(){
    
  }

  Retour_menu(): void {
    const current = JSON.stringify(this.editFluxFlinancier ?? '');
    if (current !== this.histo) {
      const c = window.confirm($localize`Des modifications ont été détectées. En revenant en arrière, vous perdez les modifications non sauvegardées. Continuer ?`);
      if (c) this.editFluxFlinancier = null;
    } else {
      this.editFluxFlinancier = null;
    }
  }

  Edit_ff(id: number): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger un flux`;
    this.compta_serv
      .get(id)
      .then((FF) => {
        this.editFluxFlinancier = FF ?? null;
        this.histo = JSON.stringify(this.editFluxFlinancier ?? '');
      })
      .catch((err: HttpErrorResponse) => {
        errorService.emitChange(errorService.CreateError(this.action, err.message));
      });
  }

  Delete_ff(_id: number): void {
    // TODO: impl si nécessaire, sinon laisser vide pour éviter erreurs
  }

  onInputChange(displayText: GenericLink_VM): void {
    const selectedOption = (this.liste_destintaire ?? []).find((option) => option === displayText);
    if (!this.editFluxFlinancier) return;
    if (selectedOption) {
      this.editFluxFlinancier.destinataire = displayText;
    } else {
      this.editFluxFlinancier.destinataire = { id: 0, type: '', value: displayText?.value ?? '' };
    }
  }

  onInputChangeList(displayText: GenericLink_VM, cpt: Operation_VM): void {
    const selectedOption = (this.liste_destintaire ?? []).find((option) => option === displayText);
    if (selectedOption) {
      cpt.destinataire = displayText;
    } else {
      cpt.destinataire = { id: 0, type: '', value: displayText?.value ?? '' };
    }
  }

  onInputChangeListStock(displayText: GenericLink_VM, cpt: Stock_VM): void {
    const selectedOption = (this.liste_destintaire ?? []).find((option) => option === displayText);
    if (selectedOption) {
      cpt.lieu_stockage = displayText;
    } else {
      cpt.lieu_stockage = { id: 0, type: '', value: displayText?.value ?? '' };
    }
  }

  Delete_stock(t: Stock_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un stock`;
    if (!t) return;

    if ((t.id ?? 0) > 0) {
      this.stock_serv
        .delete(t.id as number)
        .then((ret) => {
          if (ret) {
            errorService.emitChange(errorService.OKMessage(this.action));
            this.editFluxFlinancier!.liste_stock = (this.editFluxFlinancier!.liste_stock ?? []).filter((x) => x.id !== t.id);
          } else {
            errorService.emitChange(errorService.UnknownError(this.action));
          }
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(this.action, err.message));
        });
    } else {
      this.editFluxFlinancier!.liste_stock = (this.editFluxFlinancier!.liste_stock ?? []).filter((x) => x.temp_id !== t.temp_id);
      errorService.emitChange(errorService.OKMessage(this.action));
    }
  }

  Reinit_Filter(): void {
    this.filters = new filterFF();
  }

  Ajouter(numero: number | null = null): void {
    const ff = new FluxFinancier_VM();
    // valeurs par défaut robustes
    ff.id = -1;
    ff.libelle = ff.libelle ?? '';
    ff.montant = Number(ff.montant ?? 0);
    ff.date = new Date();
    ff.nb_paiement = Number(ff.nb_paiement ?? 1);
    ff.statut = Number(ff.statut ?? 0);
    ff.recette = Boolean(ff.recette ?? false);
    ff.classe_comptable = numero ?? ff.classe_comptable ?? (this.SC?.ClassComptable?.[0]?.numero ?? null);
    ff.destinataire = ff.destinataire ?? { id: 0, type: '', value: '' } as GenericLink_VM;
    ff.liste_operation = Array.isArray(ff.liste_operation) ? ff.liste_operation : [];
    ff.liste_stock = Array.isArray(ff.liste_stock) ? ff.liste_stock : [];

    this.editFluxFlinancier = ff;
  }

  getCompte(id: number): CompteBancaire_VM | undefined {
    return (this.liste_compte_bancaire ?? []).find((x) => x.id === id);
  }

  GoToType(type_: string, id: number): void {
    switch (type_) {
      case 'rider':
        this.router.navigate(['/adherent'], { queryParams: { id } });
        break;
      default:
        break;
    }
  }

  ExportExcel(): void {
    // impl éventuelle; laisser vide sans effet si non utilisée
  }

  AppliquerPaiement(): void {
    if (!this.editFluxFlinancier) return;
    const f = this.editFluxFlinancier;
    const nb = Math.max(1, Number(f.nb_paiement ?? 1));

    f.liste_operation = [];
    f.id = -1; // marquer comme nouveau s'il n'est pas encore créé

    const montant = Number(f.montant ?? 0);
    const parPaiement = nb > 0 ? montant / nb : 0;

    for (let index = 1; index <= nb; index++) {
      const ts = new Operation_VM();
      ts.date_operation = f.date ? new Date(f.date) : new Date();
      ts.flux_financier_id = f.id;
      ts.paiement_execute = f.statut === 1 ? true : false;
      ts.destinataire = f.destinataire;
      ts.info = f.libelle ?? '';
      ts.solde = parPaiement;
      f.liste_operation.push(ts);
    }
  }

  formatDestinataire(destinataire: GenericLink_VM | undefined): string {
    if (!destinataire) return '';
    const v = destinataire.value ?? '';
    const t = destinataire.type ?? '';
    return t ? `${v} (${t})` : v;
  }

  Delete(t: Operation_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Supprimer un paiement`;
    if (!this.editFluxFlinancier) return;
    const ops = this.editFluxFlinancier.liste_operation ?? [];
    if (ops.length <= 1) {
      errorService.emitChange(errorService.Warning(this.action + ' : ' + $localize`Il doit y avoir au moins 1 paiement`));
    } else {
      this.editFluxFlinancier.liste_operation = ops.filter((x) => x !== t);
    }
  }

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent?.nativeElement) {
        this.scrollableContent.nativeElement.addEventListener('scroll', this.onContentScroll.bind(this));
      } else if (this.scrollAttachAttempts++ < this.maxScrollAttachAttempts) {
        this.waitForScrollableContainer(); // Re-tente
      }
    }, 100);
  }

  onContentScroll(): void {
    const el = this.scrollableContent?.nativeElement;
    const scrollTop = el ? el.scrollTop || 0 : 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    const el = this.scrollableContent?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export class filterFF {
  filter_date_debut_ff: Date | null = null;
  filter_date_fin_ff: Date | null = null;
  filter_libelle_ff: string | null = null;
  filter_classe_ff: number | null = null;
  filter_type_achat_ff: number | null = null;
  filter_montant_min_ff: number | null = null;
  filter_montant_max_ff: number | null = null;
  filter_sens_operation_ff: boolean | null = null;
  filter_destinataire_ff: string | null = null;
}
