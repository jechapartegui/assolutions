import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'flux_financier' })
export class FluxFinancierEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'text' })
  destinataire: string;

  @Column({ type: 'boolean' })
  recette: boolean;

  @Column({ type: 'int' })
  statut: number;

  @Column({ type: 'double precision' })
  montant: number;

  @Column({ type: 'text', nullable: true })
  info: string | null;

  @Column({ type: 'int' })
  project_id: number;

  @Column({ type: 'int' })
  saison_id: number;

  @Column({ type: 'int' })
  classe_comptable: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  type_frais: string | null;
}
