import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Compte_VM, ProjetView } from '@shared/src/lib/compte.interface';
import { AccountService } from '../../crud/account.service';
import { Account } from '../../entities/compte.entity';
import { SeasonService } from '../../crud/season.service';
import { MemberService } from '../member/member.services';
import { ProfService } from '../prof/prof.services';
import { QueryFailedError } from 'typeorm';
import { MailerService } from '../mail/mailer.service';


@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    
    private readonly configService: ConfigService,
    private compteserv:AccountService,
    private prof_serv:ProfService,
    private season_serv:SeasonService,
    private member_serv:MemberService,
    public mailer:MailerService
  ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
  }

  async prelogin(login: string): Promise<boolean> {
    //test throw
    const compte = await this.compteserv.getLogin(login);
    if (!compte) {
      throw new UnauthorizedException('NO_ACCOUNT_FOUND');
    }
    if(!compte.isActive){
      throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
    }
   if(compte.password && compte.password.length>0){ 
    return true;
   } else {
    return false;
   }
  }

    async checkToken(login: string, token:string): Promise<boolean> {
  
    const compte = await this.compteserv.getToken(login, token);
   if(compte){
    return true;
   } else {
    return false;
   }
  }

  async validatepassword(login: string, password: string = ""): Promise<Compte_VM> {
    const compte = await this.compteserv.getLogin(login);
  
    if (!compte) {
      throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    }
   if(!compte.isActive){
      throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
    }
    const storedPassword = compte.password;
  
    if (!storedPassword) {
      return to_CompteVM(compte);
    }
  
    const hashed = hashPasswordWithPepper(password, this.pepper);
    if (storedPassword !== hashed) {
      throw new UnauthorizedException('INCORRECT_PASSWORD');
    }
      return to_CompteVM(compte);
  }


  
  async getProjects(compteId: number): Promise<ProjetView[]> {
    // 1. Récupère les adhérents liés au compte
    const adhesions:ProjetView[] = await this.compteserv.getAdhesion(compteId);
    const profs:ProjetView[] = await this.prof_serv.getProfContratActif(compteId);
    // 2. Crée une map pour fusionner les projets par ID
    if(!adhesions && !profs) {
      return [];
    }
  const map = new Map<number, ProjetView>();

  // 3. Ajoute les projets venant des adhésions
  for (const proj of adhesions) {
    map.set(proj.id, {
      id: proj.id,
      nom: proj.nom,
      adherent: proj.adherent,
      essai: proj.essai, // true ou false selon la donnée
      prof: false,       // pas encore connu
    });
  }

  // 4. Ajoute/complète avec les projets venant des profs
  for (const proj of profs) {
    if (map.has(proj.id)) {
      const existing = map.get(proj.id)!;
      existing.prof = true; // on complète l'entrée existante
    } else {
      map.set(proj.id, {
        id: proj.id,
        nom: proj.nom,
        adherent: false,
        essai: false,
        prof: true,
      });
    }
  }

  // 5. Retourne la liste fusionnée
  return Array.from(map.values());


  }

    async get(id: number) : Promise<Compte_VM> {
      const pcompte = await this.compteserv.get(id);
      if (!pcompte) {
        throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
      }
       if(!pcompte.isActive){
      throw new UnauthorizedException('ACCOUNT_NOT_ACTIVE');
    }
      //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
      return to_CompteVM(pcompte);
  
    }
    async getLogin(login: string) : Promise<Compte_VM> {
      const pcompte = await this.compteserv.getLogin(login);
      if (!pcompte) {
        throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
      }
      //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
      return to_CompteVM(pcompte);
  
    }
    
    
    async getAll(project_id: number) : Promise<Compte_VM[]> {
      let liste_compte : Compte_VM[] = [];
      const saison_active = await this.season_serv.getActive(project_id);
      const adh = await this.member_serv.AdherentSaisons(saison_active.id);
      let compte_id = [...new Set(adh.map(x => x.compte))];
      compte_id.forEach(async (c_id) =>{
         const existing = await this.compteserv.get(c_id);
      if(!existing) {
        throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
      }
let acc = to_CompteVM(existing);
acc.adherents = adh.filter(x => x.compte == acc.id);
liste_compte.push(acc);
      })
      return liste_compte;
    }
  
    
   async add(vm: Compte_VM): Promise<number> {
    if (!vm) {
      throw new BadRequestException('INVALID_ACCOUNT');
    }
    let base = toAccount(vm, vm.password ? this.pepper : null);
    try {
      const saved = await this.compteserv.create(base);
      this.notifierAdherent("jechapartegui@gmail.com", "ca marche");
      return saved.id;
    } catch (err) {
      if (err instanceof QueryFailedError) {
        // par exemple violation de clef unique
        throw new BadRequestException('INTEGRITY_ERROR');
      }
      throw err;
    }
  }
  async update(vm: Compte_VM, updatePsw: boolean): Promise<number> {
    if (!vm) {
      throw new BadRequestException('INVALID_ACCOUNT');
    }
    // fusionnez l’existant si besoin
    let base = toAccount(vm, updatePsw ? this.pepper : null);
    if (!updatePsw) {
      const existing = await this.compteserv.get(vm.id);
      if(!existing) {
        throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
      }
      base.password = existing.password;
    }
    try {
      const updated = await this.compteserv.update(base.id, base);
      return updated.id;
    } catch (err) {
      if (err instanceof QueryFailedError) {
        throw new BadRequestException('INTEGRITY_ERROR');
      }
      throw err;
    }
  }

 async notifierAdherent(adresse: string, contenuHtml: string) {

  }    
    
   async delete(id: number): Promise<boolean> {
    try {
      await this.compteserv.delete(id);
      return true;
    } catch (err) {
      // si c’est NotFoundException, on considère false
      if (err instanceof NotFoundException) {
        return false;
      }
      // ou si contrainte de FK : on peut renvoyer false aussi
      if (err instanceof QueryFailedError) {
        return false;
      }
      throw err;
    }
  }

  
}

export function hashPasswordWithPepper(password: string, pepper:string): string {
    return crypto
      .createHmac('sha256', pepper)
      .update(password)
      .digest('hex');
  }

export function to_CompteVM(entity: Account): Compte_VM {
  const vm = new Compte_VM();

  vm.id = entity.id;
  vm.nom = entity.login;
  vm.email = entity.login; // même champ pour login/email ici
  vm.password = ''; // Ne jamais exposer le mot de passe hashé
  vm.actif = entity.isActive;
  vm.mail_actif = entity.isEmailActive;
  vm.derniere_connexion = entity.lastLoginAt ?? null;
  vm.echec_connexion = entity.loginFailed ? 1 : 0;
  vm.mail_ko = entity.emailError;
  vm.token = entity.activationToken ?? null;

  return vm;
}


export function toAccount(vm: Compte_VM, pepper: string | null = null): Account {
  const entity = new Account();

  entity.id = vm.id;
  entity.login = vm.email ?? vm.nom; // login basé sur email
  if(pepper){
  entity.password = hashPasswordWithPepper(vm.password!, pepper); // ATTENTION : doit être hashé avant l'enregistrement
  }
  entity.isActive = vm.actif;
  entity.isEmailActive = vm.mail_actif;
  entity.lastLoginAt = vm.derniere_connexion ?? undefined;
  entity.loginFailed = vm.echec_connexion > 0;
  entity.emailError = vm.mail_ko;
  entity.activationToken = vm.token ?? undefined;
  return entity;
}




