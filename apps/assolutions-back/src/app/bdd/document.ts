import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity('document')
export class Document {
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

  @Column({ type: 'blob' })
  document: Buffer;

  @Column({ type: 'date' })
  date_import: Date;

  @Column({ type: 'int' })
  projet: number;
}
