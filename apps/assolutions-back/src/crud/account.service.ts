
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Account } from '../entities/compte.entity';
import { Person } from '../entities/personne.entity';
import { ProjetView } from '@shared/src';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async get(id: number): Promise<Account> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    return item;
  }
   async getLogin(login: string): Promise<Account> {
    const item = await this.repo.findOne({ where: { login } });
    if (!item) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    return item;
  }
     async getToken(login: string, activationToken:string): Promise<Account> {
    const item = await this.repo.findOne({ where: { login, activationToken } });
    if (!item) throw new NotFoundException('INCORRECT_TOKEN');
    return item;
  }


  async adherentCompte(id:number) : Promise<Person[]>{
       const account = await this.repo.findOne({
    where: { id },
    relations: [
      'persons',                         // 1er niveau
      'persons.inscriptions',           // 2ᵉ niveau
      'persons.inscriptions.saison',    // 3ᵉ niveau (votre “season”)
      'persons.inscriptions.saison.project',    // 4ᵉ niveau projet
    ],
  });
  if (!account) throw new NotFoundException('ACCOUNT_NOT_FOUND');
  return account.persons;
  }

   async getAdhesion(id: number): Promise<ProjetView[]> {
    let retour:ProjetView[]=[];
    const persons = await this.adherentCompte(id);
    if(!persons || persons.length === 0) {
      throw new NotFoundException('NO_PERSONS_FOUND');
    }
    persons.forEach((person) =>{
   let person_inscrite =  person.inscriptions?.filter(y => y.saison.isActive);
   
   if(person_inscrite){
    person_inscrite.forEach((p_i) =>{
 const pv:ProjetView ={
      id : p_i.saison.projectId,
      nom : p_i.saison.project.name,
      adherent : true,
      prof : false,
      essai : false
    }
    retour.push(pv);
    })
   
   } else {
    let person_essai = person.inscriptionsSeance?.filter(y => y.seance.season.isActive);
    if(person_essai){
    person_essai.forEach((p_e) =>{
      const pv:ProjetView ={
      id : p_e.seance.season.projectId,
      nom : p_e.seance.season.project.name,
      adherent : false,
      essai: true,
      prof : false
     }
    retour.push(pv);
    })
   
   } 
   }

    })
    return retour;
  }

  async getAll(): Promise<Account[]> {
    return this.repo.find();
  }

  async create(data: Partial<Account>): Promise<Account> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
  }

  async update(id: number, data: Partial<Account>): Promise<Account> {
    await this.get(id);
    try {
      await this.repo.update({ id }, data);
    } catch (err) {
      if (err instanceof QueryFailedError) throw new BadRequestException('INTEGRITY_ERROR');
      throw err;
    }
    return this.get(id);
  }

  async delete(id: number): Promise<void> {
    await this.get(id);
    await this.repo.delete({ id });
  }
}
