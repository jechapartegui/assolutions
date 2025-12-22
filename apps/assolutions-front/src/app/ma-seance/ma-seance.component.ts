import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ErrorService } from '../../services/error.service';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import { SeancesService } from '../../services/seance.service';
import {
  FullInscriptionSeance_VM,
  InscriptionSeance_VM,
  InscriptionStatus_VM,
  SeanceStatus_VM,
} from '@shared/lib/inscription_seance.interface';
import { Adherent_VM } from '@shared/lib/member.interface';
import { Seance_VM, StatutSeance } from '@shared/lib/seance.interface';
import { Personne_VM } from '@shared/lib/personne.interface';
import { AppStore } from '../app.store';
import { AdherentService } from '../../services/adherent.service';
import { MailService } from '../../services/mail.service';
import { Compte_VM, KeyValuePairAny } from '@shared/index';

@Component({
  standalone: false,
  selector: 'app-ma-seance',
  templateUrl: './ma-seance.component.html',
  styleUrls: ['./ma-seance.component.css'],
})
export class MaSeanceComponent implements OnInit {
  @Input() id: number = 0;

  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef;

  showScrollToTop = false;

  display_personne = true;
  display_absent = true;
  display_present = true;
  add_adh_seance = false;
  public multi = false;

  thisSeance!: Seance_VM;
  Autres: Adherent_VM[] = [];
  All: FullInscriptionSeance_VM[] = [];
  MesAdherents: FullInscriptionSeance_VM[] = [];

  Notes = '';
  variables: Record<string, any> = {};

  adherent_to: Adherent_VM | null = null;

  action = '';
  seanceText = '';

  login: string | null = null;
  reponse: boolean | null = null;
  adherent: number | null = null;
  vue_alpha = true;
  isLien = false;
  private _loadLoginDone = false;

  // Mail / panneau latéral
  optionsOpen = false;
  toggleMobileOptions = false;
  uiMode: 'list' | 'convocation' | 'annulation' | 'ajout' | 'note' = 'list';

  selectedRecipients: FullInscriptionSeance_VM[] = [];
  mailSubject = '';
  mailBody = '';

  // Preview fiche adhérent
  previewPotentiel: FullInscriptionSeance_VM | null = null;

  // Avatar par défaut
  defaultAvatar = 'assets/photo_H.png';

  constructor(
    public store: AppStore,
    public riderservice: AdherentService,
    public cdr: ChangeDetectorRef,
    private seanceserv: SeancesService,
    private router: Router,
    private route: ActivatedRoute,
    private inscriptionserv: InscriptionSeanceService,
    private mailserv: MailService
  ) {}

  // -------------------------------------------------------------------------
  // INIT
  // -------------------------------------------------------------------------
  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;

    const params = this.route.snapshot.queryParams as {
      [k: string]: string | undefined;
    };

    // ID de séance
    if (!this.id || this.id === 0) {
      if (params['id']) {
        this.id = +params['id'];
      } else {
        this.router.navigate(['/menu']);
        this.store.updateSelectedMenu('MENU');
        return;
      }
    }

    // Contexte "lien"
     // 3) Contexte "lien"
  if (params['login']) {
    this.isLien = true;
    this.login = params['login'];
  }
  if (params['adherent']) {
    this.isLien = true;
    this.adherent = +params['adherent'];
  }
  if (params['reponse'] !== undefined) {
    this.isLien = true;
    const r = params['reponse']!;
    this.reponse = r === '0' ? false : r === '1' ? true : null;
  }

    // Charger la séance
    try {
      const ss = await this.seanceserv.Get(this.id);
      this.thisSeance = ss;
      this.generateSeanceText();
    } catch (error) {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
      return;
    }
    const compte = this.store.compte();
    this.Load();

    // Si on est dans un contexte "lien", on attend que le compte se charge
    if (this.isLien) {
        if (!this._loadLoginDone && compte && compte.email) {
          this._loadLoginDone = true;
          this.LoadLogin(compte);
        }
    }

