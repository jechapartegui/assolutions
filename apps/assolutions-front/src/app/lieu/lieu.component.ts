import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { LieuNestService } from '../../services/lieu.nest.service';
import { Lieu_VM } from '@shared/lib/lieu.interface';
import { Adresse } from '@shared/lib/adresse.interface';
import { AppStore } from '../app.store';
import { GlobalService } from '../../services/global.services';

@Component({
  standalone: false,
  selector: 'app-lieu',
  templateUrl: './lieu.component.html',
  styleUrls: ['./lieu.component.css'],
})
export class LieuComponent implements OnInit {
  valid_address: boolean;
  Liste: Lieu_VM[] = [];
  Item: Lieu_VM | null = null;
  afficher_filtre: boolean = false;
  filter_nom = '';
  action: string = '';
  public loading: boolean = false;
  refreshing = false;

  @ViewChild('scrollableContent', { static: false })
  scrollableContent!: ElementRef<HTMLDivElement>;
  sort_nom: string;
  save: string = '';
  edit: boolean = false;
  constructor(
    public router: Router,
    public lieu_serv: LieuNestService,
    public store: AppStore,
    public GlobalService: GlobalService
  ) {}
  trackById = (_: number, l: Lieu_VM) => l.id;
  ngOnInit(): void {
    this.RefreshLieu({ apply: true }); // 1er chargement : on applique direct
  }
  async RefreshLieu(opts: { apply: boolean } = { apply: false }) {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger les lieux`;

    const firstLoad = !this.Liste || this.Liste.length === 0;

    // 1) UI flags
    if (opts.apply && firstLoad) {
      this.loading = true; // -> déclenche le loader (Liste vide)
    } else {
      this.refreshing = true; // -> laisse l’écran visible + tag "Mise à jour…"
    }

    this.store.setLieuLoading(true);

    try {
      const remote = await this.lieu_serv.GetAll();

      if (opts.apply) this.store.applyLieu(remote);
      else this.store.markRemoteLieu(remote);

      this.RebuildListeFromStore();
    } catch (err: any) {
      const o = errorService.CreateError(this.action, err?.message ?? `${err}`);
      errorService.emitChange(o);
    } finally {
      this.loading = false;
      this.refreshing = false;
      this.store.setLieuLoading(false);
    }
  }

  private RebuildListeFromStore() {
    const all = this.store.Lieu().Liste ?? [];
    const q = this.normalize(this.filter_nom);

    let tmp = !q
      ? [...all]
      : all.filter((l) => this.normalize(l.nom).includes(q));

    // tri (si actif)
    if (this.sort_nom && this.sort_nom !== 'NO') {
      tmp.sort((a, b) => {
        const A = a.nom.toUpperCase();
        const B = b.nom.toUpperCase();
        const cmp = A > B ? 1 : A < B ? -1 : 0;
        return this.sort_nom === 'ASC' ? cmp : -cmp;
      });
    }

    this.Liste = tmp;
  }

  ExportExcel() {
    throw new Error('Method not implemented.');
  }
  Creer(): void {
    this.Item = new Lieu_VM();
    this.edit = true;
    this.save = JSON.stringify(this.Item);
  }

  CheckHisto(): boolean {
    let h = JSON.stringify(this.Item);
    if (h != this.save && this.save != '') {
      return true;
    } else {
      return false;
    }
  }

  async Save() {
    const errorService = ErrorService.instance;

    if (!this.Item) return;

    try {
      if (this.Item.id === 0) {
        const id = await this.lieu_serv.Add(this.Item);
        if (id > 0) {
          this.Item.id = id;
          this.store.upsertLieuLocal(this.Item); // UI instant
          this.RebuildListeFromStore();

          errorService.emitChange(
            errorService.OKMessage($localize`Ajouter un lieu`)
          );

          // refresh silencieux (ne touche pas Liste, juste badge si différent)
          this.RefreshLieu({ apply: false });
        }
      } else {
        await this.lieu_serv.Update(this.Item);
        this.store.upsertLieuLocal(this.Item);
        this.RebuildListeFromStore();

        errorService.emitChange(
          errorService.OKMessage($localize`Mettre à jour un lieu`)
        );

        this.RefreshLieu({ apply: false });
      }
    } catch (err: any) {
      errorService.emitChange(
        errorService.CreateError(
          $localize`Sauvegarder un lieu`,
          err?.message ?? `${err}`
        )
      );
    }
  }

Retour(): void {
  if (this.CheckHisto()) {
    const confirm = window.confirm($localize`Vous perdrez les modifications réalisées non sauvegardées, voulez-vous continuer ?`);
    if (!confirm) return;
  }
  this.Item = null;
  this.RebuildListeFromStore();
}



  valid_adresse(isValid: boolean): void {
    this.valid_address = isValid;
  }
  private normalize = (s?: string) =>
    (s ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  Filter(v: string) {
    this.filter_nom = v;
    this.RebuildListeFromStore();
  }

  SaveAdresse(thisAdresse: Adresse) {
    this.Item.adresse = thisAdresse;
    if (this.valid_address && this.Item.nom.length > 4) {
      this.Save();
    }
  }
public FiltrerListeLieu(): void {
  this.RebuildListeFromStore();
}
Sort(sens: "NO" | "ASC" | "DESC", champ: string) {
  if (champ === "nom") {
    this.sort_nom = sens;
    this.RebuildListeFromStore();
  }
}

  Edit(lieu: Lieu_VM): void {
    const errorService = ErrorService.instance;
    this.action = $localize`Charger la séance`;
    this.lieu_serv
      .Get(lieu.id)
      .then((ss) => {
        this.Item = ss;
        this.save = JSON.stringify(this.Item);
      })
      .catch((err: HttpErrorResponse) => {
        let o = errorService.CreateError(this.action, err.message);
        errorService.emitChange(o);
      });
  }

  Cancel(): void {
    let l = this.Liste.find((l) => l.id == this.Item.id);
    this.Item.nom = l.nom;
  }

  async Delete(item: Lieu_VM) {
    const errorService = ErrorService.instance;
    const confirmation = window.confirm(
      $localize`Voulez-vous supprimer ce lieu ? ...`
    );
    if (!confirmation) return;

    const backup = [...this.store.Lieu().Liste];
    this.store.removeLieuLocal(item.id);
    this.RebuildListeFromStore();

    try {
      await this.lieu_serv.Delete(item.id);
      errorService.emitChange(
        errorService.OKMessage($localize`Supprimer un lieu`)
      );
      this.RefreshLieu({ apply: false });
    } catch (err: any) {
      // rollback simple
      this.store.applyLieu(backup);
      this.RebuildListeFromStore();
      errorService.emitChange(
        errorService.CreateError(
          $localize`Supprimer un lieu`,
          err?.message ?? `${err}`
        )
      );
    }
  }
}
