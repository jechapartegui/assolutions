import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './projet.entity';


@Entity({ name: 'stock' })
export class StockItem {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'qte', type: 'float', default: 1 })
quantity: number;


@Column({ name: 'lieu_stockage', type: 'text' })
storagePlace: string; // JSON link { type: 'rider'|'lieu'|..., id, value }


@Column({ name: 'type_stock', type: 'text' })
stockType: string; // LV id as string consistent with your data


@Column({ name: 'valeur_achat', type: 'float', nullable: true })
buyValue?: number | null;


@Column({ name: 'date_achat', type: 'date', nullable: true })
buyDate?: string | null; // YYYY-MM-DD


@Column({ name: 'flux_financier_id', type: 'int', nullable: true })
financialFlowId?: number | null;


@Column({ name: 'libelle', type: 'varchar', length: 255 })
label: string;


@Column({ name: 'info', type: 'text' })
info: string;


@Column({ name: 'project_id', type: 'int' }) projectId: number;
@ManyToOne(()=>Project)
@JoinColumn({name:'project_id'}) project:Project
}