    // Cas très spécifique "lien anonyme" (sans compte attaché)
    if (this.isLien && this.login && !this.adherent && !this._loadLoginDone) {
      this._loadLoginDone = true;
      this.inscriptionserv
        .GetAdherentCompte(this.login, this.id)
        .then((liste) => {
          (liste ?? []).forEach((obj: any) =>
            Personne_VM.bakeLibelle(obj.person)
          );
          this.MesAdherents = liste ?? [];
          this.cdr.detectChanges();
        })
        .catch((error) => {
          const n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
    }
  }

  ngAfterViewInit(): void {
    this.waitForScrollableContainer();
  }

  // -------------------------------------------------------------------------
  // SCROLL
  // -------------------------------------------------------------------------
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
    const scrollTop = this.scrollableContent?.nativeElement?.scrollTop || 0;
    this.showScrollToTop = scrollTop > 200;
  }

  scrollToTop(): void {
    if (!this.scrollableContent) {
      return;
    }
    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  // -------------------------------------------------------------------------
  // NAV
  // -------------------------------------------------------------------------
  AfficherMenu() {
    this.router.navigate(['/menu']);
    this.store.updateSelectedMenu('MENU');
  }

  RetourListe() {
    this.router.navigate(['/seance'], {
      queryParams: { id: this.thisSeance.id },
    });
  }

  // -------------------------------------------------------------------------
  // CHARGEMENT SÉANCE
  // -------------------------------------------------------------------------
Load(): void {
  const errorService = ErrorService.instance;
  this.action = $localize`Charger la séance`;

  this.inscriptionserv
    .GetAllSeanceFull(this.id)
    .then((res: FullInscriptionSeance_VM[]) => {
      // 🔹 Rétablir prototype Personne_VM + libellé
      res.forEach((p) => {
        if (p?.person) {
          Object.setPrototypeOf(p.person, Personne_VM.prototype);
          Personne_VM.bakeLibelle(p.person);
        }
      });

      // 🔹 Tri par libellé (sans accents, case-insensitive)
      const sortByLibelle = (a: FullInscriptionSeance_VM, b: FullInscriptionSeance_VM) => {
        const norm = (s: string | undefined | null) =>
          (s ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        return norm(a.person?.libelle).localeCompare(norm(b.person?.libelle));
      };

      this.All = [...res].sort(sortByLibelle);

      // 🔹 Préchargement des photos pour la liste principale
      this.preloadPhotos(this.All);

      // 🔹 Charger les autres adhérents (non inscrits à la séance)
      return this.riderservice.GetAdherentAdhesion(this.store.saison_active().id);
    })
    .then((riders: Adherent_VM[]) => {
      if (!riders) {
        this.Autres = [];
        return;
      }

      // Libellé pour les adhérents "autres"
      riders.forEach((p) => Personne_VM.bakeLibelle(p as any));

      // Ceux qui ne sont PAS dans All
      this.Autres = riders.filter(
        (x) => !this.All.find((y) => y.person?.id === x.id)
      );

      // 🔹 Si tu affiches un avatar aussi pour Autres, on peut aussi précharger :
      const fakeFull: FullInscriptionSeance_VM[] = this.Autres.map((p) => {
        const f = new FullInscriptionSeance_VM();
        (f as any).person = p as any; // on injecte la personne dans un "Full"
        return f;
      });

      this.preloadPhotos(fakeFull);

      this.cdr.detectChanges();
    })
    .catch((error) => {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    });
}



  private generateSeanceText() {
    const d = toDateSafe(this.thisSeance?.date_seance);
    if (!d) {
      this.seanceText = '';
      return;
    }
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    const dateDebStr = d.toLocaleDateString('fr-FR', options);
    this.seanceText = ` ${dateDebStr}`;
  }

  private photoCache = new Map<number, string>();
// Pour éviter de lancer 2 fois la même requête simultanée
private inFlight = new Set<number>();

// Lance le chargement des photos pour une liste de FullInscriptionSeance_VM
private preloadPhotos(items: FullInscriptionSeance_VM[]): void {
  for (const it of items) {
    const id = it?.person?.id;
    if (!id) continue;

    // déjà présente ?
    if (it.person.photo && it.person.photo.length > 0) continue;

    // déjà en cache ?
    const cached = this.photoCache.get(id);
    if (cached) { it.person.photo = cached; continue; }

    // déjà en cours ?
    if (this.inFlight.has(id)) continue;
    this.inFlight.add(id);

    // fire-and-forget
    this.riderservice.GetPhoto(id)
      .then(photo => {
        const url = photo && photo.length > 0 ? photo : '';
        if (url) {
          this.photoCache.set(id, url);
          it.person.photo = url;
          // Si ChangeDetectionStrategy.OnPush :
          // this.cdr.markForCheck();
        } else {
          // vide ⇒ on laisse l’avatar par défaut côté template
        }
      })
      .catch(() => {
        // on ignore l’erreur pour ne pas bloquer l’UI
      })
      .finally(() => {
        this.inFlight.delete(id);
      });
  }
}

  // -------------------------------------------------------------------------
  // CONNEXION / LIEN
  // -------------------------------------------------------------------------
  LoadLogin(compte: Compte_VM) {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les adhérents de mon compte`;
    this.login = compte.email;

    // Réponse forcée (présent/absent) ?
    const hasReponse = this.reponse !== null && this.reponse !== undefined;
    const statInsAuto: InscriptionStatus_VM | null = !hasReponse
      ? null
      : this.reponse
      ? InscriptionStatus_VM.PRESENT
      : InscriptionStatus_VM.ABSENT;

    if (!this.adherent) {
      // Tous les adhérents liés à ce compte
      this.inscriptionserv
        .GetAdherentCompte(this.login, this.thisSeance.id)
        .then((fis: FullInscriptionSeance_VM[]) => {
          fis.forEach((p) => Personne_VM.bakeLibelle(p.person));
          this.MesAdherents = fis;

          if (hasReponse && statInsAuto !== null && fis.length) {
            this.action = $localize`Mise à jour des présences`;
            let errorGlobal = false;

            const promises = fis.map((ins) => {
              const oldStatut = ins.statut_inscription;

              ins.statut_inscription = statInsAuto;

              const dto: InscriptionSeance_VM = {
                rider_id: ins.person.id,
                seance_id: this.thisSeance.id,
                date_inscription: ins.date_inscription ?? new Date(),
                statut_inscription: ins.statut_inscription,
                statut_seance: ins.statut_seance ?? null,
              };

              return this.inscriptionserv
                .MAJ(dto)
                .then((ok) => {
                  if (!ok) {
                    ins.statut_inscription = oldStatut;
                    errorGlobal = true;
                  }
                })
                .catch((err) => {
                  ins.statut_inscription = oldStatut;
                  errorGlobal = true;
                  const n = errorService.CreateError(this.action, err);
                  errorService.emitChange(n);
                });
            });

            Promise.all(promises).then(() => {
              if (!errorGlobal) {
                const n = errorService.OKMessage(this.action);
                errorService.emitChange(n);
              }
              // On force le rafraîchissement Angular
              this.MesAdherents = [...this.MesAdherents];
              this.All = this.All.map((x) => {
                const updated = this.MesAdherents.find(
                  (m) => m.person.id === x.person.id
                );
                return updated
                  ? { ...x, statut_inscription: updated.statut_inscription }
                  : x;
              });
              this.cdr.detectChanges();
            });
          } else {
            this.cdr.detectChanges();
          }
        })
        .catch((error) => {
          const n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
    } else {
      // Cas d'un seul adhérent ciblé (param ?adherent=)
      this.inscriptionserv
        .GetAdherentPersonne(this.adherent, this.thisSeance.id)
        .then((liste) => {
          (liste ?? []).forEach((obj: any) =>
            Personne_VM.bakeLibelle(obj.person)
          );
          this.MesAdherents = liste ?? [];

          if (hasReponse && statInsAuto !== null && this.MesAdherents[0]) {
            const ins = this.MesAdherents[0];
            const oldStatut = ins.statut_inscription;

            this.action = $localize`Mise à jour des présences`;
            ins.statut_inscription = statInsAuto;

            const dto: InscriptionSeance_VM = {
              rider_id: ins.person.id,
              seance_id: this.thisSeance.id,
              date_inscription: ins.date_inscription ?? new Date(),
              statut_inscription: ins.statut_inscription,
              statut_seance: ins.statut_seance ?? null,
            };

            this.inscriptionserv
              .MAJ(dto)
              .then((ok_) => {
                if (!ok_) {
                  ins.statut_inscription = oldStatut;
                  const n = errorService.UnknownError(this.action);
                  errorService.emitChange(n);
                } else {
                  const n = errorService.OKMessage(this.action);
                  errorService.emitChange(n);
                }
                this.MesAdherents = [...this.MesAdherents];
                this.All = this.All.map((x) =>
                  x.person.id === ins.person.id
                    ? { ...x, statut_inscription: ins.statut_inscription }
                    : x
                );
                this.cdr.detectChanges();
              })
              .catch((error) => {
                ins.statut_inscription = oldStatut;
                const n = errorService.CreateError(this.action, error);
                errorService.emitChange(n);
              });
          } else {
            this.cdr.detectChanges();
          }
        })
        .catch((error) => {
          const n = errorService.CreateError(this.action, error);
          errorService.emitChange(n);
        });
    }
  }

  // -------------------------------------------------------------------------
  // LOGIQUE SÉANCE
  // -------------------------------------------------------------------------
  GetNbPersonne(): boolean {
    if (this.thisSeance.est_place_maximum) {
      const ct = this.All.filter(
        (x) => x.statut_seance === SeanceStatus_VM.PRESENT
      ).length;
      return ct < this.thisSeance.place_maximum;
    }
    return true;
  }

  ChangerStatut(statut: string) {
    const errorService = ErrorService.instance;

    switch (statut) {
      case 'réalisée':
        this.action = $localize`Terminer la séance`;
        this.thisSeance.statut = StatutSeance.réalisée;
        break;
      case 'prévue':
        this.action = $localize`Planifier la séance`;
        this.thisSeance.statut = StatutSeance.prévue;
        break;
      case 'annulée':
        this.action = $localize`Annuler la séance`;
        this.thisSeance.statut = StatutSeance.annulée;
        break;
      default:
        return;
    }

    this.seanceserv
      .Update(this.thisSeance)
      .then((retour) => {
        if (retour) {
          const o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        }
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  // -------------------------------------------------------------------------
  // MAJ PRÉSENCE (boutons pouce vert / rouge)
  // -------------------------------------------------------------------------
  MAJPresence(inscription: FullInscriptionSeance_VM, statut: boolean | null) {
    const errorService = ErrorService.instance;

    const oldSeance = inscription.statut_seance ?? null;
    const oldInscription = inscription.statut_inscription ?? null;

    let statutText = $localize`Indéfini`;
    let newSeance: SeanceStatus_VM | null = null;

    if (statut === true) {
      statutText = $localize`présent`;
      newSeance = SeanceStatus_VM.PRESENT;
    } else if (statut === false) {
      statutText = $localize`Absent`;
      newSeance = SeanceStatus_VM.ABSENT;
    } else {
      statutText = $localize`Indéfini`;
      newSeance = null;
    }

    this.action =
      $localize`Nouveau statut d'inscription de ` +
      inscription.person.libelle +
      ` : ` +
      statutText +
      ` pour la séance ` +
      this.thisSeance.nom;

    // MAJ optimiste sur l'objet
    inscription.statut_seance = newSeance;

    const dto: InscriptionSeance_VM = {
      rider_id: inscription.person.id,
      seance_id: this.thisSeance.id,
      date_inscription: inscription.date_inscription ?? new Date(),
      statut_inscription: inscription.statut_inscription,
      statut_seance: newSeance,
    };

    this.inscriptionserv
      .MAJ(dto)
      .then((res) => {
        if (!res) {
          // rollback
          inscription.statut_seance = oldSeance;
          inscription.statut_inscription = oldInscription;
          const o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        } 

        // forcer changement pour Angular
        this.All = this.All.map((x) =>
          x.person.id === inscription.person.id ? inscription : x
        );
        this.MesAdherents = this.MesAdherents.map((x) =>
          x.person.id === inscription.person.id ? inscription : x
        );
        this.cdr.detectChanges();
      })
      .catch((err) => {
        inscription.statut_seance = oldSeance;
        inscription.statut_inscription = oldInscription;
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        this.cdr.detectChanges();
      });
  }

  // -------------------------------------------------------------------------
  // MAJ statut d'inscription (menu 3 points)
  // -------------------------------------------------------------------------
  MAJInscription(inscription: FullInscriptionSeance_VM, statut: string | null) {
    const errorService = ErrorService.instance;

    inscription.isVisible = false;

    const oldStatut = inscription.statut_inscription ?? null;

    let statutText = $localize`Indéfini`;
    switch (statut) {
      case 'présent':
        statutText = $localize`présent`;
        inscription.statut_inscription = InscriptionStatus_VM.PRESENT;
        break;
      case 'absent':
        statutText = $localize`Absent`;
        inscription.statut_inscription = InscriptionStatus_VM.ABSENT;
        break;
      case 'essai':
        statutText = $localize`à l'essai`;
        inscription.statut_inscription = InscriptionStatus_VM.ESSAI;
        break;
      case 'convoqué':
        statutText = $localize`convoqué`;
        inscription.statut_inscription = InscriptionStatus_VM.CONVOQUE;
        break;
      default:
        statutText = $localize`Indéfini`;
        inscription.statut_inscription = null;
        break;
    }

    const dto: InscriptionSeance_VM = {
      rider_id: inscription.person.id,
      seance_id: this.thisSeance.id,
      date_inscription: new Date(),
      statut_inscription: inscription.statut_inscription,
      statut_seance: inscription.statut_seance ?? null,
    };

    this.action =
      $localize`Nouveau statut d'inscription de ` +
      inscription.person.libelle +
      ` : ` +
      statutText +
      ` pour la séance ` +
      this.thisSeance.nom;

    this.inscriptionserv
      .MAJ(dto)
      .then((res) => {
        if (!res) {
          const o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
          inscription.statut_inscription = oldStatut;
        } else {
          const o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        }

        this.All = this.All.map((x) =>
          x.person.id === inscription.person.id ? inscription : x
        );
        this.MesAdherents = this.MesAdherents.map((x) =>
          x.person.id === inscription.person.id ? inscription : x
        );

        this.cdr.detectChanges();
      })
      .catch((err) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
        inscription.statut_inscription = oldStatut;
        this.cdr.detectChanges();
      });
  }

  // -------------------------------------------------------------------------
  // COMPTEURS / FILTRES
  // -------------------------------------------------------------------------
  getPresent(): number {
    return this.All.filter(
      (x) => x.statut_inscription === InscriptionStatus_VM.PRESENT
    ).length;
  }

  getAbsent(): number {
    return this.All.filter(
      (x) => x.statut_inscription === InscriptionStatus_VM.ABSENT
    ).length;
  }

  getPresencePotentielle(): number {
    return this.All.filter(x => x.statut_inscription == InscriptionStatus_VM.PRESENT || x.statut_inscription == InscriptionStatus_VM.ESSAI).length;
  }

  IsPresent(adh: FullInscriptionSeance_VM): boolean {
    return (
      !!adh.statut_inscription &&
      adh.statut_inscription === InscriptionStatus_VM.PRESENT
    );
  }

  IsAbsent(adh: FullInscriptionSeance_VM): boolean {
    return (
      !!adh.statut_inscription &&
      adh.statut_inscription === InscriptionStatus_VM.ABSENT
    );
  }

  // -------------------------------------------------------------------------
  // AJOUT ADHÉRENT HORS GROUPE
  // -------------------------------------------------------------------------
  AjouterAdherentsHorsGroupe() {
    const errorService = ErrorService.instance;
    if (!this.adherent_to) return;

    this.action = $localize`Convoquer ` + this.adherent_to.libelle;
    const conv: InscriptionSeance_VM = {
      rider_id: this.adherent_to.id,
      seance_id: this.thisSeance.id,
      date_inscription: new Date(),
      statut_inscription: InscriptionStatus_VM.CONVOQUE,
      statut_seance: null,
    };

    this.inscriptionserv
      .MAJ(conv)
      .then((id) => {
        this.Load();
        this.adherent_to = null;
        const o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  // -------------------------------------------------------------------------
  // MENUS CONTEXTUELS (3 points)
  // -------------------------------------------------------------------------
  openMenu(potentiel: any, ev: MouseEvent) {
    ev.stopPropagation();
    this.closeAllMenus();
    potentiel.isVisible = true;
    this.cdr.detectChanges();
  }

  setStatusAndClose(
    statut: 'présent' | 'absent' | 'essai' | 'convoqué' | null,
    potentiel: FullInscriptionSeance_VM,
    ev?: MouseEvent
  ) {
    ev?.stopPropagation();
    this.MAJInscription(potentiel, statut);
    potentiel.isVisible = false;
    this.cdr.detectChanges();
  }

  private closeAllMenus() {
    this.All.forEach((x) => (x.isVisible = false));
    this.MesAdherents.forEach((x) => (x.isVisible = false));
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeAllMenus();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.closePanel();
    this.closePreview();
    this.closeAllMenus();
  }


onImgError(evt: Event) {
  (evt.target as HTMLImageElement).src = this.defaultAvatar;
}


  // -------------------------------------------------------------------------
  // PREVIEW FICHE
  // -------------------------------------------------------------------------
  openPreview(potentiel: FullInscriptionSeance_VM, ev?: Event) {
    ev?.stopPropagation();
    this.previewPotentiel = potentiel ?? null;
  }

  closePreview() {
    this.previewPotentiel = null;
  }

  getPhoto(p: FullInscriptionSeance_VM): string {
    return (p?.person?.photo || this.defaultAvatar) as string;
  }

  iconClass(p: FullInscriptionSeance_VM): string {
    const s = (p?.statut_inscription ?? '').toString().toLowerCase();
    switch (s) {
      case 'présent':
      case 'present':
        return 'fa-thumbs-up has-text-success';
      case 'absent':
        return 'fa-thumbs-down has-text-danger';
      case 'essai':
        return 'fa-question';
      case 'convoqué':
      case 'convoque':
      case 'convque':
        return 'fa-hand-point-up has-text-info';
      default:
        return 'fa-ellipsis-h';
    }
  }

  // -------------------------------------------------------------------------
  // CONTACT URGENCE
  // -------------------------------------------------------------------------
  private _contact_urgence(ins: FullInscriptionSeance_VM): string {
    const p = ins.person;
    if (!p) return '';

    // 1) contact_prevenir / PHONE
    const cpPhone = p.contact_prevenir?.find((x: any) => x.Type === 'PHONE');
    if (cpPhone?.Value) return cpPhone.Value;

    // 2) premier contact_prevenir
    if (p.contact_prevenir?.length) {
      return p.contact_prevenir[0].Value ?? '';
    }

    // 3) contact / PHONE
    const cPhone = p.contact?.find((x: any) => x.Type === 'PHONE');
    if (cPhone?.Value) return cPhone.Value;

    // 4) premier contact
    if (p.contact?.length) {
      return p.contact[0].Value ?? '';
    }

    return '';
  }

  private _contact_urgence_nom(ins: FullInscriptionSeance_VM): string {
    const p = ins.person;
    if (!p) return '';

    const cpPhone = p.contact_prevenir?.find((x: any) => x.Type === 'PHONE');
    if (cpPhone?.Notes) return cpPhone.Notes;

    if (p.contact_prevenir?.length) {
      return p.contact_prevenir[0].Notes ?? '';
    }

    const cPhone = p.contact?.find((x: any) => x.Type === 'PHONE');
    if (cPhone?.Notes) return cPhone.Notes;

    return '';
  }

  contact_urgence(p?: FullInscriptionSeance_VM): string {
    if (!p?.person) return '';
    try {
      return this._contact_urgence(p);
    } catch {
      return '';
    }
  }

  contact_urgence_nom(p?: FullInscriptionSeance_VM): string {
    if (!p?.person) return '';
    try {
      return this._contact_urgence_nom(p);
    } catch {
      return '';
    }
  }

  // -------------------------------------------------------------------------
  // PANNEAU MAIL
  // -------------------------------------------------------------------------
  openPanel(mode: 'convocation' | 'annulation' | 'ajout' | 'note') {
    this.uiMode = mode;
    this.optionsOpen = false;
    this.toggleMobileOptions = false;
    this.Notes = '';

    this.variables = {
      SEANCE: this.thisSeance.nom,
      id: this.thisSeance.id,
      PERSONNE_ID: this.selectedRecipients[0]?.rider_id ?? 0,
      DATE: formatDDMMYYYY(this.thisSeance.date_seance),
      ID: this.thisSeance.id,
      NOM: $localize`Prénom Nom`,
      LIEU: this.thisSeance.lieu_nom ?? 'lieu non définie',
      HEURE: this.thisSeance.heure_debut ?? 'heure non définie',
      RDV: this.thisSeance.rdv ?? '',
      DUREE:
        this.thisSeance.duree_seance != null
          ? `${this.thisSeance.duree_seance} min`
          : 'durée non définie',
      NOTES: this.Notes,
    };

    if (mode === 'convocation') {
      const errorService = ErrorService.instance;
      this.action = $localize`Chargement du template de convocation`;
      this.selectedRecipients = this.All.filter(
        (p) => p.statut_inscription === InscriptionStatus_VM.CONVOQUE
      );

      this.mailserv
        .GetMail(mode)
        .then((retour: KeyValuePairAny) => {
          this.mailSubject = retour.key;
          this.mailBody = retour.value;
        })
        .catch(() => {
          this.mailSubject = `[Convocation] ${
            this.thisSeance?.nom ?? ''
          }`;
          this.mailBody = `Bonjour,

Vous êtes convoqué(e) pour la séance ${this.seanceText}.
Merci de confirmer votre présence.`;
        });
    } else if (mode === 'annulation') {
      const errorService = ErrorService.instance;
      this.action = $localize`Chargement du template d'annulation`;
      this.selectedRecipients = [...this.All];

      this.mailserv
        .GetMail(mode)
        .then((retour: KeyValuePairAny) => {
          this.mailSubject = retour.key;
          this.mailBody = retour.value;
        })
        .catch(() => {
          this.mailSubject = `[Annulation] ${
            this.thisSeance?.nom ?? ''
          }`;
          this.mailBody = `Bonjour,

La séance ${this.seanceText} est annulée.`;
        });
    } else {
      // ajout / note
      this.selectedRecipients = [];
      this.mailSubject = '';
      this.mailBody = '';
    }
  }

  closePanel() {
    this.uiMode = 'list';
    this.selectedRecipients = [];
    this.optionsOpen = false;
    this.toggleMobileOptions = false;
  }

  isChecked(
    p: FullInscriptionSeance_VM,
    kind: 'convocation' | 'annulation'
  ): boolean {
    return this.selectedRecipients.some((x) => x.person.id === p.person.id);
  }

  toggleRecipient(
    p: FullInscriptionSeance_VM,
    kind: 'convocation' | 'annulation',
    checked: boolean
  ) {
    if (checked) {
      if (!this.isChecked(p, kind)) {
        this.selectedRecipients = [...this.selectedRecipients, p];
      }
    } else {
      this.selectedRecipients = this.selectedRecipients.filter(
        (x) => x.person.id !== p.person.id
      );
    }
  }

  checkAll(kind: 'convocation' | 'annulation', val: boolean) {
    if (kind === 'convocation') {
      this.selectedRecipients = val
        ? this.All.filter(
            (p) => p.statut_inscription === InscriptionStatus_VM.CONVOQUE
          )
        : [];
    } else {
      // annulation => tout le monde
      this.selectedRecipients = val ? [...this.All] : [];
    }
  }

  sendMail(kind: 'convocation' | 'annulation') {
    const errorService = ErrorService.instance;

    if (kind === 'annulation') {
      const c = window.confirm(
        $localize`Voulez-vous passer le statut de la séance à Annulée ?`
      );
      if (!c) {
        return;
      }

      this.action = $localize`Annuler la séance`;
      this.thisSeance.statut = StatutSeance.annulée;
      this.seanceserv
        .Update(this.thisSeance)
        .then(() => {
          const o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        })
        .catch((err: HttpErrorResponse) => {
          const o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    }

    this.action = $localize`Envoi du mail`;
    this.mailserv
      .EnvoyerConvocationAnnulation(
        kind,
        this.selectedRecipients.map((x) => x.person.id),
        this.Notes,
        this.thisSeance.id
      )
      .then(() => {
        const o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    this.closePanel();
  }

  saveInfoSeance() {
    const errorService = ErrorService.instance;
    this.action = $localize`Note sauvegardée`;

    this.seanceserv
      .Update(this.thisSeance)
      .then(() => {
        const o = errorService.OKMessage(this.action);
        errorService.emitChange(o);
      })
      .catch((err: HttpErrorResponse) => {
        const o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });

    this.closePanel();
  }
}

// ---------------------------------------------------------------------------
// HELPERS DATE
// ---------------------------------------------------------------------------
export function formatDDMMYYYY(
  input: Date | string | null | undefined
): string {
  const d = toDateSafe(input);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toDateSafe(input: unknown): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    const d = new Date(input.getTime());
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === 'string') {
    // Essaye YYYY-MM-DD
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const yyyy = +m[1];
      const mm = +m[2] - 1;
      const dd = +m[3];
      const d = new Date(yyyy, mm, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    // Sinon parse standard
    const ms = Date.parse(input);
    if (!Number.isNaN(ms)) return new Date(ms);

    return null;
  }

  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
