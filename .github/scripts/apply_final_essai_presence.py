from pathlib import Path


def patch(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8-sig')
    if old not in text:
        raise RuntimeError(f'Motif introuvable dans {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, count), encoding='utf-8')


# Back : accès normal calculé séance par séance.
path = 'apps/assolutions-back/src/app/mes_seances/mes_seances.query.service.ts'
patch(path, '  est_adherent: boolean;\n  seance_id: number;', '  est_adherent: boolean;\n  acces_inscription: boolean;\n  seance_id: number;')
patch(path, '        pc.est_adherent,\n        s.seance_id,\n        ins.statut_inscription,', '''        pc.est_adherent,
        (
          EXISTS (
            SELECT 1 FROM seances_par_groupes spg
            WHERE spg.personne_id = pc.personne_id
              AND spg.seance_id = s.seance_id
          )
          OR EXISTS (
            SELECT 1 FROM seances_nominatives_inscrites sni
            WHERE sni.personne_id = pc.personne_id
              AND sni.seance_id = s.seance_id
          )
          OR (
            ins.statut_inscription IS NOT NULL
            AND ins.statut_inscription <> 'essai'
          )
        ) AS acces_inscription,
        s.seance_id,
        ins.statut_inscription,''')
patch(path, '        seance: { id: r.seance_id },\n        statutInscription: r.statut_inscription ?? undefined,', '        seance: { id: r.seance_id },\n        accesInscription: r.acces_inscription,\n        statutInscription: r.statut_inscription ?? undefined,')

# Contrats partagés.
path = 'libs/shared/src/lib/mes-seances.interface.ts'
patch(path, '  statutInscription?: InscriptionStatusDto;\n  statutPrésence?: PresenceStatusDto;', '  accesInscription?: boolean;\n  statutInscription?: InscriptionStatusDto;\n  statutPrésence?: PresenceStatusDto;')
patch(path, '  statutInscription: InscriptionStatusDto;\n  statutPrésence: PresenceStatusDto;', '  accesInscription?: boolean;\n  statutInscription: InscriptionStatusDto;\n  statutPrésence: PresenceStatusDto;')

path = 'libs/shared/src/lib/seance.interface.ts'
patch(path, "    statutInscription?: 'présent' | 'absent' | 'convoqué' | 'essai'; // Peut être null -> optionnel\n    statutPrésence?: 'présent' | 'absent';", "    accesInscription?: boolean; // accès normal via groupe, convocation ou inscription existante\n    statutInscription?: 'présent' | 'absent' | 'convoqué' | 'essai'; // Peut être null -> optionnel\n    statutPrésence?: 'présent' | 'absent';")

# Hydratation et mapping.
path = 'apps/assolutions-front/src/repository/menu.repository.ts'
patch(path, '              seanceProfesseurs: profsBySeanceId.get(seance.seance_id) ?? [],\n              statutInscription: ms.statutInscription ?? null,', '              seanceProfesseurs: profsBySeanceId.get(seance.seance_id) ?? [],\n              accesInscription: ms.accesInscription === true,\n              statutInscription: ms.statutInscription ?? null,')

path = 'apps/assolutions-front/src/mapper/menu.mapper.ts'
patch(path, '      seance: seanceVm,\n      statutInscription: ms.statutInscription ?? null,', '      seance: seanceVm,\n      accesInscription: ms.accesInscription === true,\n      statutInscription: ms.statutInscription ?? null,')

# Règle front séance par séance.
path = 'apps/assolutions-front/src/app/menu/menu.component.ts'
patch(path, "      rider?.profil === 'ADH' &&\n      rider.inscrit === false &&\n      !!ms?.seance?.essai_possible &&\n      !ms?.statutInscription", "      rider?.profil === 'ADH' &&\n      ms?.accesInscription !== true &&\n      !!ms?.seance?.essai_possible &&\n      !ms?.statutInscription")
patch(path, "      rider?.profil === 'ADH' &&\n      rider.inscrit === false &&\n      (rider.MesSeances ?? []).some((ms) => this.isEssaiPossible(ms, rider))", "      rider?.profil === 'ADH' &&\n      (rider.MesSeances ?? []).some((ms) => this.isEssaiPossible(ms, rider))")

# Template.
path = 'apps/assolutions-front/src/app/menu/menu.component.html'
patch(path, '<span *ngIf="hasEssaiPossible(personne)" class="rider-trial-hint" title="Non inscrit au club · séances d\'essai disponibles">\n                <i class="fas fa-flask"></i> Essai\n              </span>', '<span *ngIf="hasEssaiPossible(personne)" class="rider-trial-hint" title="Séances d\'essai accessibles">\n                <i class="fas fa-flask"></i><span>Essai disponible</span>\n              </span>')
patch(path, '                              <td>\n                                <ng-container *ngIf="rider.profil == \'PROF\'; else ProfilAdherentDesktop">', '''                              <td>
                                <div class="presence-actions">
                                <button
                                  *ngIf="ms.seance.afficher_present"
                                  type="button"
                                  class="presence-view-btn"
                                  title="Afficher les présents"
                                  (click)="VoirMaSeance(ms.seance)"
                                ><i class="fas fa-binoculars"></i></button>
                                <ng-container *ngIf="rider.profil == 'PROF'; else ProfilAdherentDesktop">''')
patch(path, '                                </ng-template>\n                              </td>', '                                </ng-template>\n                                </div>\n                              </td>', 1)
patch(path, "                                          ms.statutInscription == 'convoqué' ||\n                                          ms.statutInscription == null ||\n                                          ms.statutInscription == 'essai'", "                                          ms.statutInscription == 'convoqué' ||\n                                          (ms.statutInscription == null && !isEssaiPossible(ms, rider)) ||\n                                          ms.statutInscription == 'essai'")
patch(path, '                                <div class="mobile-item-actions">\n                                  <ng-container *ngIf="rider.profil === \'PROF\'; else ProfilAdherentMobile">', '''                                <div class="mobile-item-actions">
                                  <button
                                    *ngIf="ms.seance.afficher_present"
                                    type="button"
                                    class="mobile-action-btn presence-view-btn"
                                    title="Afficher les présents"
                                    (click)="VoirMaSeance(ms.seance)"
                                  ><i class="fas fa-binoculars"></i></button>
                                  <ng-container *ngIf="rider.profil === 'PROF'; else ProfilAdherentMobile">''')
patch(path, "                                          ms.statutInscription == 'essai' ||\n                                          ms.statutInscription == null", "                                          ms.statutInscription == 'essai' ||\n                                          (ms.statutInscription == null && !isEssaiPossible(ms, rider))")

# CSS final.
css = Path('apps/assolutions-front/src/app/menu/menu.component.css')
text = css.read_text(encoding='utf-8-sig')
text += '''

/* Correctif essai / présence : signalétique compacte et alignée */
.rider-trial-hint { display:inline-flex; align-items:center; justify-content:center; gap:.3rem; min-height:1.35rem; margin-top:.15rem; padding:.1rem .45rem; border-radius:999px; background:#fff7dc; color:#725200; font-size:.72rem; line-height:1; white-space:nowrap; }
.presence-actions { display:inline-flex; align-items:center; gap:.25rem; min-height:2.5rem; }
.trial-action-icon, .presence-view-btn { display:inline-flex !important; align-items:center; justify-content:center; width:2.35rem; height:2.35rem; min-width:2.35rem; padding:0; border-radius:999px; vertical-align:middle; }
.trial-action-icon { border:1px solid #f1bd32; background:#fff9e8; }
.presence-view-btn { border:1px solid #c8d5e3; background:#f7f9fb; color:#30475e; cursor:pointer; }
.presence-view-btn:hover { background:#edf3f8; color:#162a3d; }
.trial-status-tag { display:inline-flex; align-items:center; gap:.2rem; vertical-align:middle; line-height:1; }
@media (max-width:1023px) { .rider-trial-hint span { display:none; } .rider-trial-hint { padding:.2rem .35rem; } .mobile-item-actions { align-items:center; } .mobile-item-actions .presence-view-btn, .mobile-item-actions .trial-action-btn { width:2.15rem; height:2.15rem; min-width:2.15rem; } }
'''
css.write_text(text, encoding='utf-8')
