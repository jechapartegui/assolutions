import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'stock' })
export class StockEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'double precision', default: 1 })
  qte: number;

  @Column({ type: 'text' })
  lieu_stockage: string;

  @Column({ type: 'text' })
  type_stock: string;

  @Column({ type: 'double precision', nullable: true })
  valeur_achat: number | null;

  @Column({ type: 'date', nullable: true })
  date_achat: string | null;

  @Column({ type: 'int', nullable: true })
  flux_financier_id: number | null;

  @Column({ type: 'varchar', length: 255 })
  libelle: string;

  @Column({ type: 'text' })
  info: string;

  @Column({ type: 'int' })
  project_id: number;
}
