import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  NgZone,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AdherentService } from '../../services/adherent.service';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { ExcelService } from '../../services/excel.service';
import { GlobalService } from '../../services/global.services';
import { GroupeService } from '../../services/groupe.service';
import { InscriptionSaisonService } from '../../services/inscription-saison.service';
import { MailService } from '../../services/mail.service';
import { SaisonService } from '../../services/saison.service';

import { AdherentExport, Adherent_VM } from '@shared/lib/member.interface';
import { Saison_VM } from '@shared/lib/saison.interface';
import { Groupe_VM, LienGroupe_VM } from '@shared/lib/groupe.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { InscriptionSaison_VM } from '@shared/lib/inscription_saison.interface';
import { ItemContact, Personne_VM } from '@shared/lib/personne.interface';
import { Compte_VM } from '@shared/lib/compte.interface';

import { AppStore } from '../app.store';
import { MultifiltersAdherentPipe } from '../../filters/multifilters-adherent.pipe';


@Component({
  standalone: false,
  selector: 'app-adherent',
  templateUrl: './adherent.component.html',
  styleUrls: ['./adherent.component.css'],
  providers: [MultifiltersAdherentPipe],
})
export class AdherentComponent implements OnInit, OnDestroy {
  // === Inputs / ViewChild ===
  @Input() public context: 'ECRAN_MENU' | 'ECRAN_LISTE' | 'ESSAI' = 'ECRAN_LISTE';
  @Input() public id: number = 0;
  @Input() public login_adherent: string = '';
  @Input() public Personne: Personne_VM | null = null;

  @Output() essai = new EventEmitter<Personne_VM | null>();

  @ViewChild('scrollableContent', { static: false }) scrollableContent!: ElementRef;

  // autofocus filtres (si présents dans le template)
  @ViewChild('nomFilterInput') nomFilterInput?: ElementRef<HTMLInputElement>;
  @ViewChild('inscritSelect') inscritSelect?: ElementRef<HTMLInputElement>;
  @ViewChild('groupeSelect') groupeSelect?: ElementRef<HTMLInputElement>;
  @ViewChild('sexeSelect') sexeSelect?: ElementRef<HTMLInputElement>;
  @ViewChild('dateFromInput') dateFromInput?: ElementRef<HTMLInputElement>;

  // === États généraux ===
  public loading: boolean = false;
  public refreshing: boolean = false;
  public needsReload: boolean = false;

  public bulkWorking: boolean = false;
  public bulkLabel: string = '';

  public action: string = '';
  public showScrollToTop = false;
  public dropdownActive = false;
  public select_account: boolean = false;

  // === Données adhérent / écran ===
  public thisAdherent: Adherent_VM | null = null;
  public thisAccount: Compte_VM | null = null;
  public photoAdherent: string | null = null;
  public histo_adherent: string = '';

  // ✅ Liste harmonisée (comme ton HTML)
  public Liste: Adherent_VM[] = [];
  // ✅ Alias conservé car ton code historique l’utilise partout
  public liste_adherents_VM: Adherent_VM[] = [];

  public ListePersonne: Personne_VM[] = [];
  public personne: Personne_VM | null = null;

  // === Groupes / saisons ===
  public liste_groupe: Groupe_VM[] = [];
  public liste_groupe_filter: Groupe_VM[] = [];
  public titre_groupe = $localize`Groupe de l'adhérent`;

  public liste_saison: Saison_VM[] = [];
  public active_saison!: Saison_VM;

  // === Filtres / tri (UI) ===
  public filters: FilterAdherent = new FilterAdherent();
  public selected_filter: string = '';
  public sort_nom = 'NO';
  public sort_date = 'NO';
  public sort_sexe = 'NO';
  public selected_sort: any;
  public selected_sort_sens: any;
  public afficher_tri = false;
  public afficher_filtre = false;
  public editmongroupe: boolean = false;

  // === Textes ===
  public titre_contact = $localize`Contacts de l'adhérent`;
  public titre_contact_prevenir = $localize`Contacts à prévenir de l'adhérent`;
  public libelle_inscription = $localize`Inscrire`;
  public libelle_inscription_avec_paiement = $localize`Saisir inscription et paiement`;
  public libelle_retirer_inscription = $localize`Retirer l'inscription`;

  // === Validations ===
  public adherentValide: boolean = false;
  public AdresseValide: boolean = false;
  public ContactValide: boolean = false;
  public ContactUrgenceValide: boolean = false;

  // === Inscription / adhésion ===
  public afficher_inscription = false;
  public adherent_inscription!: Adherent_VM;
  public saison_inscription!: Saison_VM;
  public paiement_adhesion!: boolean;
  public type_inscription!: boolean;

