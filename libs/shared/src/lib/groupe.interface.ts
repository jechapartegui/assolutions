export class LienGroupe_VM {
  key(key: any) {
    throw new Error('Method not implemented.');
  }
  id: number;
  nom: string;
  id_lien: number;

  constructor(id: number, nom: string, id_lien: number) {
    this.id = id;
    this.nom = nom;
    this.id_lien = id_lien;
  }
}

export class Groupe_VM {
  id: number;
  nom: string;
  saison_id: number;
  // Lien vers les groupes
  groupes?: LienGroupe_VM[];

  constructor(id: number, nom: string, saison_id: number) {
    this.id = id;
    this.nom = nom;
    this.saison_id = saison_id;
  }
}