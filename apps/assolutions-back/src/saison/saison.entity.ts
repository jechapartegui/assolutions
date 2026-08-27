import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'saison' })
export class SaisonEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  nom: string;

  @Column({ type: 'boolean', default: false })
  active: boolean;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'date' })
  date_debut: string;

  @Column({ type: 'date' })
  date_fin: string;

  @Column({ type: 'int' })
  saison_precedente: number;

  /**
   * false : l'adhérent choisit d'abord ses groupes, puis un tarif compatible.
   * true  : l'adhérent choisit d'abord son tarif, puis les groupes accessibles.
   */
  @Column({ type: 'boolean', default: false })
  tarif_avant_groupes: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;
}
