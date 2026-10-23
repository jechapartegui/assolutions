import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  Calendrier, CalendrierApiService,
  MesCalendriersEvenement, MesCalendriersPersonne,
} from '../../services/calendrier-api.service';

@Component({
  selector: 'app-mes-calendriers',
  templateUrl: './mes-calendriers.component.html',
  styleUrls: ['./mes-calendriers.component.css'],
  standalone: false,
})
export class MesCalendriersComponent implements OnInit {
  loading = false;
  error = '';
  info = '';
  showPast = false;
  calendriers: Calendrier[] = [];
  evenements: MesCalendriersEvenement[] = [];
  reponsesEnCours = new Set<string>();

  constructor(
    private readonly service: CalendrierApiService,
    private readonly router: Router,
  ) {}

  async ngOnInit() { await this.recharger(); }

  private aujourdhui(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const j = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + j;
  }

  get totalEvenements() {
    return this.evenements.filter((e) => this.showPast ||
      e.date_seance >= this.aujourdhui()).length;
  }

  evenementsDuCalendrier(id: number): MesCalendriersEvenement[] {
    const dateMin = this.aujourdhui();
    return this.evenements.filter((e) => e.calendrier_id === id &&
      (this.showPast || e.date_seance >= dateMin));
  }

  dateFr(value: string): string {
    const iso = String(value ?? '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4)
      : iso;
  }

  heureFin(e: MesCalendriersEvenement): string {
    const heure = String(e.heure_debut ?? '').slice(0, 5);
    const [h, m] = heure.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
    const total = h * 60 + m + Number(e.duree_seance || 0);
    return String(Math.floor(total / 60) % 24).padStart(2, '0') +
      ':' + String(total % 60).padStart(2, '0');
  }

  typeLabel(type: string): string {
    const values: Record<string, string> = {
      ENTRAINEMENT: 'Entraînement',
      MATCH: 'Match',
      SORTIE: 'Sortie',
      EVENEMENT: 'Événement',
    };
    return values[type] || type || 'Séance';
  }

  libelleReponse(value: string | null): string {
    switch (value) {
      case 'présent': return 'Oui';
      case 'absent': return 'Non';
      case 'convoqué': return 'Convoqué';
      case 'essai': return 'Essai';
      default: return 'Sans réponse';
    }
  }

  cleReponse(seanceId: number, personneId: number): string {
    return seanceId + '/' + personneId;
  }

  async recharger() {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      const [calendriers, evenements] = await Promise.all([
        this.service.mes(), this.service.mesEvenements(),
      ]);
      this.calendriers = calendriers;
      this.evenements = evenements;
    } catch (e: any) {
      this.error = String(e?.message || e || 'Impossible de charger les calendriers.');
    } finally {
      this.loading = false;
    }
  }

  async repondre(
    evenement: MesCalendriersEvenement,
    personne: MesCalendriersPersonne,
    statut: 'présent' | 'absent',
  ) {
    if (!evenement.peut_repondre) return;
    const key = this.cleReponse(evenement.seance_id, personne.id);
    if (this.reponsesEnCours.has(key)) return;
    this.reponsesEnCours.add(key);
    this.error = '';
    this.info = '';
    try {
      const result = await this.service.repondreEvenement(
        evenement.seance_id, personne.id, statut,
      );
      personne.statut_inscription = result.statut_inscription;
      this.info = 'Réponse ' + (statut === 'présent' ? 'Oui' : 'Non') +
        ' enregistrée pour ' + personne.nom + ' dans Assolutions.';
    } catch (e: any) {
      this.error = 'Réponse non enregistrée : ' + String(e?.message || e);
    } finally {
      this.reponsesEnCours.delete(key);
    }
  }

  ouvrirSeance(id: number) {
    void this.router.navigate(['/ma-seance'], { queryParams: { id } });
  }
}
