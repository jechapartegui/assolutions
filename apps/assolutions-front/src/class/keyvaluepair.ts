export class KeyValuePair{
    constructor(key: number, value: string) {
        this.key = key;
        this.value = value;
      }
    public key:number;
    public value:string;
}

export class KeyValuePairAny{
    constructor(key: any, value: any) {
        this.key = key;
        this.value = value;
      }
    public key:any;
    public value:any;
}