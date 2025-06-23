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