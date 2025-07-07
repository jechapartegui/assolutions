import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Season } from './saison.entity';
import { Person } from './personne.entity';

@Entity({ name: 'inscription_saison' })
export class InscriptionSaison {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'saison_id', type: 'int' })
  saisonId: number;

  @ManyToOne(() => Season, saison => saison.inscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'saison_id' })
  saison: Season;

  @Column({ name: 'personne_id', type: 'int' })
  personneId: number;

  @ManyToOne(() => Person, person => person.inscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personne_id' })
  person: Person;

  @Column({ name: 'date_inscription', type: 'timestamp with time zone', default: () => 'NOW()' })
  dateInscription: Date;

  @Column({ name: 'active', type: 'boolean', default: true })
  active: boolean;
}
