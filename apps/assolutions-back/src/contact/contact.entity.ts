import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('contacts')
@Index('idx_contacts_object_type_object_id', ['object_type', 'object_id'])
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  object_type: string;

  @Column({ type: 'integer' })
  object_id: number;

  @Column({ type: 'varchar', length: 50 })
  contact_type: string;

  @Column({ type: 'varchar', nullable: true })
  contact_value?: string | null;

  @Column({ type: 'boolean', nullable: true })
  diffusion?: boolean | null;

  @Column({ type: 'varchar', default: 'liste_contact' })
  contact_list: string;

  @Column({ type: 'varchar', nullable: true })
  info?: string | null;

  @Column({ type: 'boolean' })
  pref: boolean;

  // Renseignés pour contact_type = REPRESENTANT_LEGAL.
  @Column({ type: 'varchar', length: 100, nullable: true })
  nom?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  prenom?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telephone?: string | null;
}