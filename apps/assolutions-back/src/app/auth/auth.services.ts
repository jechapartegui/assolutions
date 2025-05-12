import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Compte } from '../bdd/compte';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AdherentProjet } from '../bdd/member_project';
import { Adherent } from '../bdd/riders';
import { Projet } from '../bdd/project';
import { ProjetLogin } from '../bdd/project_login';
import { AuthResult, ProjetView } from '@shared/compte/src/lib/compte.interface';
import { GestionnaireProjet } from '../bdd/gestionnaire_projet';
import { ProfesseurSaison } from '../bdd/prof-saison';
import { ProjectService } from '../project/project.service';


@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(Compte)
  private readonly compteRepo: Repository<Compte>,
  @InjectRepository(ProjetLogin)
private readonly projetcompteRepo: Repository<ProjetLogin>,

@InjectRepository(GestionnaireProjet)
private readonly projetgestionnaireRepo: Repository<GestionnaireProjet>,
  
  @InjectRepository(AdherentProjet)
  private readonly adherent_projectRepo: Repository<AdherentProjet>,

  @InjectRepository(Adherent)
  private readonly adherentRepo: Repository<Adherent>,

  @InjectRepository(ProfesseurSaison)
  private readonly profsaisonRepo: Repository<ProfesseurSaison>,
  @InjectRepository(Projet)
  private readonly projetRepo: Repository<Projet>,
    private readonly configService: ConfigService,
    private projectService: ProjectService,
  ) {
    this.pepper = this.configService.get<string>('PEPPER') ?? '';
  }

  async prelogin(login: string): Promise<boolean> {
  
    const compte = await this.compteRepo.findOne({ where: { login } });
    const compte_admin = await this.projetcompteRepo.findOne({ where: { login: login } });
    if (!compte && !compte_admin) {
      console.warn('[prelogin] compte introuvable pour', login); // 👈
      throw new UnauthorizedException ('NO_USER_FOUND');
    } else {
      if(compte) {
        if(compte.password === null || compte.password === '') {
          return false;
        } else {
          return true;
        }
      } else {
        if(compte_admin!.password === null || compte_admin!.password === '') {
          return false;
        } else {
          return true;
        }
    }

  }
  }

  async validatepassword(login: string, password: string = ""): Promise<AuthResult> {
    const compte = await this.compteRepo.findOne({ where: { login } });
    const admin = await this.projetcompteRepo.findOne({ where: { login } });
  
    const found = compte ?? admin;
  
    if (!found) {
      console.warn('[prelogin] compte introuvable pour', login);
      throw new UnauthorizedException('NO_USER_FOUND');
    }
  
    const storedPassword = found.password;
  
    if (!storedPassword) {
      return {
        type: compte ? 'compte' : 'admin',
        user: found,
      };
    }
  
    const hashed = this.hashPasswordWithPepper(password);
    if (storedPassword !== hashed) {
      throw new UnauthorizedException('INCORRECT_PASSWORD');
    }
  
    console.warn('[prelogin] mot de passe correct pour', login);
    found.password = ""; // sécurité : nettoyage avant retour
  
    return {
      type: compte ? 'compte' : 'admin',
      user: found,
    };
  }


  
  async getProjects(compteId: number): Promise<ProjetView[]> {
    // 1. Récupère les adhérents liés au compte
    const adherents = await this.adherentRepo.find({ where: { compte: compteId } });
    //partie prof
    let projetsProf:Projet[] = [];
    const prof = await this.profsaisonRepo.find({  where: {
      rider_id: In(adherents.map(a => a.id))
    } });
    // s'il est prof on va récupérer les projets ou c'est saison active
    if(prof.length > 0) {
      let projetIdProf = [];
      for (const p of prof) {
        const saison = await this.projectService.IsSaisonActive(p.saison_id);
        if(saison) {
          projetIdProf.push(saison.project_id);
        }
      }
      if(projetIdProf.length > 0) {
        projetsProf = await this.projetRepo.find({
          where: {
            id: In(projetIdProf.map(a => a))
          }
        });
      }
      
    }
  
    // 2. Récupère toutes les lignes de AdherentProjet (liaison adhérent-projet)
    const projetsAdherent = await this.adherent_projectRepo.find({
      where: {
        member_id: In(adherents.map(a => a.id))
      }
    });

    const projetsGestionnaire = await this.projetgestionnaireRepo.find({
      where: {
        rider_id: In(adherents.map(a => a.id))
      }
    });
   
    

    // 3. Extrait les IDs uniques des projets
    const projetIds = [...new Set(projetsAdherent.map(p => p.project_id))];
    const projetsIdsGestionnaire = [...new Set(projetsGestionnaire.map(p => p.project_id))];
  
    // 4. Récupère tous les projets associés à ces lignes
    const projets = await this.projetRepo.findByIds(projetIds);
    const projetsGest = await this.projetRepo.findByIds(projetsIdsGestionnaire);


    const fullprojets = [
      ...new Map([...projets, ...projetsGest, ...projetsProf].map(p => [p.id, p])).values()
    ];
    
    // 5. Construit une map projet_id -> ProjetView
    const projetMap = new Map<number, ProjetView>();
    for (const p of fullprojets) {
      projetMap.set(p.id, {
        id: p.id,
        nom: p.nom,
        adherent: false,
        prof: false,
        gestionnaire: false
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
    for (const liaison of projetsGestionnaire) {
      const projet = projetMap.get(liaison.project_id);
      if (projet) {
        projet.gestionnaire = true;
        // Tu peux aussi ajouter ici le `prof` ou `admin` si tu as l'info dans la table de jointure
        // projet.prof = liaison.prof;
        // projet.admin = liaison.admin;
      }
    }
    for (const liaison of projetsProf) {
      const projet = projetMap.get(liaison.id);
      if (projet) {
        projet.prof = true;
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




