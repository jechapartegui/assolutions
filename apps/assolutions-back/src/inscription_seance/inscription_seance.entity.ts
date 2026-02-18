import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'inscription_seance' })
export class InscriptionSeanceEntity {
  @PrimaryColumn({ type: 'int' })
  personne_id: number;

  @PrimaryColumn({ type: 'int' })
  seance_id: number;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_inscription: Date;

  @Column({ type: 'enum', enumName: 'inscription_seance_statut_inscription_enum', nullable: true } as any)
  statut_inscription: string | null;

  @Column({ type: 'enum', enumName: 'inscription_seance_statut_seance_enum', nullable: true } as any)
  statut_seance: string | null;
}
