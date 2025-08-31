
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../entities/compte.entity';
import { Person } from '../entities/personne.entity';
import { ProjetView } from '@shared/lib/compte.interface';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
  ) {}

  async get(id: number): Promise<Account | null> {
    const item = await this.repo.findOne({ where: { id } });
    return item;
  }
   async getLogin(login: string): Promise<Account | null> {
    const item = await this.repo.findOne({ where: { login } });
    return item;
  }
     async getToken(login: string, activationToken:string): Promise<Account> {
    const item = await this.repo.findOne({ where: { login, activationToken } });
    if (!item) throw new NotFoundException('INCORRECT_TOKEN');
  
  await this.repo.update(item.id, { isActive: true, activationToken: null }); // écrit NULL
  return this.repo.findOneByOrFail({ id: item.id }); // on relit pour renvoyer l'état à jour
  }


  async adherentCompte(id:number) : Promise<Person[]>{
    console.warn(id);
       const account = await this.repo.findOne({
    where: { id },
    relations: [
      'persons', 
      'persons.inscriptionsSeance',   
      'persons.inscriptionsSeance.seance', 
      'persons.inscriptionsSeance.seance.season',    
      'persons.inscriptionsSeance.seance.season.project',               // 2ᵉ niveau                        // 1er niveau
      'persons.inscriptions',           // 2ᵉ niveau
      'persons.inscriptions.saison',    // 3ᵉ niveau (votre “season”)
      'persons.inscriptions.saison.project',    // 4ᵉ niveau projet
    ],
  });
  if (!account) return [];
  return account.persons;
  }

   async ProfCompte(id:number) : Promise<Person[]>{
       const account = await this.repo.findOne({
    where: { id },
    relations: [
      'persons',                         // 1er niveau
      'persons.professor',        
      'persons.professor.contracts',    // 3ᵉ niveau (votre “season”)   // 2ᵉ niveau
      'persons.professor.contracts.saison',    // 3ᵉ niveau (votre “season”)
      'persons.professor.contracts.saison.project',    // 4ᵉ niveau projet
    ],
  });
  if (!account) return [];
  return account.persons;
  }

   async getAdhesion(id: number): Promise<ProjetView[]> {
    let retour:ProjetView[]=[];
    const persons = await this.adherentCompte(id);
    persons.forEach((person) =>{
   let person_inscrite =  person.inscriptions?.filter(y => y.saison.isActive);
   if(person_inscrite && person_inscrite.length>0){
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
    if(person_essai && person_essai.length>0){
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
    const entity = this.repo.create(data);
    // si save lance QueryFailedError, on ne l’attrape pas ici
    return this.repo.save(entity);
  }

  async update(id: number, data: Partial<Account>): Promise<Account> {
    const entity = await this.get(id);
    console.warn("data",data);
    if (!entity) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    Object.assign(entity, data);
    console.warn("entity",entity);
    return this.repo.save(entity);
  }

  async delete(id: number): Promise<void> {
    const entity = await this.get(id);
    if (!entity) throw new NotFoundException('ACCOUNT_NOT_FOUND');
    await this.repo.remove(entity);
  }
}
