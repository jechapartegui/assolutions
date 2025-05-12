import {  Entity, PrimaryColumn } from "typeorm";

@Entity('professeur_saison')
export class ProfesseurSaison {
  @PrimaryColumn()
  rider_id: number;

  @PrimaryColumn()
  saison_id: number;
}
