import { ItemContact } from "@shared/lib/personne.interface";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from "typeorm";
import { Account } from "./compte.entity";
import { RegistrationSeason } from "./inscription-saison.entity";
import { RegistrationSession } from "./inscription-seance.entity";
import { Professor } from "./professeur.entity";

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
  birthDate: Date;

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

    @OneToMany(() => RegistrationSeason, insc => insc.person)
    inscriptions?: RegistrationSeason[];

    @OneToMany(() => RegistrationSession, (insc) => insc.person)
inscriptionsSeance?: RegistrationSession[];

  @OneToOne(() => Professor, prof => prof.person)
  professor?: Professor;  // optionnel : la personne peut ne pas être prof

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'date_creation' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'date_maj' })
  updatedAt: Date;
}
