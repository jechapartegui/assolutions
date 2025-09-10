import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Season } from './saison.entity';
import { Project } from './projet.entity';


@Entity({ name: 'flux_financier' })
export class FinancialFlow {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'libelle', type: 'varchar', length: 255 })
label: string;


@Column({ name: 'date', type: 'date' })
date: Date; // YYYY-MM-DD


@Column({ name: 'classe_comptable', type: 'varchar', length: 255 })
accountingClass: string; // LV_COMPTE_FR code (e.g., '645')


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


@Column({ name: 'project_id', type: 'int' }) projectId: number;
@ManyToOne(()=>Project)
@JoinColumn({name:'project_id'}) project:Project

// optional season link
@Column({ name: 'saison_id', type: 'int' })   seasonId: number;
  @ManyToOne(() => Season)
  @JoinColumn({ name: 'saison_id' })
  season: Season;
}