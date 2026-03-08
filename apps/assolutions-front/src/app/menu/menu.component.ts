import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { StaticClass } from '../global';
import { AdherentSeance_VM, MesSeances_VM, Seance, Seance_VM, StatutSeance, calculerHeureFin, mapSeanceListToVM } from '@shared/index';
import { KeyValuePair } from '@shared/lib/autres.interface';
import { AdherentMenu } from '../../class/adherent-menu';
import { Lieu, Lieu_VM, mapLieuxToVM } from '@shared/lib/lieu.interface';
import { Cours_VM, mapCoursListToVM } from '@shared/lib/cours.interface';
import { MultifiltersMenuPipe } from '../../filters/multifilters-menu.pipe';
import { AppStore } from '../app.store';
import { AdhesionApiService } from '../../services/adhesion-api.service';
import { MenuDataStore } from '../../services/menu-data.store';
import { ContratProfApiService } from '../../services/contrat-prof-api.service';
import { CreateInscriptionSeanceDto, InscriptionStatus_VM, PersonneLight_VM, ProfLight_VM, SeanceProfesseur_Light, SeanceStatus_VM } from '@shared/index';
import { PersonneApiService } from '../../services/personne-api.service';
import { LieuApiService } from '../../services/lieu-api.service';
import { CoursApiService } from '../../services/cours-api.service';
import { GroupesApiService } from '../../services/groupes-api.service';
import { Groupe } from '@shared/lib/groupes.interface';
import { LienGroupeApiService } from '../../services/lien-groupe-api.service';
import { CoursProfesseurApiService } from '../../services/cours-professeur-api.service';
import { MesSeancesApiService } from '../../services/mes-seances-api.service';
import { SeanceApiService } from '../../services/seance-api.service';
import { SeanceProfesseurApiService } from '../../services/seance-professeur-api.service';
import { InscriptionSeanceApiService } from '../../services/inscription-seance-api.service';

@Component({
  standalone: false,
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
})
export class MenuComponent implements OnInit {

  action: string;
  Riders: AdherentMenu[];
  listeprof: ProfLight_VM[];
  listelieu: Lieu_VM[];
  listegroupe: Groupe[];
  // --- Contact club ---
  showContactClub = false;
  contactClubMessage = '';


    public loading: boolean = false;
    @ViewChild('scrollableContent', { static: false })
scrollableContent?: ElementRef<HTMLElement>;
    showScrollToTop: boolean = false;
  denseMode = false;

  public liste_prof_filter: KeyValuePair[];
  public liste_lieu_filter: string[];
  public liste_groupe_filter: string[];
  public liste_cours_filter: string[];
  public anniversaire: string[];
  listeCours: Cours_VM[] = [];

  public g: StaticClass;
  constructor(
    private adhesionserv: AdhesionApiService,
    public cdr: ChangeDetectorRef,
    public store:AppStore,
    private router: Router,
    private menuStore:MenuDataStore,
    private contratprof_serv: ContratProfApiService,
    private seance_prof_serv: SeanceProfesseurApiService,
    private ma_seance_serv: MesSeancesApiService,
    private seance_serv:SeanceApiService,
    private personne_serv:PersonneApiService,
    private groupe_serv: GroupesApiService,
    private liengroupe_serv: LienGroupeApiService,
    private cours_profservice: CoursProfesseurApiService,
    private inscription_seance_serv:InscriptionSeanceApiService,
    private lieuserv: LieuApiService,
    private coursservice: CoursApiService,
  private multifiltersPipe: MultifiltersMenuPipe // 👈 injecte le pipe
  ) {}

async ngOnInit(): Promise<void> {
  const errorService = ErrorService.instance;
  this.action = $localize`Charger le menu`;

  // Redirection admin
  if (this.store.mode() === 'ADMIN') {
    this.router.navigate(['/menu-admin']);
    return;
  }

  this.loading = true;

  try {
    const { yesterday, nextMonth } = this.computeDefaultDates();

    this.Riders = [];

    const projectId = this.store.selectedProject().id;
    const saisonId = this.store.saison_active_id();
    const rights = this.store.selectedProject().rights;

    // 1) Lancer en parallèle ce qui ne dépend pas des autres
    const anniversairePromise = this.loadAnniversaire(saisonId);

    // (cache-first, potentiellement en parallèle)
    const refsPromise = this.loadReferenceData(projectId, saisonId);

    // 2) Charger Riders selon droits
    this.Riders = await this.loadRiders(rights, yesterday, nextMonth);

    // 3) Attendre les refs (profs/lieux/cours) puis enrichir
    await refsPromise;
    await anniversairePromise;

    this.enrichRidersWithNames(this.Riders);


  } catch (err: any) {
    this.handleInitError(err, errorService);
  } finally {
    this.loading = false;
    this.updateDenseMode();
    window.addEventListener('resize', this.updateDenseMode);
  }
}

ngOnDestroy() {
  window.removeEventListener('resize', this.updateDenseMode);
}

/* ---------------------------- Helpers privés ---------------------------- */

private computeDefaultDates() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);

  return { yesterday, nextMonth };
}

