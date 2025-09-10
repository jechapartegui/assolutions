import { FluxFinancier_VM } from "./flux-financier.interface";
import { GenericLink_VM } from "./liens.interface";

export class Stock_VM {
id = 0;
qte = 1;
lieu_stockage!: GenericLink_VM; // parsed storagePlace
type_stock!: string; // LV id as string
valeur_achat?: number | null;
date_achat?: string | null; // YYYY-MM-DD
flux_financier_id?: number | null;
flux_financier?: FluxFinancier_VM;
libelle!: string;
info!: string;
}