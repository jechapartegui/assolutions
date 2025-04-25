import {
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Adherent } from '../app/bdd/riders';


@Injectable()
export class MemberService {

  constructor(

  @InjectRepository(Adherent)
  private readonly adherentRepo: Repository<Adherent>,
  ) {}
  async GetMyInfo(id: number) {
    const adherent = await this.adherentRepo.findOne({ where: { id } });
    if (!adherent) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    return adherent;
  }
  async GetMySeance(id: number) {
   
  }



  
}

