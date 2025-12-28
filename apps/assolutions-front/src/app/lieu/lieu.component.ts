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
  refreshing = false;needsReload = false;

bulkWorking = false;
bulkLabel = ''; // optionnel: "Suppression…" / "Copie…"

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

      if (opts.apply) {
        this.store.applyLieu(remote);
this.clearSelection();}
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
    $localize`Voulez-vous supprimer ce lieu ?`
  );
  if (!confirmation) return;

  // backup (rollback simple)
  const backup = { ...item };

  // optimistic : on enlève de suite
  this.store.removeLieuLocal(item.id);
  this.RebuildListeFromStore();

  try {
    await this.lieu_serv.Delete(item.id);

    errorService.emitChange(
      errorService.OKMessage($localize`Lieu supprimé.`)
    );

    // refresh silencieux (optionnel)
    this.RefreshLieu({ apply: false });

  } catch (err: any) {
    // rollback
    this.store.upsertLieuLocal(backup);
    this.RebuildListeFromStore();

    // message unique, clair
    const msg = err?.message ?? `${err}`;
    errorService.emitChange(
      errorService.CreateError(
        $localize`Suppression impossible`,
        $localize`Ce lieu est probablement utilisé ailleurs.`
      )
    );

    console.warn('Delete KO:', msg);

    // proposer resync
    this.needsReload = true;

    // si tu veux resync automatique plutôt que laisser le bouton:
    // await this.RefreshLieu({ apply: true });
  }
}


  // Sélection (IDs)
selectedIds = new Set<number>();

// (Optionnel) pratique pour le template
get hasSelection(): boolean {
  return this.selectedIds.size > 0;
}

// Toggle 1 item
toggleSelection(lieuId: number, checked: boolean) {
  if (checked) this.selectedIds.add(lieuId);
  else this.selectedIds.delete(lieuId);
}

// Checkbox state
isSelected(lieuId: number): boolean {
  return this.selectedIds.has(lieuId);
}

// Clear selection
clearSelection() {
  this.selectedIds.clear();
}

// Récupérer les items sélectionnés (ce que tu demandes)
getItemsSelected(): Lieu_VM[] {
  const selected = this.selectedIds;
  return (this.Liste ?? []).filter(x => selected.has(x.id));
}

// (Optionnel) sélectionner/désélectionner toute la liste visible
toggleSelectAll(checked: boolean) {
  this.selectedIds.clear();
  if (checked) {
    for (const l of (this.Liste ?? [])) this.selectedIds.add(l.id);
  }
}
async supprimerListe() {
  const errorService = ErrorService.instance;
  const items = this.getItemsSelected();
  if (items.length === 0) return;

  const confirmation = window.confirm(
    $localize`Supprimer ${items.length} lieu(x) sélectionné(s) ?`
  );
  if (!confirmation) return;

  this.bulkWorking = true;
  this.bulkLabel = $localize`Suppression en cours…`;

  // backup pour rollback partiel
  const backupById = new Map<number, Lieu_VM>();
  for (const it of items) backupById.set(it.id, { ...it });

  try {
    // optimistic : on enlève tout de suite
    for (const it of items) this.store.removeLieuLocal(it.id);
    this.clearSelection();
    this.RebuildListeFromStore();

    const ok: number[] = [];
    const ko: { id: number; nom: string; reason: string }[] = [];

    for (const it of items) {
      try {
        await this.lieu_serv.Delete(it.id);
        ok.push(it.id);
      } catch (err: any) {
        ko.push({
          id: it.id,
          nom: it.nom,
          reason: err?.message ?? `${err}`,
        });
      }
    }

    // KO => rollback partiel + message + reload conseillé
    if (ko.length > 0) {
      for (const fail of ko) {
        const restore = backupById.get(fail.id);
        if (restore) this.store.upsertLieuLocal(restore);
      }
      this.RebuildListeFromStore();

      // 1 seul message (pas spam)
      
      // tu peux aussi afficher un message plus friendly si tu détectes “foreign key”
      errorService.emitChange(
        errorService.CreateError(
          $localize`Suppression partielle`,
          $localize`${ok.length} supprimé(s), ${ko.length} refusé(s) (probablement utilisé(s) ailleurs).`
        )
      );

    // proposer resync
       this.needsReload = true;
      // et là : re-check silencieux OU reload complet
      // perso : apply:true (tu remets l’écran 100% conforme serveur)
      await this.RefreshLieu({ apply: true });
      return;
    }

    // Tout OK
    errorService.emitChange(
      errorService.OKMessage($localize`${ok.length} lieu(x) supprimé(s).`)
    );

    // refresh silencieux (optionnel)
    this.RefreshLieu({ apply: false });

  } finally {
    this.bulkWorking = false;
    this.bulkLabel = '';
  }
}



async copierListe() {
  const errorService = ErrorService.instance;
  const items = this.getItemsSelected();

  if (items.length === 0) return;

  const confirmation = window.confirm(
    $localize`Copier ${items.length} lieu(x) sélectionné(s) ?`
  );
  if (!confirmation) return;

  // UI: tu peux garder la sélection ou la vider (perso je vide)
  this.clearSelection();

  const created: Lieu_VM[] = [];
  const ko: { nom: string; reason: string }[] = [];

  // traitement séquentiel = stable
  for (const it of items) {
    // Copie sans ID + reset dates
    const copy: Lieu_VM = {
      ...structuredClone(it), // si pas supporté chez toi: JSON.parse(JSON.stringify(it))
      id: 0,
      createdAt: undefined,
      updatedAt: undefined,

      // optionnel: suffixer le nom
      nom: `${it.nom} (copie)`,
    };

    try {
      const newId = await this.lieu_serv.Add(copy);

      if (!newId || newId <= 0) {
        ko.push({ nom: it.nom, reason: 'ID invalide retourné par le serveur' });
        continue;
      }

      copy.id = newId;

      // Optimistic store: on ajoute la copie immédiatement
      this.store.upsertLieuLocal(copy);
      created.push(copy);
      this.RebuildListeFromStore();
    } catch (err: any) {
      ko.push({ nom: it.nom, reason: err?.message ?? `${err}` });
    }
  }

  // message unique de synthèse
  if (ko.length === 0) {
    errorService.emitChange(
      errorService.OKMessage($localize`${created.length} lieu(x) copié(s).`)
    );
  } else {
    console.warn('Bulk copy KO:', ko);
    errorService.emitChange(
      errorService.CreateError(
        $localize`Copie partielle`,
        $localize`${created.length} copié(s), ${ko.length} en échec.`
      )
    );
  }

  // Refresh silencieux unique (pour récupérer updatedAt/createdAt serveur, etc.)
  this.RefreshLieu({ apply: false });
}


}
