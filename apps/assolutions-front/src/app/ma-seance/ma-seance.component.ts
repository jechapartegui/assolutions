/* eslint-disable @typescript-eslint/no-inferrable-types */
import { HttpErrorResponse } from "@angular/common/http";
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { ErrorService } from "../../services/error.service";
import { InscriptionSeanceApiService } from "../../services/inscription-seance-api.service";
import { SeanceApiService } from "../../services/seance-api.service";
import {
  Compte,
  FullInscriptionSeance_VM,
  InscriptionSeance,
  InscriptionStatus_VM,
  MailProjectTemplateVm,
  OutgoingMessageVm,
  SeanceStatus_VM,
  UpdateInscriptionSeanceDto,
} from "@shared/index";
import { Adherent_VM } from "@shared/lib/member.interface";
import {
  Seance_VM,
  StatutSeance,
  UpdateSeanceDto,
} from "@shared/lib/seance.interface";
import {
  ItemContact,
  Personne,
  Personne_VM,
} from "@shared/lib/personne.interface";
import { AppStore } from "../app.store";
import { SeanceMapper } from "../../mapper/seance.mapper";
import { MessageApiService } from "../../services/message-api.service";
import { MailProjectApiService } from "../../services/mail-project-api.service";
import { AdhesionApiService } from "../../services/adhesion-api.service";
import { DocumentApiService } from "../../services/document-api.service";
import { PersonneApiService } from "../../services/personne-api.service";
import {
  ContactApiService,
  ContactDto,
} from "../../services/contact-api.service";
import { AdherentMapper } from "../../mapper/adherent.mapper";

@Component({
  standalone: false,
  selector: "app-ma-seance",
  templateUrl: "./ma-seance.component.html",
  styleUrls: ["./ma-seance.component.css"],
})
export class MaSeanceComponent implements OnInit, AfterViewInit {
  @Input() id: number = 0;

  @ViewChild("scrollableContent", { static: false })
  scrollableContent!: ElementRef<HTMLElement>;

  showScrollToTop = false;

  display_personne = true;
  display_absent = true;
  display_present = true;
  add_adh_seance = false;
  public multi = false;

  libellechargeradherent: string = "";
  thisSeance!: Seance_VM;
  Autres: Adherent_VM[] = [];
  All: FullInscriptionSeance_VM[] = [];
  MesAdherents: FullInscriptionSeance_VM[] = [];

  Notes = "";
  variables: Record<string, any> = {};

  adherent_to: Adherent_VM | null = null;

  action = "";
  seanceText = "";

  login: string | null = null;
  reponse: boolean | null = null;
  adherent: number | null = null;
  vue_alpha = true;
  isLien = false;
  private _loadLoginDone = false;

  optionsOpen = false;
  toggleMobileOptions = false;
  uiMode: "list" | "convocation" | "annulation" | "ajout" | "note" = "list";

  selectedRecipients: FullInscriptionSeance_VM[] = [];
  mailSubject = "";
  mailBody = "";

  previewPotentiel: FullInscriptionSeance_VM | null = null;

  defaultAvatar = "assets/photo_H.png";

  private photoCache = new Map<number, string>();
  private inFlight = new Set<number>();

  constructor(
    public store: AppStore,
    public riderservice: AdhesionApiService,
    public cdr: ChangeDetectorRef,
    private seanceserv: SeanceApiService,
    private router: Router,
    private route: ActivatedRoute,
    private seancemapper: SeanceMapper,
    private inscriptionserv: InscriptionSeanceApiService,
    private mailserv: MessageApiService,
    private mailProjectServ: MailProjectApiService,
    private documentapi: DocumentApiService,
    private personneapi: PersonneApiService,
    private contactapi: ContactApiService,
    private adherentmapper: AdherentMapper,
  ) {}

  get isProf(): boolean {
    return this.store.isProf();
  }

  get isLoggedIn(): boolean {
    return this.store.isLoggedIn();
  }

