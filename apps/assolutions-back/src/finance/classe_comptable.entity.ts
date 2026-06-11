import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'classe_comptable' })
export class ClasseComptableEntity {
  @PrimaryGeneratedColumn()
  id: number;

 @Column({ type: 'int', nullable: true })
project_id: number | null;

@Column({ type: 'varchar', length: 5, nullable: true })
pays: string | null;

@Column({ type: 'varchar', length: 5, default: 'fr' })
lang: string;

  @Column({ type: 'int', nullable: true })
  parent_id: number | null;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'boolean' })
  recette: boolean;

  @Column({ type: 'boolean', default: true })
  actif: boolean;

  @Column({ type: 'int', default: 0 })
  ordre: number;
}