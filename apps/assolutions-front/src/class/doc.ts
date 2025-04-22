export class Doc{
    public id:number = 0;
    public titre:string="";
    public document:any;
    public date_import:Date;
    public link:item_lie[] = [];
}

export class item_lie{
    public object_id:number;
    public object_type:"rider" |"prof" | "lieu"|"compte"|"facture"|"flux_fin"|"paiement";
}