import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Project } from './projet.entity';


@Entity({ name: 'addinfo' })
export class AddInfo {
@PrimaryGeneratedColumn()
id: number;


@Column({ name: 'object_id', type: 'int' })
objectId: number; // 0 = definition row (LV)


@Column({ name: 'object_type', type: 'varchar', length: 50 })
objectType: string;


@Column({ name: 'value_type', type: 'varchar', length: 50 })
valueType: string; // for LV: the code (e.g., '601')


@Column({ name: 'text', type: 'text' })
text: string; // label or free text


@Column({ name: 'project_id', type: 'int', nullable: true })
projectId?: number | null;

@ManyToOne(() => Project, { nullable: true })
@JoinColumn({ name: 'project_id' })
project?: Project | null;
}