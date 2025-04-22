export class  MailData
{
    public subject : string;
    public to: string;
    public content: string;

    public id: number;
    public liste_to : string[];
    public envoye:boolean;
    public date_envoi:Date;
    public plusieurs_destinataire:boolean;
    public envoi_OK:boolean;
}