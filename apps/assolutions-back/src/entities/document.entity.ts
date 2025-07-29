import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';


export enum StorageType {
  DATABASE = 'DB',
  FILESYSTEM = 'FS',
}

@Entity({ name: 'document' })
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  titre: string;

  @Column({ name: 'objet_id', type: 'int' })
  objetId: number;

  @Column({ name: 'objet_type', type: 'varchar', length: 25 })
  objetType: string;

  @Column({ type: 'varchar', length: 25 })
  typedoc: string;

  @Column({ name: 'file_data', type: 'bytea', nullable: true })
  fileData?: Buffer;

  @Column({ name: 'file_path', type: 'varchar', length: 255, nullable: true })
  filePath?: string;

  @Column({ name: 'storage_type', type: 'enum', enum: StorageType })
  storageType: StorageType;

  @Column({ type: 'varchar', length: 255 })
  mimetype: string;

  @UpdateDateColumn({ name: 'date_import', type: 'timestamp with time zone' })
  dateImport: Date;

  
  @Column({ type: 'text', nullable: true })
  commentaire?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  auteur?: string;
}
