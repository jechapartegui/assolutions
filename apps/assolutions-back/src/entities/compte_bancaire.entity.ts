import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Person } from './personne.entity';


@Entity({ name: 'compte_bancaire' })
export class BankAccount {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'project_id', type: 'int' })
projectId: number;


@Column({ name: 'nom', type: 'varchar', length: 255 })
name: string;


@Column({ name: 'type', type: 'varchar', length: 255 })
type: string; // Banque, Plateforme, …


@Column({ name: 'info', type: 'text', nullable: true })
info?: string | null;


@Column({ name: 'actif', type: 'boolean', default: true })
active: boolean;


// additions
@Column({ name: 'iban', type: 'varchar', length: 34, nullable: true })
iban?: string | null;


// carte: free JSON (brand, last4, expiry, etc.)
@Column({ name: 'carte_json', type: 'text', nullable: true })
cardJson?: string | null;

@Column({ name: 'carte_titulaire', type: 'int', nullable: true }) cardHolder: number | null;
@ManyToOne(()=>Person)
@JoinColumn({name:'carte_titulaire'}) Person:Person

}