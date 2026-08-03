import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'dossier_personne_saison' })
export class DossierPersonneSaisonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  personne_id: number;

  @Column({ type: 'varchar', length: 30, default: 'LOISIR' })
  type_licence: 'LOISIR' | 'COMPETITION';

  @Column({ type: 'timestamp', nullable: true })
  informations_validees_at: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  donnees_personne_snapshot: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  inscription_complete: boolean;

  @Column({ type: 'boolean', default: false })
  licence_eligible: boolean;

  @Column({ type: 'timestamp', default: () => 'now()' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  updated_at: Date | null;
}
