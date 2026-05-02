import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'project' })
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nom: string;

  @Column({ type: 'boolean', default: false })
  actif: boolean;
  
  @Column({ type: 'boolean', default: true })
  public: boolean;

  @Column({ type: 'date' })
  date_debut: string; // date -> string 'YYYY-MM-DD' (simple & fiable)

  @Column({ type: 'date' })
  date_fin: string;

  @Column({ type: 'jsonb', nullable: true })
  contact: any | null;

  @Column({ type: 'jsonb', nullable: true })
  adresse: any | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  activite: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  lang: string | null;

  @Column({ type: 'text', nullable: true })
  logo: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  couleur: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  login: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_creation: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_maj: Date;

  @Column({ type: 'text', nullable: true })
  activation_token: string | null;

  // FK vers compte(id) : colonne s'appelle "compte" en DB
  @Column({ type: 'int' })
  compte: number;
}
