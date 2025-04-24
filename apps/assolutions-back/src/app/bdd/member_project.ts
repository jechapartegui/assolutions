import {  Entity, PrimaryColumn } from "typeorm";

@Entity('member_project') // nom exact de ta table
export class AdherentProjet {
  @PrimaryColumn()
  member_id: number;
  @PrimaryColumn()
  project_id: number;

}
