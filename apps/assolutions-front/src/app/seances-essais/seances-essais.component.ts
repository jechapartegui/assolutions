import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdherentService } from '../../services/adherent.service';
import { SeancesService } from '../../services/seance.service';
import { GlobalService } from '../../services/global.services';
import { Compte_VM } from '@shared/lib/compte.interface';
import { CompteService } from '../../services/compte.service';
import { Personne_VM } from '@shared/lib/personne.interface';
import { ErrorService } from '../../services/error.service';
import { Adherent_VM } from '@shared/lib/member.interface';
import { InscriptionSeanceService } from '../../services/inscription-seance.service';
import {
  InscriptionSeance_VM,
  InscriptionStatus_VM,
} from '@shared/lib/inscription_seance.interface';
import { MailService } from '../../services/mail.service';
import { Seance_VM } from '@shared/index';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-seances-essais',
  templateUrl: './seances-essais.component.html',
  styleUrls: ['./seances-essais.component.css'],
})
export class SeancesEssaisComponent implements OnInit {
  public context: 'compte' | 'personne' | 'validation' = 'compte';
  public id_seance = 0;
  public action = '';
  public thisAccount: Compte_VM | null = null;
  public thisSeance: Seance_VM | null = null;
  public ListePersonne: Personne_VM[] = [];
  public personne: Personne_VM | null = null;
  public edit_personne = false;
  public saving = false;

  constructor(
    public GlobalServices: GlobalService,
    public mail_serv: MailService,
    public inscription_seance: InscriptionSeanceService,
    public route: ActivatedRoute,
    public router: Router,
    public sean_serv: SeancesService,
    public rider_serv: AdherentService,
    public compteserv: CompteService,
    public store: AppStore,
  ) {}

  ngOnInit(): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Inscription à l'essai`;

    if (!this.store.hasProjet()) {
      errorService.emitChange(
        errorService.CreateError(
          this.action,
          $localize`Vous n'êtes pas connecté à un club, veuillez repartir de la liste des séances`,
        ),
      );
    }

    this.route.queryParams.subscribe(async (params) => {
      const id = Number(params['id'] ?? 0);
      if (!id) return;
      this.id_seance = id;
      this.thisSeance = await this.sean_serv.Get(id);
      this.action = $localize`Faire un essai`;
      this.context = 'compte';
    });
  }

  async gererCompte(cvm: Compte_VM): Promise<void> {
    if (!cvm) return;

    this.thisAccount = cvm;
    this.context = 'personne';

    if (cvm.id === 0) {
      this.ListePersonne = [];
      this.personne = null;
      return;
    }

    this.ListePersonne = await this.rider_serv.GetAllPersonne(cvm.id);
    this.personne = this.ListePersonne.length === 1 ? this.ListePersonne[0] : null;
    this.edit_personne = false;
  }

  async Valider(): Promise<void> {
    const errorService = ErrorService.instance;
    this.action = $localize`Inscription à l'essai`;

    if (this.saving) return;
    if (!this.thisAccount) {
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Aucun compte sélectionné`),
      );
      return;
    }
    if (!this.personne) {
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Aucune personne sélectionnée`),
      );
      return;
    }
    if (!this.id_seance) {
      errorService.emitChange(
        errorService.CreateError(this.action, $localize`Aucune séance sélectionnée`),
      );
      return;
    }

    const libelleSeance = this.thisSeance?.nom ? ` « ${this.thisSeance.nom} »` : '';
    const confirmed = window.confirm(
      $localize`Confirmez-vous la demande de séance d'essai${libelleSeance} ? Le club sera informé et vous recevrez un mail de confirmation.`,
    );
    if (!confirmed) return;

    this.saving = true;
    try {
      await this.ensureAccount();
      const personneId = await this.ensurePersonne();
      await this.registerTrial(personneId);

      // L'inscription est déjà enregistrée : un incident SMTP ne doit pas annuler l'essai.
      void this.mail_serv.EnvoiMailEssai(personneId, this.id_seance).catch((mailError: unknown) => {
        console.error("Échec de l'envoi du mail de confirmation d'essai", mailError);
      });

      errorService.emitChange(errorService.OKMessage(this.action));
      const projectId = this.store.selectedProject()?.id;
      await this.router.navigate(
        projectId ? ['/liste-seances-public'] : ['/login'],
        projectId ? { queryParams: { id: projectId } } : undefined,
      );
    } catch (error: unknown) {
      errorService.emitChange(errorService.CreateError(this.action, error));
    } finally {
      this.saving = false;
    }
  }

  private async ensureAccount(): Promise<void> {
    if (!this.thisAccount || this.thisAccount.id > 0) return;
    const id = await this.compteserv.Add(this.thisAccount);
    this.thisAccount.id = Number(id);
    this.personne!.compte = this.thisAccount.id;
  }

  private async ensurePersonne(): Promise<number> {
    if (!this.personne) throw new Error('Aucune personne sélectionnée.');
    if (this.personne.id > 0) return this.personne.id;

    const adherent = Object.assign(new Adherent_VM(), this.personne);
    adherent.compte = this.thisAccount!.id;
    const id = Number(await this.rider_serv.Add(adherent));
    adherent.id = id;
    this.personne.id = id;
    return id;
  }

  private async registerTrial(personneId: number): Promise<void> {
    const inscription = new InscriptionSeance_VM();
    inscription.date_inscription = new Date();
    inscription.statut_inscription = InscriptionStatus_VM.ESSAI;
    inscription.statut_seance = null;
    inscription.rider_id = personneId;
    inscription.seance_id = this.id_seance;

    const ok = await this.inscription_seance.MAJ(inscription);
    if (!ok) throw new Error("L'inscription à la séance d'essai n'a pas pu être enregistrée.");
  }

  isLP0(): boolean {
    return !this.ListePersonne.some((personne) => personne.id === 0);
  }

  async addPersonne(personne: Personne_VM): Promise<void> {
    if (personne) {
      this.personne = personne;
      if (!this.ListePersonne.includes(personne)) this.ListePersonne.push(personne);
    }
    this.edit_personne = false;
  }
}
