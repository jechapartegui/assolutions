import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';

@Entity('login_project')
@Unique(['login_id', 'project_id'])
export class LoginProjectEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  login_id: number;

  @Column()
  project_id: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  date_creation: Date;

  @ManyToOne(() => CompteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'login_id' })
  compte: CompteEntity;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;
}