private async loadAnniversaire(saisonId: number): Promise<void> {
  try {
    const anniv = await this.adhesionserv.Anniversaire(saisonId);
    this.anniversaire = anniv;
  } catch {
    // option : ignorer si tu ne veux pas bloquer le menu pour ça
    // ou remonter une erreur si c'est critique
  }
}

private async loadReferenceData(projectId: number, saisonId: number): Promise<void> {
  this.action = $localize`Charger les données de référence`;

  const prereqPromise = Promise.all([
    this.loadProfs(projectId),
    this.loadLieux(projectId),
    this.loadGroupes(projectId),
  ]);

  await prereqPromise;

  await this.loadCours(saisonId);
}

private async loadProfs(projectId: number): Promise<void> {
  this.action = $localize`Récupérer la liste des professeurs`;

  if (this.menuStore.profsFresh(projectId)) {
    this.listeprof = this.menuStore.getProfs(projectId)!.value;
    this.liste_prof_filter = this.listeprof.map(x => ({
      key: x.contrat_id,                // 👈 plus logique si tu sélectionnes par contrat
      value: `${x.prenom} ${x.nom}`,
    }));
    return;
  }

  const contrats = await this.contratprof_serv.list(this.store.saison_active_id());

  // (Optionnel mais recommandé) si tu es dans une saison, filtre ici par saison_id
  // const contrats = (await this.contratprof_serv.list()).filter(c => c.saison_id === saisonId);

  const profIds = contrats
    .map(c => c.professeur_id)
    .filter((id): id is number => id != null);

  const personnes = await this.personne_serv.list_personnelight(profIds);

  if (personnes.length === 0) {
    throw ErrorService.instance.CreateError(
      this.action,
      $localize`Il faut au moins un professeur pour créer un cours`
    );
  }

  // Index personnes par id
  const personneById = new Map<number, PersonneLight_VM>(
    personnes.map(p => [p.id, p])
  );

  // ✅ On fabrique des ProfLight_VM à partir des contrats
  const profs: ProfLight_VM[] = contrats
    .map(cp => {
      const p = personneById.get(cp.professeur_id);
      if (!p) return null;

      const prof = new ProfLight_VM();
      Object.assign(prof, p);
      prof.contrat_id = cp.id;
      return prof;
    })
    .filter((x): x is ProfLight_VM => !!x);

  if (profs.length === 0) {
    throw ErrorService.instance.CreateError(
      this.action,
      $localize`Aucun contrat professeur valide`
    );
  }

  this.menuStore.setProfs(projectId, profs);
  this.listeprof = profs;

  this.liste_prof_filter = profs.map(x => ({
    key: x.contrat_id,                // 👈 clé par contrat
    value: `${x.prenom} ${x.nom}`,
  }));
}

private async loadLieux(projectId: number): Promise<void> {
  this.action = $localize`Récupérer la liste des lieux`;

  if (this.menuStore.lieuxFresh(projectId)) {
    this.listelieu = this.menuStore.getLieux(projectId)!.value;
    this.liste_lieu_filter = this.listelieu.map((x) => x.nom);
    return;
  }

  const lieux = await this.lieuserv.list();
  if (lieux.length === 0) {
    throw ErrorService.instance.CreateError(
      this.action,
      $localize`Il faut au moins un lieu pour créer un cours`
    );
  }

  this.menuStore.setLieux(projectId, lieux);
 this.listelieu = mapLieuxToVM(lieux);

  this.liste_lieu_filter = lieux.map((x) => x.nom);
}

