import { Adresse } from "./adresse.interface";
import { corelistobject } from "./corelistobject.interface";

export class Lieu_VM extends corelistobject {
    adresse: Adresse = new Adresse();
}