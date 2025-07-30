import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Account } from "./compte.entity";

@Entity({ name: 'note' })
export class Notes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'account_id' })
    UserId: number;
    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    User: Account;

  @Column({ name: 'object_id' })
  objectId: number;

  @Column({ length: 50, name: 'object_type' })
  objectType: string; // 'cours' | 'seance' | 'personne'

  @CreateDateColumn({ name: 'date_creation', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamp with time zone' })
  updatedAt: Date;
}