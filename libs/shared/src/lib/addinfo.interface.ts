export class AddInfo_VM {
id = 0;
object_id = 0;
object_type!: string; // e.g., 'LV_COMPTE_FR', 'LV_stock_FR', 'riders', ...
value_type!: string; // e.g., '601'
text!: string; // label
project_id:number | null;
}

export interface AddInfo {
  id: number;

  object_id: number;
  object_type: string;   // max 50 côté back
  value_type: string;    // max 50 côté back
  text: string;

  /**
   * Reco: si tu appliques Option A (DTO sans project_id),
   * tu peux garder ce champ dans le model retourné par l’API (si ta table l’a),
   * mais tu ne l’envoies pas au create/update.
   */
  project_id?: number | null;
}

export type CreateAddInfoDto = Omit<AddInfo, 'id'>;
export type UpdateAddInfoDto = Partial<Omit<AddInfo, 'id'>>;
