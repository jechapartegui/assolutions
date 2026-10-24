import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'calendrier_groupe' })
export class CalendrierGroupeEntity {
  @PrimaryColumn({ type: 'int' }) calendrier_id: number;
  @PrimaryColumn({ type: 'int' }) groupe_id: number;
  @Column({ type: 'timestamptz', default: () => 'now()' }) date_creation: Date;
}
