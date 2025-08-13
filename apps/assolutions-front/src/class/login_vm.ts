import { Compte_VM } from "@shared/src/lib/compte.interface";

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

    
}