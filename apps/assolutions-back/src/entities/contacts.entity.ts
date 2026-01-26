import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

/**
 * Représente un contact rattaché à un objet (object_type + object_id).
 */
@Entity({ name: 'contacts' })
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  /** Type d'objet parent (ex: 'project', 'adherent', etc.) */
  @Column({ length: 50, name: 'object_type' })
  objectType: string;

  /** Identifiant de l'objet parent */
  @Column({ name: 'object_id' })
  objectId: number;

  /** Type de contact (ex: 'email', 'tel', etc.) */
  @Column({ length: 50, name: 'contact_type' })
  contactType: string;

  /** Valeur du contact */
  @Column({ type: 'character varying', nullable: true, name: 'contact_value' })
  contactValue?: string | null;

  /** Diffusion (opt-in) */
  @Column({ type: 'boolean', nullable: true, name: 'diffusion' })
  diffusion?: boolean | null;
  
  /** Diffusion (opt-in) */
  @Column({ type: 'boolean', name: 'pref' })
  pref?: boolean | null;

  /** Liste / catégorie de contacts */
  @Column({ type: 'character varying', default: 'liste_contact', name: 'contact_list' })
  contactList: string;
  
  /** Valeur du contact */
  @Column({ type: 'character varying', nullable: true, name: 'info' })
  info?: string | null;

}
