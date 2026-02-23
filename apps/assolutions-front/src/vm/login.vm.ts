import { ValidationItem } from "@shared/index";
import { AppMode, Compte,  ProjetView } from "@shared/lib/compte.interface";

export class Login_VM{
    constructor(){
        this.compte = {login:"", password:null} as Compte;
    }
    public compte:Compte;
    public confirm_password:string;
    public mdp_requis: boolean = false;
    public isLoginValid:boolean = false;;
    public isPasswordValid:boolean = false;
    public isValid:boolean = false;
    public creer_compte:boolean = false;
    public mode:AppMode;
    public projets:ProjetView[] = [];    
    public projets_select: ProjetView = null;
    public check_login:ValidationItem = {key:false, value:""};
   
}


export class Login_Projet_VM {
    public Login:string;
    public Password:string;
    public isLoginValid:boolean;
    public isPasswordValid:boolean;
    public isValid:boolean;

    
}