private async loadGroupes(projectId: number): Promise<void> {
  this.action = $localize`Récupérer la liste des groupes`;

  if (this.menuStore.groupesFresh(projectId)) {
    this.listegroupe = this.menuStore.getGroupes(projectId)!.value;
    this.liste_groupe_filter = this.listegroupe.map((x) => x.nom);
    return;
  }

  const groupes = await this.groupe_serv.list(this.store.saison_active_id());
  if (groupes.length === 0) {
    throw ErrorService.instance.CreateError(
      this.action,
      $localize`Il faut au moins un groupe pour créer un cours`
    );
  }

  this.menuStore.setGroupes(projectId, groupes);
 this.listegroupe = groupes;

  this.liste_groupe_filter = this.listegroupe.map((x) => x.nom);
}

private async loadCours(saisonId: number): Promise<void> {
  this.action = $localize`Récupérer la liste des cours`;

  if (this.menuStore.coursFresh(saisonId)) {
    this.listeCours = this.menuStore.getCours(saisonId)!.value;
    return;
  }

  const cours = await this.coursservice.list(saisonId);
  const groupesByCoursId: Record<number, number[]> = await this.liengroupe_serv.listGroupesByCoursId(cours.map(c => c.id)); 
  this.menuStore.setCours(saisonId, cours);
  const contratsByCoursId: Record<number, number[]> =
  await this.cours_profservice.listProfsByCoursId(cours.map(c => c.id)); // ok si ça renvoie bien contrat_id

this.listeCours = mapCoursListToVM(
  cours,
  this.listelieu,
  this.listegroupe,
  this.listeprof, // ProfLight_VM[]
  { groupesByCoursId, contratsByCoursId }
);
}

private async loadRiders(
  rights: { adherent: boolean; essai: boolean; prof: boolean },
  yesterday: Date,
  nextMonth: Date
): Promise<AdherentMenu[]> {
  const riders: AdherentMenu[] = [];

  // Adhérent + essai
  if (rights.adherent || rights.essai) {
    this.action = $localize`Récupérer les adhérents`;
    const seancesAdh = await this.GetMySeance();
    riders.push(...this.buildRiders(seancesAdh, 'ADH', yesterday, nextMonth));
  }

  // Prof
  if (rights.prof) {
    this.action = $localize`Récupérer les professeurs`;
    const seancesProf = await this.GetProfSeance();
    riders.push(...this.buildRiders(seancesProf, 'PROF', yesterday, nextMonth));
  }

  // Tri final
  riders.sort((a, b) => a.id - b.id);
  console.log("Riders avant pipe : ", riders);
  return riders;
}

private buildRiders(
  seances: any[],
  profil: 'ADH' | 'PROF',
  yesterday: Date,
  nextMonth: Date
): AdherentMenu[] {
  return seances.map((x) => {
    const rider = new AdherentMenu(x);
    rider.profil = profil;
    rider.filters.filter_date_avant = yesterday;
    rider.filters.filter_date_apres = nextMonth;

    this.sortMesSeances(rider);
    return rider;
  });
}

private sortMesSeances(rider: AdherentMenu) {
  rider.MesSeances.sort((a, b) => {
    const dateA = new Date(a.seance.date_seance);
    const [hA, mA] = a.seance.heure_debut.split(':').map(Number);
    dateA.setHours(hA, mA, 0, 0);

    const dateB = new Date(b.seance.date_seance);
    const [hB, mB] = b.seance.heure_debut.split(':').map(Number);
    dateB.setHours(hB, mB, 0, 0);

    return dateA.getTime() - dateB.getTime();
  });
}

private enrichRidersWithNames(riders: AdherentMenu[]) {
  for (const rider of riders) {
    for (const ms of rider.MesSeances) {
      if (ms.seance.lieu_id && ms.seance.lieu_id > 0) {
        ms.seance.lieu_nom = this.trouverLieu(ms.seance.lieu_id);
      }
      if (ms.seance.cours && ms.seance.cours > 0) {
        ms.seance.cours_nom = this.trouverCours(ms.seance);
      }
    }
  }
}

hasOpenedRider(): boolean {
  return !!this.Riders?.some(r => r.afficher);
}

