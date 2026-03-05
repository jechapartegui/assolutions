// lieu.interface.ts
import { Adresse } from './adresse.interface'; // adapte le chemin

export interface Lieu {
  id: number;
  project_id: number;
  nom: string;
  adresse: string;     // en back c'est string
  public?: boolean;
}

// VM: même modèle, sans project_id, et adresse typée Adresse
export type Lieu_VM = Omit<Lieu, 'project_id' | 'adresse'> & {
  adresse: Adresse;
};

// ---- Mappers ----

// ⚠️ adapte ici selon le format réel de "adresse" (JSON string vs texte libre)
export function parseAdresse(adresseRaw: string): Adresse {
  // Cas 1: string JSON {"..."} -> parse
  if (adresseRaw?.trim()?.startsWith('{')) {
    try {
      const obj = JSON.parse(adresseRaw);
      return Object.assign(new Adresse(), obj);
    } catch {
      // si le JSON est invalide, on retombe sur un fallback
      return new Adresse();
    }
  }

  // Cas 2: texte libre -> tu peux choisir comment tu le ranges
  const adr = new Adresse();
  // Exemple minimal : tu stockes tout dans une propriété "raw" si tu en as une
  // (sinon remplace par la/les propriétés existantes)
  (adr as any).raw = adresseRaw;
  return adr;
}

export function mapLieuToVM(lieu: Lieu): Lieu_VM {
  return {
    id: lieu.id,
    nom: lieu.nom,
    public: lieu.public,
    adresse: parseAdresse(lieu.adresse),
  };
}

export function mapLieuxToVM(lieux: Lieu[]): Lieu_VM[] {
  return lieux.map(mapLieuToVM);
}
export type CreateLieuDto = Omit<Lieu, 'id' | 'project_id'>;
export type UpdateLieuDto = Partial<Omit<Lieu, 'id' | 'project_id'>>;
