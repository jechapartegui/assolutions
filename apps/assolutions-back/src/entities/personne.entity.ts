import { ItemContact } from "@shared/src/lib/personne.interface";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm";
import { Account } from "./compte.entity";
import { InscriptionSaison } from "./inscription-saison.entity";
import { InscriptionSeance } from "./inscription-seance.entity";

@Entity({ name: 'personne' })
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ nullable: true, length: 100 })
  nickname?: string;

  @Column({ type: 'date', name: 'date_naissance' })
  birthDate: string;

  @Column({ type: 'boolean', default: false })
  gender: boolean;

  @Column({ length: 255 })
  address: string;

  // Foreign key referencing Account
  @Column({ name: 'compte' })
  accountId: number;

  @ManyToOne(() => Account, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'compte' })
  account: Account;

  @Column({ type: 'jsonb', nullable: true })
  contacts?: ItemContact[];

  @Column({ type: 'jsonb', nullable: true, name: 'contacts_prevenir' })
  emergencyContacts?: ItemContact[];

    @OneToMany(() => InscriptionSaison, insc => insc.saison)
    inscriptions?: InscriptionSaison[];

        @OneToMany(() => InscriptionSeance, insc => insc.seance)
    inscriptionsSeance?: InscriptionSeance[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}
