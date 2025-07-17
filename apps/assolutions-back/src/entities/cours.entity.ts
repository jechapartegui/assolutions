import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Season } from "./saison.entity";
import { Location } from "./lieu.entity";
import { Project } from "./projet.entity";
import { CourseProfessor } from "./cours_professeur.entity";
import { Session } from "./seance.entity";
import { LinkGroup } from "./lien_groupe.entity";

@Entity({ name: 'cours' })
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'project_id' })
  projectId: number;
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ length: 255, name: 'nom' })
  name: string;

  @Column({ length: 20, name: 'jour_semaine' })
  weekDay: string;

  @Column({ length: 10, name: 'heure' })
  time: string;

  @Column({ type: 'int', name: 'duree' })
  duration: number;

  @Column({ name: 'prof_principal_id' })
  mainProfessorId: number;

  @Column({ name: 'lieu_id' })
  locationId: number;
  @ManyToOne(() => Location)
  @JoinColumn({ name: 'lieu_id' })
  location: Location;

  @Column({ nullable: true, name: 'age_minimum', type: 'int' })
  minAge?: number;
  @Column({ nullable: true, name: 'age_maximum', type: 'int' })
  maxAge?: number;

  @Column({ name: 'saison_id' })
  seasonId: number;
  @ManyToOne(() => Season)
  @JoinColumn({ name: 'saison_id' })
  season: Season;

  @Column({ nullable: true, name: 'place_maximum', type: 'int' })
  maxPlaces?: number;

  @Column({ type: 'boolean', default: false, name: 'convocation_nominative' })
  nominativeCall: boolean;
  @Column({ type: 'boolean', default: false, name: 'afficher_present' })
  showAttendance: boolean;

  @OneToMany(() => CourseProfessor, cp => cp.course, {
  cascade: ['remove'],          // <-- permet à `remove()` de supprimer les orphelins
})
  professors: CourseProfessor[];
  
  @CreateDateColumn({ name: 'date_creation', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'date_maj', type: 'timestamp with time zone' })
  updatedAt: Date;

 groups?: LinkGroup[];

    @OneToMany(() => Session, s => s.course, { cascade: true })
  sessions?: Session[];
}
