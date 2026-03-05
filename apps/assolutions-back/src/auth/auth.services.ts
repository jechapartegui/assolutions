import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';

import { CompteEntity } from '../compte/compte.entity';
import { ProjectEntity } from '../project/project.entity';
import { PersonneEntity } from '../personne/personne.entity';

type AppMode = 'ADMIN' | 'APPLI';

@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,

    @InjectRepository(CompteEntity) private readonly compteRepo: Repository<CompteEntity>,
    @InjectRepository(ProjectEntity) private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(PersonneEntity) private readonly personneRepo: Repository<PersonneEntity>,
  ) {
    this.pepper = this.config.get<string>('PEPPER') ?? '';
  }


  private signToken(compte: CompteEntity): string {
    return this.jwt.sign(
      {
        sub: compte.id,
        login: (compte as any).login ?? (compte as any).email, // selon ton champ
        superAdmin: false, // placeholder
      },
      { expiresIn: '30d' },
    );
  }

  private async computeMode(compteId: number): Promise<AppMode> {
    const hasAdminProject = await this.projectRepo.exist({ where: { compte: compteId } as any });
    if (hasAdminProject) return 'ADMIN';

    const hasPerson = await this.personneRepo.exist({ where: { compte: compteId } as any });
    if (hasPerson) return 'APPLI';

    throw new BadRequestException('ACCOUNT_NOT_ASSOCIATED');
  }

  async prelogin(login: string): Promise<{ password_required: boolean; mode: AppMode }> {
    const compte = await this.getByLogin(login);
    if (!(compte as any).actif && !(compte as any).isActive) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const storedPassword = (compte as any).password;
    const hasPassword = !!(storedPassword && String(storedPassword).length > 0);

    const mode = await this.computeMode(compte.id);
    return { password_required: hasPassword, mode };
  }

  async login(login: string, password?: string): Promise<any> {
    const compte = await this.getByLogin(login);
    if (!(compte as any).actif && !(compte as any).isActive) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const storedPassword = (compte as any).password;
    const hasPassword = !!(storedPassword && String(storedPassword).length > 0);

    if (hasPassword) {
      if (!password) throw new BadRequestException('PASSWORD_REQUIRED');
      const hashed = hashPasswordWithPepper(password, this.pepper);      
      if (hashed !== storedPassword) throw new BadRequestException('INCORRECT_PASSWORD');
      compte.password = "";
    }

    const token = this.signToken(compte);
    const mode = await this.computeMode(compte.id);

    // “table only”: on renvoie juste le compte brut (ou un VM si tu en as un shared)
    return { token, compte, mode, projects: [] };
  }

  async me(userId: number): Promise<any> {
    const compte = await this.compteRepo.findOne({ where: { id: userId } });
    if (!compte) throw new NotFoundException('ACCOUNT_NOT_FOUND');

    if (!(compte as any).actif && !(compte as any).isActive) throw new BadRequestException('ACCOUNT_NOT_ACTIVE');

    const mode = await this.computeMode(compte.id);
    return { token: '', compte, mode, projects: [] };
  }

  async changeMyPassword(userId: number, newPassword: string | null): Promise<boolean> {
    const compte = await this.compteRepo.findOne({ where: { id: userId } });
    if (!compte) throw new NotFoundException('ACCOUNT_NOT_FOUND');

    (compte as any).password = newPassword ? hashPasswordWithPepper(newPassword, this.pepper) : null;
    // si tu as un token de reset dans compte :
    if ('activation_token' in compte) (compte as any).activation_token = null;
    if ('activationToken' in compte) (compte as any).activationToken = null;

    if ('actif' in compte) (compte as any).actif = true;
    if ('isActive' in compte) (compte as any).isActive = true;

    await this.compteRepo.save(compte);
    return true;
  }

  // --- basic queries
  async getByLogin(login: string): Promise<CompteEntity> {
    if (!login) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');

    // selon ton champ: login/email
    const compte =await this.compteRepo.findOne({ where: { login: login.toLowerCase() } as CompteEntity });

    if (!compte) throw new UnauthorizedException('ACCOUNT_NOT_FOUND');
    return compte;
  }
}


  // --- helpers
  export function hashPasswordWithPepper(password: string, pepper:string): string {
    return crypto
      .createHmac('sha256', pepper)
      .update(password)
      .digest('hex');
  }
