export interface KeyValuePair {
  key: number | string;
  value: string;
}
export interface KeyValuePairAny {
  key: any;
  value: any;
}
export interface ItemList{
  id:number;
  libelle:string;
  objet:"RIDER"|"SEANCE"|"LIEU";
}