  get hasSeance(): boolean {
    return !!this.thisSeance;
  }

  get pendingPlacesLabel(): string {
    if (!this.thisSeance?.est_place_maximum) return "";
    const max = this.thisSeance.place_maximum ?? 0;
    const current = this.getPresent();
    return `${current}/${max} places`;
  }

  async afterLoginFromSeance(): Promise<void> {
    const compte = this.store.compte();

    if (!compte?.login) return;

    this._loadLoginDone = false;

    await this.Load();

    if (this.isLien) {
      this._loadLoginDone = true;
      await this.LoadLogin(compte);
    }

    this.cdr.detectChanges();
  }

  async ngOnInit(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;

    const params = this.route.snapshot.queryParams as {
      [k: string]: string | undefined;
    };

    if (!this.id || this.id === 0) {
      if (params["id"]) {
        this.id = +params["id"];
      } else {
        this.router.navigate(["/menu"]);
        this.store.updateSelectedMenu("MENU");
        return;
      }
    }

    if (params["login"]) {
      this.isLien = true;
      this.login = params["login"];
    }
    if (params["adherent"]) {
      this.isLien = true;
      this.adherent = +params["adherent"];
    }
    if (params["reponse"] !== undefined) {
      this.isLien = true;
      const r = params["reponse"]!;
      this.reponse = r === "0" ? false : r === "1" ? true : null;
    }

    try {
      const ss = await this.seanceserv.get(this.id);
      this.thisSeance = this.seancemapper.toSeanceVm(ss);
      this.generateSeanceText();
    } catch (error) {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
      return;
    }

    const compte = this.store.compte();
    this.Load();

    if (this.isLien) {
      if (!this._loadLoginDone && compte && compte.login) {
        this._loadLoginDone = true;
        this.LoadLogin(compte);
      }
    }

    if (this.isLien && this.login && !this.adherent && !this._loadLoginDone) {
      this._loadLoginDone = true;
      this.inscriptionserv
        .GetAdherentCompte(this.login, this.id)
        .then((liste) => {
          (liste ?? []).forEach((obj: any) =>
            Personne_VM.bakeLibelle(obj.person),
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

  private waitForScrollableContainer(): void {
    setTimeout(() => {
      if (this.scrollableContent?.nativeElement) {
        this.scrollableContent.nativeElement.addEventListener(
          "scroll",
          this.onContentScroll.bind(this),
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
    if (!this.scrollableContent?.nativeElement) return;

    this.scrollableContent.nativeElement.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  AfficherMenu() {
    this.router.navigate(["/menu"]);
    this.store.updateSelectedMenu("MENU");
  }

  RetourListe() {
    this.router.navigate(["/seance"], {
      queryParams: { id: this.thisSeance.id },
    });
  }

  private getPersonneId(person?: Partial<Personne_VM> | null): number {
    return Number((person as any)?.id ?? (person as any)?.personne_id ?? 0);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private sortByLibelle = (
    a: FullInscriptionSeance_VM,
    b: FullInscriptionSeance_VM,
  ): number => {
    return this.normalizeText(a.person?.libelle).localeCompare(
      this.normalizeText(b.person?.libelle),
      "fr",
    );
  };

  private toInscriptionStatus(value: unknown): InscriptionStatus_VM | null {
    const v = this.normalizeText(value);

    switch (v) {
      case "present":
        return InscriptionStatus_VM.PRESENT;
      case "absent":
        return InscriptionStatus_VM.ABSENT;
      case "convoque":
        return InscriptionStatus_VM.CONVOQUE;
      case "essai":
        return InscriptionStatus_VM.ESSAI;
      default:
        return null;
    }
  }

  private toSeanceStatus(value: unknown): SeanceStatus_VM | null {
    const v = this.normalizeText(value);

    switch (v) {
      case "present":
        return SeanceStatus_VM.PRESENT;
      case "absent":
        return SeanceStatus_VM.ABSENT;
      default:
        return null;
    }
  }

  private mapContact(c: ContactDto): ItemContact {
    return {
      id: c.id,
      Diffusion: c.diffusion ?? false,
      Type: c.contact_type,
      Value: c.contact_value ?? "",
      Info: c.info ?? "",
      Pref: c.pref,
    };
  }

  private bakePersonne(
    rawPersonne: Personne,
    contacts: ContactDto[],
  ): Personne_VM {
    const base = this.adherentmapper.toPersonneVm(rawPersonne) as Personne_VM;

    Object.setPrototypeOf(base, Personne_VM.prototype);

    const personneId =
      this.getPersonneId(base) || Number((rawPersonne as any).id ?? 0);
    const itemContacts = (contacts ?? []).filter(
      (c) => Number(c.object_id) === personneId,
    );

    base.contact = itemContacts
      .filter((x) => x.contact_list === "liste_contact")
      .map((c) => this.mapContact(c));

    base.contact_prevenir = itemContacts
      .filter((x) => x.contact_list === "liste_contact_prevenir")
      .map((c) => this.mapContact(c));

    Personne_VM.bakeLibelle(base);
    return base;
  }

  MapToFullInscriptionSeance_VM(
    inscriptions: InscriptionSeance[],
    personnes: Personne[],
    contacts: ContactDto[],
  ): FullInscriptionSeance_VM[] {
    const personnesById = new Map<number, Personne>();

    for (const p of personnes ?? []) {
      const id = Number((p as any).id ?? (p as any).personne_id ?? 0);
      if (id) personnesById.set(id, p);
    }

    return (inscriptions ?? [])
      .map((ins): FullInscriptionSeance_VM | null => {
        const personneId = Number(ins.personne_id ?? 0);
        const rawPersonne = personnesById.get(personneId);

        if (!personneId || !rawPersonne) {
          return null;
        }

        const person = this.bakePersonne(rawPersonne, contacts);

        return {
          project_id: ins.project_id,
          personne_id: personneId,
          seance_id: Number(ins.seance_id),
          date_inscription: ins.date_inscription ?? null,
          statut_inscription: this.toInscriptionStatus(ins.statut_inscription),
          statut_seance: this.toSeanceStatus(ins.statut_seance),
          person,
          isVisible: false,
        };
      })
      .filter((x): x is FullInscriptionSeance_VM => x !== null)
      .sort(this.sortByLibelle);
  }

  async Load(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;

    try {
      const inscriptions = (await this.inscriptionserv.GetAllSeanceFull(
        this.id,
      )) as InscriptionSeance[];

      const personneIds = [
        ...new Set(
          (inscriptions ?? [])
            .map((ins) => Number(ins.personne_id ?? 0))
            .filter((id) => id > 0),
        ),
      ];

      const [personnes, contacts] = await Promise.all([
        this.personneapi.list_by_id(personneIds),
        this.contactapi.list_by_id(personneIds),
      ]) as [Personne[], ContactDto[]];

      this.All = this.MapToFullInscriptionSeance_VM(
        inscriptions ?? [],
        personnes,
        contacts,
      );
      await this.preloadPhotos(this.All);

      // Un professeur gère les séances du projet : la liste d'ajout doit donc
      // contenir les adhérents actifs de la saison, pas seulement les personnes
      // rattachées à son propre compte.
      const riders = this.isProf
        ? await this.riderservice.GetAdherentSaisonStaff(this.thisSeance.saison_id)
        : await this.riderservice.GetAdherentAdhesion(
            this.thisSeance.saison_id,
            this.store.compte().login,
          );

      const alreadyInSeance = new Set(
        this.All.map((x) => Number(x.personne_id)).filter((id) => id > 0),
      );

      this.Autres = (riders ?? [])
        .map((p) => {
          Object.setPrototypeOf(p, Personne_VM.prototype);
          Personne_VM.bakeLibelle(p as any);
          return p;
        })
        .filter((x) => !alreadyInSeance.has(Number(x.id)))
        .sort((a, b) =>
          this.normalizeText(a.libelle).localeCompare(
            this.normalizeText(b.libelle),
            "fr",
          ),
        );

      this.cdr.detectChanges();
    } catch (error) {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
    }
  }

  private generateSeanceText() {
    const d = toDateSafe(this.thisSeance?.date_seance);
    if (!d) {
      this.seanceText = "";
      return;
    }
    const options: Intl.DateTimeFormatOptions = {
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    const dateDebStr = d.toLocaleDateString("fr-FR", options);
    this.seanceText = ` ${dateDebStr}`;
  }

  private async preloadPhotos(
    items: FullInscriptionSeance_VM[],
  ): Promise<void> {
    const ids = [
      ...new Set(
        (items ?? [])
          .map((it) => it?.person?.id)
          .filter((id): id is number => !!id),
      ),
    ];

    if (!ids.length) return;

    try {
      const photosById = await this.documentapi.photo_by_id(ids);

      for (const it of items ?? []) {
        const id = it?.person?.id;
        if (!id || !it.person) continue;

        if (it.person.photo && it.person.photo.length > 0) continue;

        const cached = this.photoCache.get(id);
        if (cached) {
          it.person.photo = cached;
          continue;
        }

        const url = photosById?.[id] ?? "";
        if (url) {
          this.photoCache.set(id, url);
          it.person.photo = url;
        }
      }

      this.cdr.detectChanges();
    } catch {
      // On ne bloque pas l'écran pour une photo manquante
    }
  }

  async LoadLogin(compte: Compte): Promise<void> {
    const errorService = ErrorService.instance;

    this.action = $localize`Charger les adhérents de mon compte`;
    this.libellechargeradherent = $localize`Chargement des adhérents liés à mon compte...`;
    this.login = compte.login;

    const hasReponse = this.reponse !== null && this.reponse !== undefined;

    const statInsAuto: InscriptionStatus_VM | null = !hasReponse
      ? null
      : this.reponse
        ? InscriptionStatus_VM.PRESENT
        : InscriptionStatus_VM.ABSENT;

    try {
      const inscriptions = await this.inscriptionserv.GetAdherentCompte(
        this.login!,
        this.thisSeance.id,
      ) as InscriptionSeance[];

      const personneIds = [
        ...new Set((inscriptions ?? []).map(i => Number(i.personne_id))),
      ];

      const personnes = personneIds.length
        ? await this.personneapi.list_by_id(personneIds)
        : [];

      const personnesById = new Map(
        personnes.map(p => [Number(p.id), p]),
      );

      let fullInscriptions: FullInscriptionSeance_VM[] = (inscriptions ?? [])
        .map(inscription => {
          const person = personnesById.get(Number(inscription.personne_id));

          if (!person) {
            return null;
          }

          Personne_VM.bakeLibelle(person);

          return {
            ...inscription,
            person: this.adherentmapper.toPersonneVm(person) as Personne_VM,
            isVisible: false,
          } as FullInscriptionSeance_VM;
        })
        .filter((x): x is FullInscriptionSeance_VM => x !== null);

      if (this.adherent) {
        fullInscriptions = fullInscriptions.filter(
          x => Number(x.personne_id) === Number(this.adherent),
        );
      }

      this.MesAdherents = fullInscriptions;

      if (!this.MesAdherents.length) {
        this.libellechargeradherent =
          $localize`Aucun adhérent lié à ce compte n'est inscrit à cette séance.`;
        this.cdr.detectChanges();
        return;
      }

      if (hasReponse && statInsAuto !== null) {
        this.action = $localize`Mise à jour des présences`;

        let errorGlobal = false;

        const promises = this.MesAdherents.map(async ins => {
          const oldStatut = ins.statut_inscription;

          ins.statut_inscription = statInsAuto;

          const dto: UpdateInscriptionSeanceDto = {
            date_inscription: ins.date_inscription ?? new Date(),
            statut_inscription: ins.statut_inscription,
            statut_seance: ins.statut_seance ?? null,
          };

          try {
            const ok = await this.inscriptionserv.update(
              ins.personne_id,
              this.thisSeance.id,
              dto,
            );

            if (!ok) {
              ins.statut_inscription = oldStatut;
              errorGlobal = true;
            }
          } catch (err) {
            ins.statut_inscription = oldStatut;
            errorGlobal = true;

            const n = errorService.CreateError(this.action, err);
            errorService.emitChange(n);
          }
        });

        await Promise.all(promises);

        if (!errorGlobal) {
          const n = errorService.OKMessage(this.action);
          errorService.emitChange(n);
        }

        this.MesAdherents = [...this.MesAdherents];

        this.All = this.All.map(x => {
          const updated = this.MesAdherents.find(
            m => Number(m.personne_id) === Number(x.personne_id),
          );

          return updated
            ? { ...x, statut_inscription: updated.statut_inscription }
            : x;
        });
      }

      this.cdr.detectChanges();
    } catch (error) {
      const n = errorService.CreateError(this.action, error);
      errorService.emitChange(n);
      this.cdr.detectChanges();
    }
  }

  GetNbPersonne(): boolean {
    if (this.thisSeance.est_place_maximum) {
      const ct = this.All.filter(
        (x) => x.statut_seance === SeanceStatus_VM.PRESENT,
      ).length;
      return ct < (this.thisSeance.place_maximum ?? 0);
    }
    return true;
  }

  ChangerStatut(statut: string) {
    const errorService = ErrorService.instance;

    switch (statut) {
      case "réalisée":
        this.action = $localize`Terminer la séance`;
        this.thisSeance.statut = StatutSeance.réalisée;
        break;
      case "prévue":
        this.action = $localize`Planifier la séance`;
        this.thisSeance.statut = StatutSeance.prévue;
        break;
      case "annulée":
        this.action = $localize`Annuler la séance`;
        this.thisSeance.statut = StatutSeance.annulée;
        break;
      default:
        return;
    }
    const dto: UpdateSeanceDto = {
      statut: this.thisSeance.statut,
    };

    this.seanceserv
      .update(this.thisSeance.id, dto)
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

    inscription.statut_seance = newSeance;

    const dto: UpdateInscriptionSeanceDto = {
      date_inscription: inscription.date_inscription ?? new Date(),
      statut_inscription: inscription.statut_inscription,
      statut_seance: newSeance,
    };

    this.inscriptionserv
      .update(inscription.personne_id, this.thisSeance.id, dto)
      .then((res) => {
        if (!res) {
          inscription.statut_seance = oldSeance;
          inscription.statut_inscription = oldInscription;
          const o = errorService.UnknownError(this.action);
          errorService.emitChange(o);
        }

        this.All = this.All.map((x) =>
          x.personne_id === inscription.personne_id ? inscription : x,
        );
        this.MesAdherents = this.MesAdherents.map((x) =>
          x.personne_id === inscription.personne_id ? inscription : x,
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

  MAJInscription(inscription: FullInscriptionSeance_VM, statut: string | null) {
    const errorService = ErrorService.instance;

    inscription.isVisible = false;

    const oldStatut = inscription.statut_inscription ?? null;

    let statutText = $localize`Indéfini`;
    switch (statut) {
      case "présent":
        statutText = $localize`présent`;
        inscription.statut_inscription = InscriptionStatus_VM.PRESENT;
        break;
      case "absent":
        statutText = $localize`Absent`;
        inscription.statut_inscription = InscriptionStatus_VM.ABSENT;
        break;
      case "essai":
        statutText = $localize`à l'essai`;
        inscription.statut_inscription = InscriptionStatus_VM.ESSAI;
        break;
      case "convoqué":
        statutText = $localize`convoqué`;
        inscription.statut_inscription = InscriptionStatus_VM.CONVOQUE;
        break;
      default:
        statutText = $localize`Indéfini`;
        inscription.statut_inscription = null;
        break;
    }

    const dto: UpdateInscriptionSeanceDto = {
      date_inscription: new Date(),
      statut_inscription: inscription.statut_inscription,
    };

    this.action =
      $localize`Nouveau statut d'inscription de ` +
      inscription.person.libelle +
      ` : ` +
      statutText +
      ` pour la séance ` +
      this.thisSeance.nom;

    this.inscriptionserv
      .update(inscription.personne_id, this.thisSeance.id, dto)
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
          x.personne_id === inscription.personne_id ? inscription : x,
        );
        this.MesAdherents = this.MesAdherents.map((x) =>
          x.personne_id === inscription.personne_id ? inscription : x,
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

  getPresent(): number {
    return this.All.filter((x) => x.statut_seance === SeanceStatus_VM.PRESENT)
      .length;
  }

  getAbsent(): number {
    return this.All.filter((x) => x.statut_seance === SeanceStatus_VM.ABSENT)
      .length;
  }

  getPresencePotentielle(): number {
    return this.All.filter(
      (x) =>
        x.statut_inscription == InscriptionStatus_VM.PRESENT ||
        x.statut_inscription == InscriptionStatus_VM.ESSAI,
    ).length;
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

  AjouterAdherentsHorsGroupe() {
    const errorService = ErrorService.instance;
    if (!this.adherent_to) return;

    this.action = $localize`Convoquer ` + this.adherent_to.libelle;
    const conv: UpdateInscriptionSeanceDto = {
      date_inscription: new Date(),
      statut_inscription: InscriptionStatus_VM.CONVOQUE,
      statut_seance: null,
    };

    this.inscriptionserv
      .update(this.adherent_to.id, this.thisSeance.id, conv)
      .then(() => {
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

  openMenu(potentiel: FullInscriptionSeance_VM, ev: MouseEvent) {
    ev.stopPropagation();
    this.closeAllMenus();
    potentiel.isVisible = true;
    this.cdr.detectChanges();
  }

  setStatusAndClose(
    statut: "présent" | "absent" | "essai" | "convoqué" | null,
    potentiel: FullInscriptionSeance_VM,
    ev?: MouseEvent,
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

  @HostListener("document:click")
  onDocumentClick() {
    this.closeAllMenus();
  }

  @HostListener("document:keydown.escape")
  onEsc() {
    this.closePanel();
    this.closePreview();
    this.closeAllMenus();
  }

  onImgError(evt: Event) {
    (evt.target as HTMLImageElement).src = this.defaultAvatar;
  }

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
    const s = (p?.statut_inscription ?? "").toString().toLowerCase();
    switch (s) {
      case "présent":
      case "present":
        return "fa-thumbs-up has-text-success";
      case "absent":
        return "fa-thumbs-down has-text-danger";
      case "essai":
        return "fa-flask has-text-warning";
      case "convoqué":
      case "convoque":
      case "convque":
        return "fa-hand-point-up has-text-info";
      default:
        return "fa-ellipsis-h";
    }
  }

  private _contact_urgence(ins: FullInscriptionSeance_VM): string {
    const p = ins.person;
    if (!p) return "";

    const cpPhone = p.contact_prevenir?.find(
      (x: ItemContact) => x.Type === "PHONE",
    );
    if (cpPhone?.Value) return cpPhone.Value;

    if (p.contact_prevenir?.length) {
      return p.contact_prevenir[0].Value ?? "";
    }

    const cPhone = p.contact?.find((x: ItemContact) => x.Type === "PHONE");
    if (cPhone?.Value) return cPhone.Value;

    if (p.contact?.length) {
      return p.contact[0].Value ?? "";
    }

    return "";
  }

  private _contact_urgence_nom(ins: FullInscriptionSeance_VM): string {
    const p = ins.person;
    if (!p) return "";

    const cpPhone = p.contact_prevenir?.find(
      (x: ItemContact) => x.Type === "PHONE",
    );
    if (cpPhone?.Info) return cpPhone.Info;

    if (p.contact_prevenir?.length) {
      return p.contact_prevenir[0].Info ?? "";
    }

    const cPhone = p.contact?.find((x: ItemContact) => x.Type === "PHONE");
    if (cPhone?.Info) return cPhone.Info;

    return "";
  }

  contact_urgence(p?: FullInscriptionSeance_VM): string {
    if (!p?.person) return "";
    try {
      return this._contact_urgence(p);
    } catch {
      return "";
    }
  }

  contact_urgence_nom(p?: FullInscriptionSeance_VM): string {
    if (!p?.person) return "";
    try {
      return this._contact_urgence_nom(p);
    } catch {
      return "";
    }
  }

  openPanel(mode: "convocation" | "annulation" | "ajout" | "note") {
    this.uiMode = mode;
    this.optionsOpen = false;
    this.toggleMobileOptions = false;
    this.Notes = "";

    this.variables = {
      SEANCE: this.thisSeance.nom,
      id: this.thisSeance.id,
      PERSONNE_ID: this.selectedRecipients[0]?.personne_id ?? 0,
      DATE: formatDDMMYYYY(this.thisSeance.date_seance),
      ID: this.thisSeance.id,
      NOM: $localize`Prénom Nom`,
      LIEU: this.thisSeance.lieu_nom ?? "lieu non définie",
      HEURE: this.thisSeance.heure_debut ?? "heure non définie",
      RDV: this.thisSeance.rdv ?? "",
      DUREE:
        this.thisSeance.duree_seance != null
          ? `${this.thisSeance.duree_seance} min`
          : "durée non définie",
      NOTES: this.Notes,
    };

    if (mode === "convocation") {
      this.action = $localize`Chargement du template de convocation`;
      this.selectedRecipients = this.All.filter(
        (p) => p.statut_inscription === InscriptionStatus_VM.CONVOQUE,
      );

      this.mailProjectServ
        .getTemplate(mode)
        .then((retour: MailProjectTemplateVm) => {
          this.mailSubject = retour.sujet;
          this.mailBody = retour.mail;
        })
        .catch(() => {
          this.mailSubject = `[Convocation] ${this.thisSeance?.nom ?? ""}`;
          this.mailBody = `Bonjour,

Vous êtes convoqué(e) pour la séance ${this.seanceText}.
Merci de confirmer votre présence.`;
        });
    } else if (mode === "annulation") {
      this.action = $localize`Chargement du template d'annulation`;
      this.selectedRecipients = [...this.All];

      this.mailProjectServ
        .getTemplate(mode)
        .then((retour: MailProjectTemplateVm) => {
          this.mailSubject = retour.sujet;
          this.mailBody = retour.mail;
        })
        .catch(() => {
          this.mailSubject = `[Annulation] ${this.thisSeance?.nom ?? ""}`;
          this.mailBody = `Bonjour,

La séance ${this.seanceText} est annulée.`;
        });
    } else {
      this.selectedRecipients = [];
      this.mailSubject = "";
      this.mailBody = "";
    }
  }

  closePanel() {
    this.uiMode = "list";
    this.selectedRecipients = [];
    this.optionsOpen = false;
    this.toggleMobileOptions = false;
  }

  isChecked(
    p: FullInscriptionSeance_VM,
    kind: "convocation" | "annulation",
  ): boolean {
    return this.selectedRecipients.some((x) => x.personne_id === p.personne_id);
  }

  toggleRecipient(
    p: FullInscriptionSeance_VM,
    kind: "convocation" | "annulation",
    checked: boolean,
  ) {
    if (checked) {
      if (!this.isChecked(p, kind)) {
        this.selectedRecipients = [...this.selectedRecipients, p];
      }
    } else {
      this.selectedRecipients = this.selectedRecipients.filter(
        (x) => x.personne_id !== p.personne_id,
      );
    }
  }

  checkAll(kind: "convocation" | "annulation", val: boolean) {
    if (kind === "convocation") {
      this.selectedRecipients = val
        ? this.All.filter(
            (p) => p.statut_inscription === InscriptionStatus_VM.CONVOQUE,
          )
        : [];
    } else {
      this.selectedRecipients = val ? [...this.All] : [];
    }
  }

  private buildMailVariables(
    recipient: FullInscriptionSeance_VM,
  ): Record<string, unknown> {
    return {
      SEANCE: this.thisSeance?.nom ?? "",
      id: this.thisSeance?.id ?? 0,
      ID: this.thisSeance?.id ?? 0,
      PERSONNE_ID: recipient?.personne_id ?? 0,
      NOM: recipient?.person?.libelle ?? "",
      DATE: formatDDMMYYYY(this.thisSeance?.date_seance),
      LIEU: this.thisSeance?.lieu_nom ?? "lieu non définie",
      HEURE: this.thisSeance?.heure_debut ?? "heure non définie",
      RDV: this.thisSeance?.rdv ?? "",
      DUREE:
        this.thisSeance?.duree_seance != null
          ? `${this.thisSeance.duree_seance} min`
          : "durée non définie",
      NOTES: this.Notes ?? "",
    };
  }

  private renderTemplate(
    template: string | null | undefined,
    variables: Record<string, unknown>,
  ): string {
    return String(template ?? "").replace(
      /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g,
      (_match, key: string) => String(variables[key] ?? ""),
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private renderMailHtml(
    template: string | null | undefined,
    variables: Record<string, unknown>,
  ): string {
    const rendered = this.escapeHtml(this.renderTemplate(template, variables));
    return rendered
      .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\r?\n/g, "<br>");
  }

  sendMail(kind: "convocation" | "annulation") {
    const errorService = ErrorService.instance;

    if (kind === "annulation") {
      const c = window.confirm(
        $localize`Voulez-vous passer le statut de la séance à Annulée ?`,
      );
      if (!c) return;

      this.action = $localize`Annuler la séance`;
      this.thisSeance.statut = StatutSeance.annulée;
      this.seanceserv
        .update(this.thisSeance.id, { statut: this.thisSeance.statut })
        .then(() => {
          const o = errorService.OKMessage(this.action);
          errorService.emitChange(o);
        })
        .catch((err: HttpErrorResponse) => {
          const o = errorService.CreateError(this.action, err.message);
          errorService.emitChange(o);
        });
    }

    const listmail: OutgoingMessageVm[] = this.selectedRecipients.map((x) => {
      const variables = this.buildMailVariables(x);
      const subject = this.renderTemplate(this.mailSubject, variables)
        .replace(/\*\*/g, "");
      const body = this.renderTemplate(this.mailBody, variables);
      const html = this.renderMailHtml(this.mailBody, variables);

      return {
        to_person_id: x.personne_id,
        subject,
        body,
        html,
        to: {
          email: "",
          name: x.person.libelle,
        },
        project_id: this.store.selectedProjectId(),
      };
    });

    this.action = $localize`Envoi du mail`;
    this.mailserv
      .sendMany(listmail)
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
      .update(this.thisSeance.id, { info_seance: this.thisSeance.info_seance })
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

export function formatDDMMYYYY(
  input: Date | string | null | undefined,
): string {
  const d = toDateSafe(input);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function toDateSafe(input: unknown): Date | null {
  if (!input) return null;

  if (input instanceof Date) {
    const d = new Date(input.getTime());
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof input === "string") {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const yyyy = +m[1];
      const mm = +m[2] - 1;
      const dd = +m[3];
      const d = new Date(yyyy, mm, dd);
      return isNaN(d.getTime()) ? null : d;
    }

    const ms = Date.parse(input);
    if (!Number.isNaN(ms)) return new Date(ms);

    return null;
  }

  if (typeof input === "number") {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}
