import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'lien_groupe' })
export class LinkGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'groupe_id' })
  groupId: number;

  @Column({ name: 'object_id' })
  objectId: number;

  @Column({ length: 50, name: 'object_type' })
  objectType: string; // 'cours' | 'seance' | 'personne'

  @CreateDateColumn({ name: 'date_creation', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamp with time zone' })
  updatedAt: Date;
}