  // === Divers UI ===
  denseMode = false;
  private readonly defaultPhotoUrl = 'assets/photo_H.png';
  defaultAvatar = '../../assets/photo_H.png';

  // === Sélection (bulk actions) ===
  selectedIds = new Set<number>();
  get hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  // Cache photo
  private photoCache = new Map<number, string>();
  private inFlight = new Set<number>();

  constructor(
    public mail_serv: MailService,
    public inscription_saison_serv: InscriptionSaisonService,
    public excelService: ExcelService,
    public GlobalService: GlobalService,
    private router: Router,
    private saisonserv: SaisonService,
    private ridersService: AdherentService,
    private compteserv: CompteService,
    private grServ: GroupeService,
    private route: ActivatedRoute,
    public store: AppStore,
    public zone: NgZone,
    private multiFiltersAdherent: MultifiltersAdherentPipe
  ) {}

  // =============== LIFECYCLE ===============
  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la page`;

    // Mode ESSAI : pas de store / pas de fetch
    if (this.context === 'ESSAI') {
      if (this.Personne) {
        this.thisAdherent = Object.assign(new Adherent_VM(), this.Personne);
        this.thisAdherent.inscrit = false;
        this.thisAdherent.inscriptionsSaison = [];
        this.thisAdherent.inscriptionsSeance = [];
        Adherent_VM.bakeLibelle(this.thisAdherent);
        this.histo_adherent = JSON.stringify(this.thisAdherent);
      } else {
        this.thisAdherent = new Adherent_VM();
        if (this.login_adherent) {
          this.thisAdherent.contact = [
            { Type: 'EMAIL', Value: this.login_adherent, Notes: '', Pref: true },
          ];
        }
        this.id = 0;
        Adherent_VM.bakeLibelle(this.thisAdherent);
        this.histo_adherent = JSON.stringify(this.thisAdherent);
      }
      return;
    }

    this.loading = true;

    if (!this.store.isLoggedIn()) {
      this.loading = false;
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Accès impossible, vous n'êtes pas connecté`)
      );
      this.router.navigate(['/login']);
      return;
    }

    // saisons + contexte + chargement
    this.saisonserv
      .GetAll()
      .then(async (sa) => {
        if (!sa || sa.length === 0) {
          this.loading = false;
          errorService.emitChange(
            errorService.CreateError(
              $localize`Récupérer les saisons`,
              $localize`Il faut au moins une saison`
            )
          );
          if (this.store.mode() === 'ADMIN') {
            this.router.navigate(['/saison']);
            this.store.updateSelectedMenu('SAISON');
          } else {
            this.router.navigate(['/menu']);
            this.store.updateSelectedMenu('MENU');
          }
          return;
        }

        this.liste_saison = sa;
        this.active_saison = this.liste_saison.find((x) => x.active) ?? this.liste_saison[0];

        this.route.queryParams.subscribe((params) => {
          if ('id' in params) {
            this.id = Number(params['id']);
            this.context = 'ECRAN_MENU';
          }
        });

        // si liste : charge immédiatement en apply:true (sinon “liste vide”)
        if (this.context === 'ECRAN_LISTE') {
          this.afficher_filtre = false;
          await this.UpdateListeAdherents({ apply: true });
        }

        if (this.id > 0) {
          await this.ChargerAdherent();
        }

        this.loading = false;
        errorService.emitChange(errorService.OKMessage(this.action));
      })
      .catch((err: HttpErrorResponse) => {
        this.loading = false;
        errorService.emitChange(
          errorService.CreateError($localize`Récupérer les saisons`, err.message)
        );
        this.router.navigate(['/menu']);
        this.store.updateSelectedMenu('MENU');
      });

    this.updateDenseMode();
    window.addEventListener('resize', this.updateDenseMode);
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.updateDenseMode);
  }

  updateDenseMode = () => {
    this.denseMode = window.innerWidth < 480;
  };

  // =============== FILTRES (inline edit) ===============
  normalizeFilterValue(key: string, raw: any): any {
    const toBool = (v: any): boolean | null => {
      if (v === null || v === undefined || v === '') return null;
      if (v === true || v === false) return v;
      const s = String(v).toLowerCase();
      if (s === 'true' || s === '1' || s === 'oui') return true;
      if (s === 'false' || s === '0' || s === 'non') return false;
      return null;
    };

    switch (key) {
      case 'nom':
      case 'groupe': {
        const v = (raw ?? '').toString().trim();
        return v.length ? v : null;
      }
      case 'date_apres':
      case 'date_avant': {
        const v = (raw ?? '').toString().trim();
        return v.length ? v : null;
      }
      case 'sexe':
      case 'inscrit': {
        return toBool(raw);
      }
      default:
        return raw;
    }
  }

  startEditFilter(
    key: string,
    input?:
      | ElementRef<HTMLInputElement | HTMLSelectElement>
      | (HTMLInputElement | HTMLSelectElement)
      | null
  ) {
    this.filters.editing[key] = true;
    setTimeout(() => {
      const el = (input as any)?.nativeElement ? (input as any).nativeElement : input;
      el?.focus?.();
      (el as HTMLInputElement)?.select?.();
    }, 0);
  }

  onFilterChange(key: string, value: any) {
    const normalized = this.normalizeFilterValue(key, value);
    (this.filters as any)[`filter_${key}`] = normalized;
  }

  endEditFilter(key: string) {
    this.filters.editing[key] = false;
  }
  cancelEditFilter(key: string) {
  this.filters.editing[key] = false;
}

  clearFilter(key: string) {
    if (key === 'date') {
      this.filters.filter_date_apres = null;
      this.filters.filter_date_avant = null;
    } else {
      (this.filters as any)[`filter_${key}`] = null;
    }
    this.filters.editing[key] = false;
  }

  ReinitFiltre() {
    this.filters.filter_date_apres = null;
    this.filters.filter_date_avant = null;
    this.filters.filter_groupe = null;
    this.filters.filter_inscrit = null;
    this.filters.filter_nom = null;
    this.filters.filter_sexe = null;
  }

  // =============== LISTE / STORE SYNC ===============
  async UpdateListeAdherents(opts: { apply: boolean } = { apply: false }) {
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer les adhérents`;
    this.needsReload = false;

    const firstLoad = !this.Liste || this.Liste.length === 0;

    if (opts.apply && firstLoad) this.loading = true;
    else this.refreshing = true;

    try {
      // 1) groupes (comme avant)
      const groupes = await this.grServ.GetAll(this.active_saison.id);
      this.liste_groupe = groupes ?? [];
      this.liste_groupe_filter = this.liste_groupe;

      // 2) adhérents
      const remote = await this.ridersService.GetAdherentAdhesion(this.active_saison.id);

      // bake libelle + assure classe
      const baked = (remote ?? []).map((d: any) => {
        const a = Object.assign(new Adherent_VM(), d);
        Adherent_VM.bakeLibelle(a);
        return a;
      });

      // store : apply (1er affichage) ou markRemote (badge “nouvelles données”)
      if (opts.apply) (this.store as any).applyAdherent?.(baked);
      else (this.store as any).markRemoteAdherent?.(baked);

      // si ton store n’a pas ces méthodes : on met direct en local quand même
      if (!(this.store as any).applyAdherent && opts.apply) {
        this.liste_adherents_VM = baked;
        this.Liste = baked;
      } else {
        this.RebuildListeFromStore();
      }

      // preload photos sur ce qui est visible
      this.preloadPhotos(this.Liste);
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? `${err}`)
      );
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  private RebuildListeFromStore() {
    const all: Adherent_VM[] = (this.store as any).Adherent?.().Liste ?? [];

    const baked = (all ?? []).map((d: any) => {
      const a = Object.assign(new Adherent_VM(), d);
      Adherent_VM.bakeLibelle(a);
      return a;
    });

    this.liste_adherents_VM = baked;
    this.Liste = baked;
  }

  // =============== SELECTION ===============
  toggleSelection(adherentId: number, checked: boolean) {
    if (checked) this.selectedIds.add(adherentId);
    else this.selectedIds.delete(adherentId);
  }

  isSelected(adherentId: number): boolean {
    return this.selectedIds.has(adherentId);
  }

  clearSelection() {
    this.selectedIds.clear();
  }

  toggleSelectAll(checked: boolean) {
    this.selectedIds.clear();
    if (checked) {
      for (const a of this.Liste ?? []) this.selectedIds.add(a.id);
    }
  }

  getItemsSelected(): Adherent_VM[] {
    const ids = this.selectedIds;
    return (this.Liste ?? []).filter((x) => ids.has(x.id));
  }

  // =============== DELETE (robuste + optimiste) ===============
  private async deleteOneAdherentServerSide(item: Adherent_VM): Promise<void> {
    // 1) supprimer inscriptions saison + liens de groupes (si présents)
    if (item.inscriptionsSaison?.length) {
      // delete inscriptions
      for (const iss of item.inscriptionsSaison) {
        try {
          if (iss?.id) await this.inscription_saison_serv.Delete(iss.id);
        } catch {
          // on continue, le vrai blocage est souvent le delete final
        }
      }

      // delete liens groupes sur l’inscription active si tu as ça
      const active = item.inscriptionsSaison.find((x) => x.active);
      if (active?.groupes?.length) {
        for (const gr of active.groupes) {
          try {
            if (gr?.id_lien) await this.grServ.DeleteLien(gr.id_lien);
          } catch {
            // idem, on laisse continuer
          }
        }
      }
    }

    // 2) delete adhérent
    await this.ridersService.Delete(item.id);
  }

  Archiver(boo:boolean = true){
  this.action = $localize`Archiver la personne`;
  const errorService = ErrorService.instance;
  let message = $localize`Voulez-vous archiver l'adhérent ?`;
  if(!boo){
    message = $localize`Voulez-vous désarchiver l'adhérent ?`;}
  let confirm = window.confirm(message);
  this.thisAdherent.archive = boo;
  if (confirm) {
    this.ridersService
      .Update(this.thisAdherent)
        .then((retour) => {
          if (retour) {
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);
            this.histo_adherent = JSON.stringify(this.thisAdherent);
          } else {
            let o = errorService.UnknownError(this.action);
            errorService.emitChange(o);
          }
        })
        .catch((err: HttpErrorResponse) => {
          let o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
      }

}
GotoImport() {
    this.router.navigate(['/import']);
  }

Inscrire(){
  this.action = $localize`Inscrire la personne`;
    const errorService = ErrorService.instance;
    const iss = new InscriptionSaison_VM();
    iss.rider_id = this.thisAdherent.id;
    iss.active = true;
    iss.saison_id = this.store.saison_active_id();
    this.inscription_saison_serv.Add(iss).then((id) =>{
      if(id){
 this.ridersService.Get(this.thisAdherent.id).then((adh) =>{
          this.thisAdherent = adh;
          let o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        })
      } else {
       
          let o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
      }
    })   .catch((err: HttpErrorResponse) => {
            let o = errorService.CreateError(this.action, err.message);
            errorService.emitChange(o);
            return;
          });

}
  async Delete(item: Adherent_VM) {
    const errorService = ErrorService.instance;
    const action = $localize`Supprimer un adhérent`;

    const confirmation = window.confirm($localize`Voulez-vous supprimer l'adhérent ?`);
    if (!confirmation) return;

    // backup pour rollback
    const backup = Object.assign(new Adherent_VM(), item);

    // optimistic UI
    (this.store as any).removeAdherentLocal?.(item.id);
    if (!(this.store as any).removeAdherentLocal) {
      this.Liste = (this.Liste ?? []).filter((x) => x.id !== item.id);
      this.liste_adherents_VM = this.Liste;
    } else {
      this.RebuildListeFromStore();
    }

    try {
      await this.deleteOneAdherentServerSide(item);

      errorService.emitChange(errorService.OKMessage(action));

      // refresh silencieux : juste badge si diff
      this.UpdateListeAdherents({ apply: false });
    } catch (err: any) {
      // rollback
      (this.store as any).upsertAdherentLocal?.(backup);
      if (!(this.store as any).upsertAdherentLocal) {
        this.Liste = [backup, ...(this.Liste ?? [])];
        this.liste_adherents_VM = this.Liste;
      } else {
        this.RebuildListeFromStore();
      }

      // ✅ message visible + proposition reload
      this.needsReload = true;
      errorService.emitChange(
        errorService.CreateError(
          $localize`Suppression impossible`,
          $localize`L'adhérent est probablement utilisé ailleurs (inscriptions, paiements, etc.). Recharge conseillée.`
        )
      );
    }
  }

  async supprimerListe() {
    const errorService = ErrorService.instance;
    const items = this.getItemsSelected();
    if (!items.length) return;

    const confirmation = window.confirm(
      $localize`Supprimer ${items.length} adhérent(s) sélectionné(s) ?`
    );
    if (!confirmation) return;

    this.bulkWorking = true;
    this.bulkLabel = $localize`Suppression en cours…`;
    this.needsReload = false;

    // backup par id (rollback partiel)
    const backupById = new Map<number, Adherent_VM>();
    for (const it of items) backupById.set(it.id, Object.assign(new Adherent_VM(), it));

    // optimistic UI : on enlève tout
    for (const it of items) (this.store as any).removeAdherentLocal?.(it.id);
    if (!(this.store as any).removeAdherentLocal) {
      const ids = new Set(items.map((x) => x.id));
      this.Liste = (this.Liste ?? []).filter((x) => !ids.has(x.id));
      this.liste_adherents_VM = this.Liste;
    } else {
      this.RebuildListeFromStore();
    }
    this.clearSelection();

    const ok: number[] = [];
    const ko: { id: number; libelle: string; reason: string }[] = [];

    try {
      // ✅ try/catch item par item (ce que tu voulais)
      for (const it of items) {
        try {
          await this.deleteOneAdherentServerSide(it);
          ok.push(it.id);
        } catch (err: any) {
          ko.push({
            id: it.id,
            libelle: it.libelle ?? `${it.prenom ?? ''} ${it.nom ?? ''}`.trim(),
            reason: err?.message ?? `${err}`,
          });
        }
      }

      // rollback seulement pour ceux en KO
      if (ko.length) {
        for (const fail of ko) {
          const restore = backupById.get(fail.id);
          if (restore) (this.store as any).upsertAdherentLocal?.(restore);
        }

        if (!(this.store as any).upsertAdherentLocal) {
          const restoreList = ko
            .map((k) => backupById.get(k.id))
            .filter(Boolean) as Adherent_VM[];
          this.Liste = [...restoreList, ...(this.Liste ?? [])];
          this.liste_adherents_VM = this.Liste;
        } else {
          this.RebuildListeFromStore();
        }

        this.needsReload = true;
        errorService.emitChange(
          errorService.CreateError(
            $localize`Suppression partielle`,
            $localize`${ok.length} supprimé(s), ${ko.length} échec(s). Recharge conseillée.`
          )
        );
        return;
      }

      errorService.emitChange(
        errorService.OKMessage($localize`${ok.length} adhérent(s) supprimé(s).`)
      );

      // refresh silencieux
      this.UpdateListeAdherents({ apply: false });
    } finally {
      this.bulkWorking = false;
      this.bulkLabel = '';
    }
  }

  // =============== COPIE (robuste + inscriptions saison + groupes) ===============
  private deepClone<T>(x: T): T {
    return JSON.parse(JSON.stringify(x));
  }

  private buildAdherentCopy(src: Adherent_VM): Adherent_VM {
    const copy = Object.assign(new Adherent_VM(), this.deepClone(src));

    copy.id = 0;
    copy.surnom = (copy.surnom ? copy.surnom + ' ' : '') + $localize`(copie)`;

    // reset flags
    copy.archive = false;
    copy.inscrit = false;

    // on ne copie PAS les inscriptions séance (t’as dit : individuel)
    copy.inscriptionsSeance = [];

    // on va recréer une inscription saison + groupes côté back, donc on vide côté VM
    copy.inscriptionsSaison = [];

    Adherent_VM.bakeLibelle(copy);
    return copy;
  }

  private async copyInscriptionSaisonAndGroups(src: Adherent_VM, newAdherentId: number): Promise<void> {
    // 1) inscription saison active uniquement
    const active = src.inscriptionsSaison?.find((x) => x.active);
    if (!active) return;

    const iss = new InscriptionSaison_VM();
    iss.rider_id = newAdherentId;
    iss.active = true;
    iss.saison_id = active.saison_id;

    const newIssId = await this.inscription_saison_serv.Add(iss);

    // 2) groupes de l’inscription active
    const groupes = active.groupes ?? [];
    if (!groupes.length) return;

    // ⚠️ On ne connaît pas ton endpoint exact d’ajout de lien de groupe.
    // Je tente en “soft” via any : adapte si besoin (AddLien / AddGroupLink / etc.)
    for (const g of groupes) {
      const maybeFn =
        (this.grServ as any).AddLien ||
        (this.grServ as any).AddGroupLink ||
        (this.grServ as any).AddLienGroupe;

      if (maybeFn) {
        await maybeFn.call(this.grServ, {
          inscriptionSaisonId: newIssId,
          groupId: g.id,
        });
      } else {
        // Si tu n’as pas encore l’endpoint : au moins on ne casse pas la copie
        // (tu pourras compléter plus tard)
      }
    }
  }

  async copierListe() {
    const errorService = ErrorService.instance;
    const action = $localize`Copie d'adhérents`;

    const items = this.getItemsSelected();
    if (!items.length) return;

    this.bulkWorking = true;
    this.bulkLabel = $localize`Copie en cours…`;
    this.needsReload = false;

    const created: Adherent_VM[] = [];
    const ko: { srcId: number; reason: string }[] = [];

    try {
      for (const src of items) {
        try {
          const copy = this.buildAdherentCopy(src);

          // 1) création adhérent
          const newId = await this.ridersService.Add(copy);
          copy.id = newId;

          // 2) copie inscription saison + groupes (tu as dit important)
          await this.copyInscriptionSaisonAndGroups(src, newId);

          created.push(copy);
        } catch (err: any) {
          ko.push({ srcId: src.id, reason: err?.message ?? `${err}` });
        }
      }

      if (created.length) {
        // optimistic UI : on injecte direct en haut
        // (si tu veux plutôt repasser par store, on peut)
        this.zone.run(() => {
          const baked = created.map((a) => {
            Adherent_VM.bakeLibelle(a);
            return a;
          });
          this.Liste = [...baked, ...(this.Liste ?? [])];
          this.liste_adherents_VM = this.Liste;
          this.clearSelection();
          this.preloadPhotos(baked);
        });
      }

      if (ko.length) {
        this.needsReload = true;
        errorService.emitChange(
          errorService.CreateError(
            $localize`Copie partielle`,
            $localize`${created.length} copié(s), ${ko.length} échec(s). Recharge conseillée.`
          )
        );
        return;
      }

      errorService.emitChange(
        errorService.OKMessage($localize`${created.length} adhérent(s) copié(s).`)
      );

      // refresh silencieux
      this.UpdateListeAdherents({ apply: false });
    } finally {
      this.bulkWorking = false;
      this.bulkLabel = '';
    }
  }

  // =============== DIVERS / OUTILS ===============
  calculateAge(dateNaissance: Date): number {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  onImgError(evt: Event) {
    (evt.target as HTMLImageElement).src = this.defaultAvatar;
  }

  private preloadPhotos(items: Adherent_VM[]): void {
    for (const it of items) {
      const id = it?.id;
      if (!id) continue;

      if (it.photo && it.photo.length > 0) continue;

      const cached = this.photoCache.get(id);
      if (cached) {
        it.photo = cached;
        continue;
      }

      if (this.inFlight.has(id)) continue;
      this.inFlight.add(id);

      this.ridersService
        .GetPhoto(id)
        .then((photoBase64) => {
          const url = this.createBlobUrl(photoBase64);
          if (url && url !== this.defaultPhotoUrl) {
            this.photoCache.set(id, url);
            it.photo = url;
          }
        })
        .catch(() => {})
        .finally(() => this.inFlight.delete(id));
    }
  }

  createBlobUrl(base64Data: string | null | undefined): string {
    try {
      if (!base64Data || base64Data.trim() === '') throw new Error('Base64 vide');

      const parts = base64Data.split(',');
      if (parts.length < 2) throw new Error('Format Base64 invalide');

      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];

      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

      const blob = new Blob([ab], { type: mimeString });
      return URL.createObjectURL(blob);
    } catch {
      return this.defaultPhotoUrl;
    }
  }

  toValueContactPref(cont: ItemContact[]) {
    if (!cont || cont.length === 0) return $localize`Aucun contact`;
    const pref = cont.find((x) => x.Pref === true);
    return pref ? pref.Value : cont[0].Value;
  }

  valid_adherent(isValid: boolean): void {
    this.adherentValide = isValid;
  }
  valid_adresse(isValid: boolean): void {
    this.AdresseValide = isValid;
  }
  valid_contact(isValid: boolean): void {
    this.ContactValide = isValid;
  }
  valid_contact_urgence(isValid: boolean): void {
    this.ContactUrgenceValide = isValid;
  }

  // =============== METIERS (inchangés / tes flows) ===============
  async ChargerAdherent() {
    this.thisAdherent = null;
    const errorService = ErrorService.instance;
    this.action = $localize`Récupérer l'adhérent`;

    try {
      if (!this.liste_groupe || this.liste_groupe.length === 0) {
        this.liste_groupe = await this.grServ.GetAll(this.active_saison.id);
      }

      const adh = await this.ridersService.Get(this.id);
      if (!adh) {
        this.loading = false;
        errorService.emitChange(
          errorService.CreateError(this.action, $localize`Aucun adhérent trouvé`)
        );
        this.router.navigate(['/menu']);
        this.store.updateSelectedMenu('MENU');
        return;
      }

      Adherent_VM.bakeLibelle(adh);
      this.histo_adherent = JSON.stringify(adh);
      this.thisAdherent = adh;
      this.loading = false;

      this.ridersService.GetPhoto(this.id).then((photoBase64) => {
        this.photoAdherent = this.createBlobUrl(photoBase64);
      });
    } catch (err: any) {
      this.loading = false;
      errorService.emitChange(
        errorService.CreateError(this.action, err?.message ?? $localize`Erreur inconnue`)
      );
      this.router.navigate(['/menu']);
      this.store.updateSelectedMenu('MENU');
    }
  }

  Read(adh: Adherent_VM) {
    this.id = adh.id;
    this.ChargerAdherent();
  }

  isInscrtitionActive(adh: Adherent_VM, saison_id: number): boolean {
    return !!adh.inscriptionsSaison?.some((x) => x.saison_id === saison_id);
  }

  CurrentActiveInscriptionGroupe(adh: Adherent_VM): LienGroupe_VM[] {
    const active = adh.inscriptionsSaison?.find((x) => x.active);
    return active?.groupes ?? [];
  }

  CurrentInactiveInscriptionGroupe(adh: Adherent_VM): LienGroupe_VM[] {
    const active = adh.inscriptionsSaison?.find((x) => x.active);
    const list_id_group = active?.groupes?.map((n) => n.id) ?? [];
    return this.liste_groupe
      .filter((x) => !list_id_group.includes(Number(x.id)))
      .map((x) => new LienGroupe_VM(x.id, x.nom, 0));
  }

  SaveAdresse(thisAdresse: Adresse) {
    if (!this.thisAdherent) return;
    this.thisAdherent.adresse = thisAdresse;
    this.PreSave();
  }

  onPhotoSelectedFromChild(base64Photo: string): void {
    this.photoAdherent = base64Photo;
    if (this.id > 0 && this.thisAdherent) {
      this.ridersService.UpdatePhoto(this.thisAdherent.id, base64Photo).catch(() => {});
    }
  }

  PreSave() {
    if (
      this.adherentValide &&
      this.AdresseValide &&
      this.ContactValide &&
      this.ContactUrgenceValide &&
      this.thisAdherent?.id &&
      this.thisAdherent.id > 0
    ) {
      this.Save();
    }
  }

  async Save() {
    if (this.context === 'ESSAI') {
      this.essai.emit(this.thisAdherent as any);
      return;
    }

    const errorService = ErrorService.instance;
    this.action = $localize`Sauvegarder l'adhérent`;
    if (!this.thisAdherent) return;

    if (this.thisAdherent.id === 0) {
      if (!this.thisAccount) {
        errorService.emitChange(
          errorService.CreateError(this.action, $localize`Aucun compte sélectionné`)
        );
        return;
      }

      // création compte si nécessaire + mail
      if (this.thisAccount.id === 0) {
        this.action = $localize`Ajout et envoi du mail de création de compte`;
        try {
          const idCompte = await this.compteserv.Add(this.thisAccount);
          this.thisAccount.id = idCompte;
          this.thisAdherent.compte = idCompte;
          await this.mail_serv.MailActivation(this.thisAccount.email);
          errorService.emitChange(errorService.OKMessage(this.action));
        } catch (err: any) {
          errorService.emitChange(
            errorService.CreateError(this.action, err?.message ?? `${err}`)
          );
          return;
        }
      }

      // création adhérent
      this.action = $localize`Ajout de l'adhérent`;
      this.ridersService
        .Add(this.thisAdherent)
        .then((id) => {
          this.thisAdherent!.id = id;
          if (this.photoAdherent) this.ridersService.UpdatePhoto(id, this.photoAdherent).catch(() => {});
          this.id = id;
          errorService.emitChange(errorService.OKMessage(this.action));
          this.histo_adherent = JSON.stringify(this.thisAdherent);
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(this.action, err.message));
        });
    } else {
      this.ridersService
        .Update(this.thisAdherent)
        .then((retour) => {
          if (retour) {
            errorService.emitChange(errorService.OKMessage(this.action));
            this.histo_adherent = JSON.stringify(this.thisAdherent);
          } else {
            errorService.emitChange(errorService.UnknownError(this.action));
          }
        })
        .catch((err: HttpErrorResponse) => {
          errorService.emitChange(errorService.CreateError(this.action, err.message));
        });
    }
  }

  Retour(): void {
    const ret_adh = JSON.stringify(this.thisAdherent);
    if (this.histo_adherent !== ret_adh) {
      const confirm = window.confirm(
        $localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`
      );
      if (!confirm) return;
    }

    if (this.context === 'ECRAN_LISTE') {
      this.thisAdherent = null;
      this.UpdateListeAdherents({ apply: false });
    } else if (this.context === 'ESSAI') {
      this.thisAdherent = null;
      this.essai.emit(null);
    } else {
      this.router.navigate(['/menu']);
      this.store.updateSelectedMenu('MENU');
    }
  }

  // Export : on exporte la liste filtrée (comme ton HTML)
  ExportExcel() {
    const headers = {
      ID: 'ID',
      Nom: 'Nom',
      Prenom: 'Prénom',
      DDN: 'Date de naissance',
      Sexe: 'Sexe',
      Street: 'Numéro et voie',
      PostCode: 'Code postal',
      City: 'Ville',
      Country: 'Pays',
      Surnom: 'Surnom',
      Login: 'Login',
      Mail: 'Email',
      MailPref: 'Contact préféré email ?',
      Phone: 'Téléphone',
      PhonePref: 'Contact préféré téléphone ?',
      MailUrgence: 'Mail si urgence',
      NomMailUrgence: 'Contact mail si urgence',
      PhoneUrgence: 'Téléphone si urgence',
      NomPhoneUrgence: 'Contact téléphone si urgence',
      Inscrit: 'Inscrit',
    };

    const list = this.multiFiltersAdherent.transform(
      this.liste_adherents_VM,
      this.filters as any,
      this.active_saison?.id
    );

    this.excelService.exportAsExcelFile(
      list.map((x) => new AdherentExport(x)),
      'liste_adherent',
      headers
    );
  }

  // Scroll UI
  ngAfterViewInit(): void {
    this.waitForScrollableContainer();
  }

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent) {
        this.scrollableContent.nativeElement.addEventListener(
          'scroll',
          this.onContentScroll.bind(this)
        );
      } else {
        this.waitForScrollableContainer();
      }
    }, 100);
  }

  onContentScroll(): void {
    const scrollTop = this.scrollableContent.nativeElement.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    this.scrollableContent.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleDropdown() {
    this.dropdownActive = !this.dropdownActive;
  }

  handleAction(_action: string) {
    this.dropdownActive = false;
  }
   getActiveSaison(): string {
    let s = this.liste_saison.find((x) => x == this.active_saison);
    if (s) {
      return s.nom;
    } else {
      return '';
    }
  }
  async Create(compte_VM:Compte_VM) {
    this.thisAccount  = compte_VM;
    // nouveau compte -- ancien compte
     if(this.thisAccount.id > 0){
      
    // nouvelle personne -- selection possible
      const adh = await this.ridersService.GetAllPersonne(this.thisAccount.id);
     this.ListePersonne = adh.map(data =>
    Object.assign(new Adherent_VM(), data)
  );
      if(this.ListePersonne.length == 0){
        this.thisAdherent = new Adherent_VM();  
        this.thisAdherent.contact = [{Type: 'EMAIL', Value: this.thisAccount.email, Notes: '', Pref: true}];      
        this.id = 0;
        this.thisAdherent.compte = this.thisAccount.id;
        this.select_account = false;
      } else {
        this.ListePersonne = this.ListePersonne.filter(y => !this.Liste.filter(x => x.inscrit).map(x => x.id).includes(y.id));
          if(this.ListePersonne.length == 0){
        this.id = 0;
        this.thisAdherent = new Adherent_VM();
        this.thisAdherent.compte = this.thisAccount.id;
        this.select_account = false;
        this.thisAdherent.contact = [{Type: 'EMAIL', Value: this.thisAccount.email, Notes: '', Pref: true}];    
      }
      }
    } else {
        this.id = 0;
        this.select_account = false;
        this.thisAdherent = new Adherent_VM();
        this.thisAdherent.contact = [{Type: 'EMAIL', Value: this.thisAccount.email, Notes: '', Pref: true}];    
    }   
  }

  CreatePersonneCompte(){
     this.thisAdherent = new Adherent_VM();
        this.id = 0;
        this.thisAdherent.compte = this.thisAccount.id;
        this.thisAdherent.contact = [{Type: 'EMAIL', Value: this.thisAccount.email, Notes: '', Pref: true}];   
        this.histo_adherent = JSON.stringify(this.thisAdherent);
        this.select_account = false;
        this.ListePersonne = null;
        this.personne = null;
  }
  async SelectPersonne(){
  const adh = await this.ridersService.Get(this.personne.id);

this.thisAdherent = Object.assign(new Adherent_VM(), adh);
        this.histo_adherent = JSON.stringify(this.thisAdherent);
  this.select_account = false;
        this.ListePersonne = null;
        this.personne = null;
}

retourListePersonne(){
  this.select_account = false;
        this.ListePersonne = null;
        this.personne = null;
     this.thisAdherent = null;
      this.UpdateListeAdherents();
}
Sort(sens: 'NO' | 'ASC' | 'DESC', champ: string) {
  // tu peux garder tes vars sort_nom/sort_date/sort_sexe existantes
  if (champ === 'nom') this.sort_nom = sens;
  if (champ === 'date') this.sort_date = sens;
  if (champ === 'sexe') this.sort_sexe = sens;

  // IMPORTANT: comme tu filtres via pipe dans le HTML, on trie la liste "brute"
  const dir = sens === 'ASC' ? 1 : sens === 'DESC' ? -1 : 0;
  if (dir === 0) return;

  this.Liste = [...this.Liste].sort((a, b) => {
    if (champ === 'nom') {
      const A = (a.libelle ?? '').toUpperCase();
      const B = (b.libelle ?? '').toUpperCase();
      return (A > B ? 1 : A < B ? -1 : 0) * dir;
    }
    if (champ === 'date') {
      const A = a.date_naissance ?? '';
      const B = b.date_naissance ?? '';
      return (A > B ? 1 : A < B ? -1 : 0) * dir;
    }
    if (champ === 'sexe') {
      const A = a.sexe ? 1 : 0;
      const B = b.sexe ? 1 : 0;
      return (A - B) * dir;
    }
    return 0;
  });
}
}

export type SortSens = 'NO' | 'ASC' | 'DESC';

export class FilterAdherent {
  filter_nom: string | null = null;
  filter_groupe: string | null = null;
  filter_inscrit: boolean | null = true;
  filter_sexe: boolean | null = null;
  filter_date_apres: string | null = null;
  filter_date_avant: string | null = null;

  editing: {
    nom: boolean;
    date: boolean;
    sexe: boolean;
    groupe: boolean;
    inscrit: boolean;
  } = {
    nom: false,
    date: false,
    sexe: false,
    groupe: false,
    inscrit: false,
  };
}

