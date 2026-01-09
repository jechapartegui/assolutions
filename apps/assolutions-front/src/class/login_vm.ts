import { ValidationItem } from "@shared/index";
import { AppMode, Compte_VM, ProjetView } from "@shared/lib/compte.interface";

export class Login_VM{
    public compte:Compte_VM;
    public Login:string;
    public Password:string;
    public confirm_password:string;
    public mdp_requis:boolean;
    public isLoginValid:boolean;
    public isPasswordValid:boolean;
    public isValid:boolean;
    public creer_compte:boolean = false;
    public mode:AppMode;
    public projets:ProjetView[] = [];
    public check_login:ValidationItem = {key:false, value:""};

    
}


export class Login_Projet_VM{
    public Login:string;
    public Password:string;
    public isLoginValid:boolean;
    public isPasswordValid:boolean;
    public isValid:boolean;

    
}