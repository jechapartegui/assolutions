import { Entity, PrimaryColumn } from "typeorm";

@Entity('gestionnaire_projet')
export class GestionnaireProjet {
  @PrimaryColumn()
  project_id: number;

  @PrimaryColumn()
  rider_id: number;
}
