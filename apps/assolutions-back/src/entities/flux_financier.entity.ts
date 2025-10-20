import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Season } from './saison.entity';
import { Project } from './projet.entity';
import { Operation } from './operation.entity';


@Entity({ name: 'flux_financier' })
export class FinancialFlow {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'libelle', type: 'varchar', length: 255 })
label: string;


@Column({ name: 'date', type: 'date' })
date: Date; // YYYY-MM-DD


@Column({ name: 'classe_comptable', type: 'int', nullable: false })
accountingClass: number;

@Column({ name: 'type_frais', type: 'varchar', length: 255, nullable: true  })
type_flow: string; // LV_TYPE_ACHAT code (e.g., 'Cotisation')


@Column({ name: 'destinataire', type: 'text' })
recipient: string; // JSON link { type, id, value }


@Column({ name: 'recette', type: 'boolean' })
isIncome: boolean;


@Column({ name: 'statut', type: 'int' })
status: number; // LV if desired

@Column({ name: 'montant', type: 'float' })
amount: number;


@Column({ name: 'info', type: 'text', nullable: true })
info?: string | null;

 @OneToMany(() => Operation, op => op.financialFlow, {
    cascade: ['insert', 'update'],
    orphanedRowAction: 'delete',
  })
  operations: Operation[];


@Column({ name: 'project_id', type: 'int' }) projectId: number;
@ManyToOne(()=>Project)
@JoinColumn({name:'project_id'}) project:Project

// optional season link
@Column({ name: 'saison_id', type: 'int' })   seasonId: number;
  @ManyToOne(() => Season)
  @JoinColumn({ name: 'saison_id' })
  season: Season;
} 