private handleInitError(err: any, errorService: any) {
  const o =
    err instanceof HttpErrorResponse
      ? errorService.CreateError(this.action, err.message)
      : err instanceof Error
        ? errorService.CreateError(this.action, err.message)
        : err;

  errorService.emitChange(o);

  if (this.store.mode() === 'ADMIN') {
    if (o.message.includes('professeur')) {
      this.router.navigate(['/adherent']);
    } else if (o.message.includes('lieu')) {
      this.router.navigate(['/lieu']);
      this.store.updateSelectedMenu("LIEU");
    }
  } else {
    this.store.clearSession();
    this.router.navigate(['/login']);
  }
}

updateDenseMode = () => {
  this.denseMode = window.innerWidth < 480;
};

  getLibelleProfil(profil: string): string {
    return profil === 'ADH'
      ? $localize`Adhérent`
      : $localize`Professeur`;
  }
  
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
  

async GetMySeance(): Promise<AdherentSeance_VM[]> {
  this.action = $localize`Charger les séances disponibles`;
  const errorService = ErrorService.instance;

  try {
    return await this.hydrateAdherentSeances(() => this.ma_seance_serv.get());
  } catch (error: any) {
    const o = errorService.CreateError(this.action, error);
    errorService.emitChange(o);
    return [];
  }
}

async GetProfSeance(): Promise<AdherentSeance_VM[]> {
  this.action = $localize`Charger les séances à réaliser pour le professeur`;
  const errorService = ErrorService.instance;

  try {
    return await this.hydrateAdherentSeances(() => this.ma_seance_serv.prof());
  } catch (error: any) {
    const o = errorService.CreateError(this.action, error);
    errorService.emitChange(o);
    return [];
  }
}
private async hydrateAdherentSeances(
  fetchMinimal: () => Promise<AdherentSeance_VM[]>
): Promise<AdherentSeance_VM[]> {

  // 1) payload minimal : ids + statuts
  const retour = await fetchMinimal();

  // 2) ids
  const personneIds = this.buildIdList(retour, x => x.personne?.id);
  const seanceIds = Array.from(
    new Set(
      retour.flatMap(x => x.mes_seances?.map(ms => ms.seance?.id) ?? [])
            .filter((x): x is number => typeof x === 'number' && !isNaN(x))
    )
  );

  // 3) hydrate personnes
  const personnes: PersonneLight_VM[] =
    personneIds.length ? await this.personne_serv.list_personnelight(personneIds) : [];

  const personneById = new Map<number, PersonneLight_VM>(personnes.map(p => [p.id, p]));
  for (const a of retour) {
    const p = personneById.get(a.personne.id);
    if (p) a.personne = p;
  }

  // 4) charger séances + liens profs (par contrat)
  const seances: Seance[] =
    seanceIds.length ? await this.seance_serv.get_seance_by_ids(seanceIds) : [];

  const rawSeanceProfs: SeanceProfesseur_Light[] =
    seanceIds.length ? await this.seance_prof_serv.get_list_by_idseance(seanceIds) : [];

  const contratsBySeanceId = this.buildContratsBySeanceId(rawSeanceProfs);

  // 5) dépendances depuis menuStore
  const coursList: Cours_VM[] = this.menuStore.getCours(this.store.saison_active_id())?.value ?? [];
  const lieuxList: Lieu[] = this.menuStore.getLieux(this.store.public_projet_id())?.value ?? [];
  const profsList: ProfLight_VM[] = this.menuStore.getProfs(this.store.saison_active_id())?.value ?? [];

  const coursById = new Map<number, Cours_VM>(coursList.map(c => [c.id, c]));
  const lieuxById = new Map<number, Lieu>(lieuxList.map(l => [l.id, l]));
  const profsByContratId = new Map<number, ProfLight_VM>(profsList.map(p => [p.contrat_id, p]));

  // 6) map Seance -> Seance_VM
  const seanceVMs: Seance_VM[] = mapSeanceListToVM(seances, {
    coursById,
    lieuxById,
    profsByContratId,
    contratsBySeanceId,
  });
  const seanceVmById = new Map<number, Seance_VM>(seanceVMs.map(s => [s.id, s]));

  // 7) injecter les Seance_VM dans retour
  for (const a of retour) {
    for (const ms of a.mes_seances) {
      const vm = seanceVmById.get(ms.seance.id);
      if (vm) ms.seance = vm;
    }
  }

  return retour;
}
private buildIdList<T>(items: T[], getter: (x: T) => number | null | undefined): number[] {
  return Array.from(new Set(items.map(getter).filter((x): x is number => typeof x === 'number' && !isNaN(x))));
}

