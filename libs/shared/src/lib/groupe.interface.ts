export class LienGroupe_VM {
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
  whatsapp:string;
  display: boolean = false; // Pour l'affichage dans la liste
  // Lien vers les groupes
  groupes?: LienGroupe_VM[];

  constructor(id: number, nom: string, saison_id: number, whatsapp:string) {
    this.id = id;
    this.nom = nom;
    this.saison_id = saison_id;
    this.whatsapp = whatsapp;
  }
}