import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { LoginProjectEntity } from '../login_project/login_project.entity';
import { ProjetView } from '@shared/lib/compte.interface';
import { SaisonEntity } from '../saison/saison.entity';
import { MessageService } from '../message/message.service';

type AppMode = 'ADMIN' | 'APPLI';

@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MessageService,

    @InjectRepository(CompteEntity)
    private readonly compteRepo: Repository<CompteEntity>,

    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,

    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,

    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,

    @InjectRepository(LoginProjectEntity)
    private readonly loginProjectRepo: Repository<LoginProjectEntity>,
  ) {
    this.pepper = this.config.get<string>('PEPPER') ?? '';
  }

  private signToken(compte: CompteEntity): string {
    return this.jwt.sign(
      {
        sub: compte.id,
        login: compte.login,
        superAdmin: false,
      },
      { expiresIn: '30d' },
    );
  }

  private async computeMode(compteId: number): Promise<AppMode> {
    const hasAdminProject = await this.projectRepo.exist({
      where: { compte: compteId } as any,
    });

    if (hasAdminProject) return 'ADMIN';

   return 'APPLI';
  }

  private async getProjectsForCompte(compteId: number): Promise<ProjectEntity[]> {
  const loginProjects = await this.loginProjectRepo.find({
    where: { login_id: compteId },
    relations: ['project'],
  });

  return loginProjects
    .map((lp: LoginProjectEntity) => {
      const project = lp.project;

      if (!project) {
        return null;
      }

      project.password = '';

      return project;
    })
    .filter((project): project is ProjectEntity => project !== null);
}

  private async buildSession(compte: CompteEntity, token = ''): Promise<any> {
    const mode = await this.computeMode(compte.id);
    if(mode === 'APPLI') {
    const projects = await this.getProjectsForCompte(compte.id);
    return {
      token,
      compte,
      mode,
      projects,
    };  }
    else {      
      const pr = await this.projectRepo.findOne({where : {compte: compte.id}});
      if(!pr) {
        throw new NotFoundException('PROJECT_NOT_FOUND');
      }
      const ss = await this.saisonRepo.findOne({where : {project_id: pr.id, active: true}});
       const ttpr : ProjetView = {
        id: pr.id,
        nom: pr.nom ,
        rights: {
          adherent: true,
          prof: true,
          visible: true},
          saison_active : ss}


      return {
        token,
        compte,
        mode,
        projects: [ttpr],
    }
    }
  }

  async prelogin(login: string): Promise<{ password_required: boolean; mode: AppMode }> {
    const compte = await this.getByLogin(login);
    console.warn('prelogin for', login, '=>', compte);
    if (!(compte as CompteEntity).actif) {
      throw new BadRequestException('ACCOUNT_NOT_ACTIVE');
    }

    const storedPassword = (compte as CompteEntity).password;
    const hasPassword = !!(storedPassword && String(storedPassword).length > 0);

    const mode = await this.computeMode(compte.id);

    return {
      password_required: hasPassword,
      mode,
    };
  }

  async login(login: string, password?: string): Promise<any> {
    const compte = await this.getByLogin(login);

    if (!(compte as CompteEntity).actif) {
      throw new BadRequestException('ACCOUNT_NOT_ACTIVE');
    }

    const storedPassword = (compte as CompteEntity).password;
    const hasPassword = !!(storedPassword && String(storedPassword).length > 0);

    if (hasPassword) {
      if (!password) {
        throw new BadRequestException('PASSWORD_REQUIRED');
      }

      const hashed = hashPasswordWithPepper(password, this.pepper);

      if (hashed !== storedPassword) {
        throw new BadRequestException('INCORRECT_PASSWORD');
      }
    }

    // On évite de renvoyer le hash au front
    (compte as CompteEntity).password = null;

    const token = this.signToken(compte);

    return this.buildSession(compte, token);
  }

  async me(userId: number): Promise<any> {
    const compte = await this.compteRepo.findOne({
      where: { id: userId },
    });

    if (!compte) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    if (!(compte as CompteEntity).actif) {
      throw new BadRequestException('ACCOUNT_NOT_ACTIVE');
    }

    // On évite de renvoyer le hash au front
    (compte as CompteEntity).password = null;

    return this.buildSession(compte);
  }

  async changeMyPassword(userId: number, newPassword: string | null): Promise<boolean> {
    const compte = await this.compteRepo.findOne({
      where: { id: userId },
    });

    if (!compte) {
      throw new NotFoundException('ACCOUNT_NOT_FOUND');
    }

    (compte as CompteEntity).password = newPassword
      ? hashPasswordWithPepper(newPassword, this.pepper)
      : null;

    if ('activation_token' in compte) {
      (compte as CompteEntity).activation_token = null;
    }

    if ('actif' in compte) {
      (compte as CompteEntity).actif = true;
    }

    await this.compteRepo.save(compte);

    return true;
  }

  async getByLogin(login: string): Promise<CompteEntity> {
    if (!login) {
      throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    }

    const compte = await this.compteRepo.findOne({
      where: { login: login.toLowerCase() }
    });

    if (!compte) {
      throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    }

    return compte;
  }

 private createResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

private hashToken(token: string): string {
  return crypto
    .createHmac('sha256', this.pepper)
    .update(token)
    .digest('hex');
}

async reinit_mdp(login: string): Promise<boolean> {
  const compte = await this.getByLogin(login);

  const rawToken = this.createResetToken();
  const hashedToken = this.hashToken(rawToken);

  (compte as any).activation_token = hashedToken;
  await this.compteRepo.save(compte);

  const frontUrl = this.config.get<string>('FRONT_URL') ?? 'https://assolutions.club';

  const resetUrl =
    `${frontUrl}/login?context=REINIT` +
    `&user=${encodeURIComponent(compte.login)}` +
    `&token=${encodeURIComponent(rawToken)}`;

  await this.mailService.sendPasswordReset(compte.login, resetUrl);

  console.log('RESET PASSWORD URL:', resetUrl);

  return true;
}

async checkResetToken(login: string, token: string): Promise<boolean> {
  const compte = await this.getByLogin(login);

  const expected = (compte as any).activation_token;
  if (!expected) {
    throw new BadRequestException('TOKEN_NOT_FOUND');
  }

  const received = this.hashToken(token);

  if (received !== expected) {
    throw new BadRequestException('INVALID_TOKEN');
  }

  return true;
}

async setPasswordWithToken(
  login: string,
  token: string,
  newPassword: string,
): Promise<boolean> {

  const compte = await this.getByLogin(login);

  const cleanPassword = newPassword?.trim() ?? '';

if (cleanPassword.length > 0) {
  if (cleanPassword.length < 8 || !/\d/.test(cleanPassword)) {
    throw new BadRequestException('PASSWORD_TOO_WEAK');
  }

  compte.password = hashPasswordWithPepper(cleanPassword, this.pepper);
} else {
  compte.password = null;
}

(compte as any).activation_token = null;
compte.actif = true;

await this.compteRepo.save(compte);

return true;
}
}


export function hashPasswordWithPepper(password: string, pepper: string): string {
  return crypto
    .createHmac('sha256', pepper)
    .update(password)
    .digest('hex');
}