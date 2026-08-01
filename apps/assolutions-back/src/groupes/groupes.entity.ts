import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'groupes' })
export class GroupesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'varchar', length: 250, nullable: true })
  whatsapp: string | null;

  @Column({ type: 'boolean', nullable: true })
  visible: boolean | null;

  /**
   * Compatibilité temporaire avec le contexte du tunnel.
   * Ce champ n'est volontairement PAS une colonne : aucun groupe n'est imposé.
   */
  readonly par_defaut = false;

  @Column({ type: 'int', nullable: true })
  age_min: number | null;

  @Column({ type: 'int', nullable: true })
  age_max: number | null;

  @Column({ type: 'int', nullable: true })
  naissance_avant: number | null;

  @Column({ type: 'int', nullable: true })
  naissance_apres: number | null;

  @Column({ type: 'int', nullable: true })
  limit_nb: number | null;
}
