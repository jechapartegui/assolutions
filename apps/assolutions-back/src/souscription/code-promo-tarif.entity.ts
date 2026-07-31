import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'code_promo_tarif' })
export class CodePromoTarifEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  code_promo_id: number;

  @Column({ type: 'int' })
  tarif_inscription_id: number;
}
