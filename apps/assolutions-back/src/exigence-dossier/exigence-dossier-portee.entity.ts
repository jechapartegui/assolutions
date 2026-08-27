import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'exigence_dossier_portee' })
export class ExigenceDossierPorteeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  exigence_id: number;

  @Column({ type: 'varchar', length: 30 })
  type_portee: 'GENERAL' | 'GROUPE' | 'TARIF' | 'TYPE_LICENCE';

  @Column({ type: 'int', nullable: true })
  cible_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cible_code: string | null;

  /**
   * Quand la valeur est nulle, la portée hérite du paramétrage de l'exigence.
   * Cela permet de conserver intégralement le comportement des exigences déjà
   * existantes tout en rendant une exigence plus stricte sur un groupe ou une
   * licence particuliers.
   */
  @Column({ type: 'boolean', nullable: true })
  obligatoire_override: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  bloquante_override: boolean | null;
}