private buildContratsBySeanceId(rows: SeanceProfesseur_Light[]): Map<number, number[]> {
  const map = new Map<number, number[]>();

  for (const r of rows) {
    const arr = map.get(r.seance_id);
    if (arr) arr.push(r.professeurcontract_id);
    else map.set(r.seance_id, [r.professeurcontract_id]);
  }

  // dédoublonnage safe
  for (const [sid, arr] of map) {
    map.set(sid, Array.from(new Set(arr)));
  }

  return map;
}

copierDansPressePapier(texte: string): void {
    const errorService = ErrorService.instance;
  navigator.clipboard.writeText(texte).then(() => {    
    // Optionnel : Afficher un message, toast ou console.log
          const o = errorService.OKMessage($localize`Adresse copiée :` + texte);
      errorService.emitChange(o);
    console.log( $localize`Adresse copiée :`, texte);
  }).catch(err => {
    console.error( $localize`Erreur de copie`, err);
  });
}
  getadresse(id:number) : string {
    let ad = this.listelieu.find(x => x.id == id) 
    return ad!.nom + " " + ad!.adresse.Street + " " + ad!.adresse.PostCode + " " + ad!.adresse.City
  }
    calculerHeureFin(heure: string, duree: number): string {
  return calculerHeureFin(heure, duree);
}
  nbSeanceInscrit(seance: MesSeances_VM[]): {OK:number, KO:number, aucun:number} {
    let OK = 0;
    let KO = 0;
    let aucun = 0;
    seance.forEach((s) => { 
      if(s.seance.statut == StatutSeance.prévue){
      if(s.statutInscription == null || s.statutInscription == undefined){ 
        aucun++;
      }
      else if (s.statutInscription == "présent") {
        OK++;
      } 
      else if (s.statutInscription == "essai") {
        OK++;
      } 
      else if (s.statutInscription == "absent") {
        KO++;
      } else {
        aucun++;
      }
      }
     
    });

    return {OK, KO, aucun};
  }

  trouverLieu(lieuId: number): string {
    if (this.listelieu) {
      const lieunom = this.listelieu.find((lieu) => +lieu.id === lieuId);
      if(lieunom) {
        return lieunom.nom;
      } else  {
        return $localize`Lieu non trouvé`;
      }
    } // Implémentez la logique pour trouver le professeur à partir de la liste des professeurs
    // que vous pouvez stocker dans une variable
    else {
      return $localize`Lieu non trouvé`;
    }
  }
  Sort( sens: 'NO' | 'ASC' | 'DESC', champ: string, rider: AdherentMenu ) {
    let liste_seance_VM = this.Riders.find(
      (x) => x.id == rider.id
    ).MesSeances;
    switch (champ) {
      case 'nom':
        rider.sort_nom = sens;
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const nomA = a.seance.nom.toUpperCase(); // Ignore la casse lors du tri
          const nomB = b.seance.nom.toUpperCase();
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return rider.sort_nom === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
        
      case 'type':
        rider.sort_nom = "NO";
        rider.sort_date = 'NO';
        rider.sort_lieu = 'NO';
        rider.sort_cours = sens;
        liste_seance_VM.sort((a, b) => {
          const nomA = a.seance.cours_nom;
          const nomB = b.seance.cours_nom;
          let comparaison = 0;
          if (nomA > nomB) {
            comparaison = 1;
          } else if (nomA < nomB) {
            comparaison = -1;
          }

          return rider.sort_cours === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'lieu':
        rider.sort_lieu = sens;
        rider.sort_date = 'NO';
        rider.sort_nom = 'NO';
        rider.sort_cours = 'NO';
        liste_seance_VM.sort((a, b) => {
          const lieuA =a.seance.lieu_nom;           
          const lieuB =b.seance.lieu_nom;   

          // Ignorer la casse lors du tri
          const lieuAUpper = lieuA.toUpperCase();
          const lieuBUpper = lieuB.toUpperCase();

          let comparaison = 0;
          if (lieuAUpper > lieuBUpper) {
            comparaison = 1;
          } else if (lieuAUpper < lieuBUpper) {
            comparaison = -1;
          }

          return rider.sort_lieu === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
      case 'date':
        rider.sort_lieu = 'NO';
        rider.sort_date = sens;
        rider.sort_cours = 'NO';
        rider.sort_nom = 'NO';
        liste_seance_VM.sort((a, b) => {
          let dateA = a.seance.date_seance;
          let dateB = b.seance.date_seance;

          let comparaison = 0;
          if (dateA > dateB) {
            comparaison = 1;
          } else if (dateA < dateB) {
            comparaison = -1;
          }

          return rider.sort_date === 'ASC' ? comparaison : -comparaison; // Inverse pour le tri descendant
        });
        break;
    }
  }
  trouverCours(_s:Seance_VM) : string{
    if(_s.type_seance == "ENTRAINEMENT"){
      return this.listeCours.find(x => x.id == _s.cours).nom || $localize`Cours non trouvé`;
    } else if(_s.type_seance == "MATCH"){
      return $localize`Match`;
    } else if(_s.type_seance == "SORTIE"){
      return $localize`Sortie`;
    } else {
return $localize`Evénement`;
    }
  }

  private refreshRider(rider: AdherentMenu): void {
  // On force Angular à détecter le changement en réaffectant une nouvelle référence
  rider.MesSeances = [...rider.MesSeances];
}

MAJInscription(
  messeance: MesSeances_VM,
  adherentmen: AdherentMenu,
  statut: boolean | null,
  afficher_message: boolean = true
) {
  const errorService = ErrorService.instance;

  const oldStatut = messeance.statutInscription ?? null;

  // UI optimiste
  messeance.statutInscription =
    statut === true ? InscriptionStatus_VM.PRESENT :
    statut === false ? InscriptionStatus_VM.ABSENT :
    undefined;

  this.refreshRider(adherentmen);
  this.cdr.detectChanges();

  const dto: CreateInscriptionSeanceDto = {
    personne_id: adherentmen.id,
    seance_id: messeance.seance.id,
    statut_inscription:
      statut === true ? InscriptionStatus_VM.PRESENT :
      statut === false ? InscriptionStatus_VM.ABSENT :
      null,
    statut_seance:
      messeance.statutPrésence === 'absent' ? SeanceStatus_VM.ABSENT :
      messeance.statutPrésence === 'présent' ? SeanceStatus_VM.PRESENT :
      null,
  };

  const statut_text =
    statut === true ? $localize`présent` :
    statut === false ? $localize`Absent` :
    $localize`Indéfini`;

  this.action =
    $localize`Nouveau statut d'inscription de ` +
    adherentmen.libelle +
    ` : ` +
    statut_text +
    ` pour la séance ` +
    messeance.seance.nom;

  this.inscription_seance_serv.maj(dto)
    .then(() => {
      const o = errorService.OKMessage(this.action);
      if (afficher_message) errorService.emitChange(o);
    })
    .catch((err) => {
      const o = errorService.CreateError(this.action, err?.message ?? err);
      errorService.emitChange(o);

      // rollback UI
      messeance.statutInscription = oldStatut ?? undefined;
      this.refreshRider(adherentmen);
      this.cdr.detectChanges();
    });
}

  async MAJInscriptionAffichee(rider: AdherentMenu, statut: boolean) {
     const errorService = ErrorService.instance;
    const seancesAffichees = this.multifiltersPipe.transform(rider.MesSeances, rider.filters);

  for (const ms of seancesAffichees) {
    await this.MAJInscription(ms, rider, statut, false);
  }
     this.action = $localize`Mettre à jour l'inscription : ` + rider.libelle + " " + (statut ? $localize`Présent` : $localize`Absent`);
            let o = errorService.OKMessage(this.action);
            errorService.emitChange(o);


  }
  GotoSeance(id : number){
    this.router.navigate(['/seance'], { queryParams: { id: id } });
  }

  Voir(id: number) {
    this.router.navigate(['/adherent'], { queryParams: { id: id } });
  }

  ReinitFiltre(adh: AdherentMenu) {
    adh.filters = new FilterMenu();
  }

  VoirMaSeance(seance: Seance_VM) {
    this.router.navigate(['/ma-seance'], {
      queryParams: { id: seance.id },
    });
  }

 
private boundOnContentScroll = this.onContentScroll.bind(this);

ngAfterViewInit(): void {
  this.bindScrollContainer();
}

private bindScrollContainer(): void {
  setTimeout(() => {
    const el = this.scrollableContent?.nativeElement;
    if (!el) return;

    el.removeEventListener('scroll', this.boundOnContentScroll);
    el.addEventListener('scroll', this.boundOnContentScroll);

    this.onContentScroll();
  });
}

onContentScroll(): void {
  const el = this.scrollableContent?.nativeElement;
  if (!el) {
    this.showScrollToTop = false;
    return;
  }

  const scrollTop = el.scrollTop || 0;
  this.showScrollToTop = scrollTop > 200;
}

scrollToTop(): void {
  const el = this.scrollableContent?.nativeElement;
  if (!el) return;

  el.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}
  AfficherProfil(_t17: AdherentMenu) {
  for (const r of this.Riders) {
    if (r.id == _t17.id && r.profil == _t17.profil) {
      r.afficher = !r.afficher;
    } else {
      r.afficher = false;
    }
  }

  this.cdr.detectChanges();
  this.bindScrollContainer();
}
    toggleContactClub(): void {
    this.showContactClub = !this.showContactClub;

    // si on ferme -> on nettoie
    if (!this.showContactClub) {
      this.contactClubMessage = '';
    }
  }

  annulerContactClub(): void {
    this.showContactClub = false;
    this.contactClubMessage = '';
  }

  envoyerContactClub(): void {
    const msg = (this.contactClubMessage || '').trim();
    const errorService = ErrorService.instance;

    if (!msg) {
      errorService.emitChange(
        errorService.CreateError($localize`Contacter le club`, $localize`Le message est vide.`)
      );
      return;
    }

    // TODO: tu branches ton service ici (tu m’as dit que tu gères)
    // ex: this.contactService.send(msg)

    errorService.emitChange(errorService.OKMessage($localize`Message prêt à être envoyé.`));

    // Option UX: on ferme après envoi
    this.annulerContactClub();
  }

}
export class FilterMenu {
  private _filter_date_apres: Date | null = null;
  get filter_date_apres(): Date | null {
    return this._filter_date_apres;
  }
  set filter_date_apres(value: Date | null) {
    this._filter_date_apres = value;
    this.onFilterChange();
  }

  private _filter_date_avant: Date | null = null;
  get filter_date_avant(): Date | null {
    return this._filter_date_avant;
  }
  set filter_date_avant(value: Date | null) {
    this._filter_date_avant = value;
    this.onFilterChange();
  }

  private _filter_nom: string | null = null;
  get filter_nom(): string | null {
    return this._filter_nom;
  }
  set filter_nom(value: string | null) {
    this._filter_nom = value;
    this.onFilterChange();
  }

  private _filter_cours: string | null = null;
  get filter_cours(): string | null {
    return this._filter_cours;
  }
  set filter_cours(value: string | null) {
    this._filter_cours = value;
    this.onFilterChange();
  }

  private _filter_groupe: string | null = null;
  get filter_groupe(): string | null {
    return this._filter_groupe;
  }
  set filter_groupe(value: string | null) {
    this._filter_groupe = value;
    this.onFilterChange();
  }

  private _filter_lieu: string | null = null;
  get filter_lieu(): string | null {
    return this._filter_lieu;
  }
  set filter_lieu(value: string | null) {
    this._filter_lieu = value;
    this.onFilterChange();
  }

  private _filter_statut: StatutSeance | null = StatutSeance.prévue;
  get filter_statut(): StatutSeance | null {
    return this._filter_statut;
  }
  set filter_statut(value: StatutSeance | null) {
    this._filter_statut = value;
    this.onFilterChange();
  }

  private _filter_prof: string | null = null;
  get filter_prof(): string | null {
    return this._filter_prof;
  }
  set filter_prof(value: string | null) {
    this._filter_prof = value;
    this.onFilterChange();
  }

  private onFilterChange(): void {
    // Logic to handle filter changes
  }
}
function uniqNumbers(arr: (number | null | undefined)[]): number[] {
  return Array.from(new Set(arr.filter((x): x is number => typeof x === 'number' && !isNaN(x))));
}