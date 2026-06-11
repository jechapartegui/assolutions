import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'document' })
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @Column({ type: 'int' })
  objet_id: number;

  @Column({ type: 'varchar', length: 25 })
  objet_type: string;

  @Column({ type: 'varchar', length: 25 })
  typedoc: string;

  @Column({ type: 'bytea', nullable: true })
  file_data: Buffer | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  file_path: string | null;

  @Column({ type: 'enum', enumName: 'document_storage_type_enum' } as any)
  storage_type: string;

  @Column({ type: 'varchar', length: 255 })
  mimetype: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  date_import: Date;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  auteur: string | null;

  @Column({ type: 'int', nullable: true })
  project_id: number | null;
}