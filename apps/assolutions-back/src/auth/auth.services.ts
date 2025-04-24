import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Compte } from '../app/bdd/compte';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdherentProjet } from '../app/bdd/member_project';
import { Adherent } from '../app/bdd/riders';
import { Projet } from '../app/bdd/project';

type ProjetView = {
  id: number;
  nom: string;
  adherent: boolean;
  prof: boolean;
  admin: boolean;
};

@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(Compte)
  private readonly compteRepo: Repository<Compte>,
  
  @InjectRepository(AdherentProjet)
  private readonly adherent_projectRepo: Repository<AdherentProjet>,

  @InjectRepository(Adherent)
  private readonly adherentRepo: Repository<Adherent>,

  @InjectRepository(Projet)
  private readonly projetRepo: Repository<Projet>,
    private readonly configService: ConfigService
  ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
  }

  async prelogin(login: string): Promise<boolean> {
  
    const compte = await this.compteRepo.findOne({ where: { login } });
  
    if (!compte) {
      console.warn('[prelogin] compte introuvable pour', login); // 👈
      throw new UnauthorizedException ('NO_USER_FOUND');
    }
    if(compte.password === null || compte.password === '') {
      return false;
    } else {
      return true;
    }
  
  }

  async validatepassword(login: string, password:string = ""): Promise<Compte> {
  
    const compte = await this.compteRepo.findOne({ where: { login } });
  
    if (!compte) {
      console.warn('[prelogin] compte introuvable pour', login); // 👈
      throw new UnauthorizedException ('NO_USER_FOUND');
    }
    if(compte.password === null || compte.password === '') {     
      return compte;
    } else{
      console.warn(this.hashPasswordWithPepper(password));
      console.warn(compte.password);
      let psw = this.hashPasswordWithPepper(password);
      if (compte.password !== psw) {
        throw new UnauthorizedException('INCORRECT_PASSWORD');
      } else {
        console.warn('[prelogin] mot de passe correct pour', login); // 👈
        compte.password = "";
        return compte;
      }
    }
  
  }

  
  
  async getProjects(compteId: number): Promise<ProjetView[]> {
    // 1. Récupère les adhérents liés au compte
    const adherents = await this.adherentRepo.find({ where: { compte: compteId } });
  
    // 2. Récupère toutes les lignes de AdherentProjet (liaison adhérent-projet)
    const projetsAdherent = await this.adherent_projectRepo.find({
      where: {
        member_id: In(adherents.map(a => a.id))
      }
    });
  
    // 3. Extrait les IDs uniques des projets
    const projetIds = [...new Set(projetsAdherent.map(p => p.project_id))];
  
    // 4. Récupère tous les projets associés à ces lignes
    const projets = await this.projetRepo.findByIds(projetIds);
  
    // 5. Construit une map projet_id -> ProjetView
    const projetMap = new Map<number, ProjetView>();
    for (const p of projets) {
      projetMap.set(p.id, {
        id: p.id,
        nom: p.nom,
        adherent: false,
        prof: false,
        admin: false
      });
    }
  
    // 6. Marque les projets auxquels l'utilisateur est adhérent
    for (const liaison of projetsAdherent) {
      const projet = projetMap.get(liaison.project_id);
      if (projet) {
        projet.adherent = true;
        // Tu peux aussi ajouter ici le `prof` ou `admin` si tu as l'info dans la table de jointure
        // projet.prof = liaison.prof;
        // projet.admin = liaison.admin;
      }
    }
  
    return Array.from(projetMap.values());
  }

  private hashPasswordWithPepper(password: string): string {
    return crypto
      .createHmac('sha256', this.pepper)
      .update(password)
      .digest('hex');
  }

  
}

