import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Course } from "./cours.entity";
import { ProfessorContract } from "./contrat_prof.entity";
@Entity({ name: 'cours_professeur' })
export class CourseProfessor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cours_id' })
  courseId: number;
@ManyToOne(() => Course, course => course.professors, {
  onDelete: 'CASCADE',           // <-- ajoute cette option
  createForeignKeyConstraints: true
})
  @JoinColumn({ name: 'cours_id' })
  course: Course;

/** Référence vers le contrat de professeur */
  @Column({ name: 'contrat_id' })
  contractId: number;
  @ManyToOne(() => ProfessorContract, (contract) => contract.id)
  @JoinColumn({ name: 'contrat_id' })
  contract: ProfessorContract;


  @CreateDateColumn({ name: 'date_creation', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamp with time zone' })
  updatedAt: Date;
}