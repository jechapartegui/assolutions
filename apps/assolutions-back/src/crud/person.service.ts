import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Person } from '../entities/personne.entity';
import { LinkGroupService } from './linkgroup.service';
import { InscriptionStatus } from '../entities/inscription-seance.entity';

@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);
  constructor(
    @InjectRepository(Person)
    private readonly repo: Repository<Person>,
    private linkgroup_serv: LinkGroupService,
  ) {}

  async get(id: number): Promise<Person | null> {
    const item = await this.repo.findOne({ where: { id } });
    return item;
  }

  

async getAllSaison(saisonId: number): Promise<Person[]> {
  const start = Date.now();
  this.logger.log(`getAllSaison(${saisonId}) START`);

  const personnes = await this.repo.find({
    relations: ['account', 'inscriptions', 'inscriptions.saison'],
    where: { inscriptions: { saisonId } },
  });
  this.logger.debug(`getAllSaison(${saisonId}) - repo.find = ${Date.now() - start}ms (count=${personnes.length})`);

  

  // Remplir les groupes pour chaque inscription de chaque personne
  for (const personne of personnes) {
    if(personne.inscriptions) {
    for (const inscription of personne.inscriptions) {
      inscription.groups = await this.linkgroup_serv.getGroupsForObject('rider', personne.id, saisonId);
    }
  }
  }
  const essais = await this.getEssai(null, saisonId);
  for (const essai of essais) {
    if (!personnes.find(p => p.id === essai.id)) {
      personnes.push(essai);
    }
  }
  return personnes;
}

async getEssai(
  accountId: number | null,
  seasonId: number,
  archive: boolean = false
): Promise<Person[]> {
  const qb = this.repo
    .createQueryBuilder('person')
    .leftJoinAndSelect('person.account', 'account')
    .leftJoinAndSelect('person.inscriptionsSeance', 'insc')
    .leftJoinAndSelect('insc.seance', 'seance')
    .where('seance.seasonId = :seasonId', { seasonId });

  // Filtre archive :
  // - si archive === true  -> person.archive = false
  // - si archive === false -> person.archive IN (true, false) (pas de filtre)
  if (archive) {
    qb.andWhere('person.archive = :isArchived', { isArchived: false });
  } else {
    qb.andWhere('person.archive IN (:...flags)', { flags: [true, false] });
    // ou simplement ne rien ajouter (aucun filtre) si tu préfères
  }

  // Filtre accountId si fourni (y compris 0 si c'est un id valide)
  if (accountId !== null) {
    qb.andWhere('person.accountId = :accountId', { accountId });
  }

  return qb.distinct(true).getMany();
}


async getAllCompte_number(accountId: number): Promise<Person[]> {
  const start = Date.now();
  this.logger.log(`getAllCompte_number(${accountId}) START`);

  const personnes = await this.repo.find({
    relations: ['account'],
    where: { accountId },
  });

  this.logger.debug(`getAllCompte_number(${accountId}) - repo.find = ${Date.now() - start}ms (count=${personnes.length})`);
  return personnes;
}


async getAllCompte(login: string): Promise<Person[]> {
  return this.repo.find({
    relations: ['account'],
    where: {
      account: {
        login: login,
      },
    },
  });
}
   

    async create(data: Partial<Person>): Promise<Person> {
        const entity = this.repo.create(data);
        // si save lance QueryFailedError, on ne l’attrape pas ici
        return this.repo.save(entity);
      }
    
      async update(id: number, data: Partial<Person>): Promise<Person> {
        const entity = await this.get(id);
        if (!entity) throw new NotFoundException('PERSON_NOT_FOUND');
        Object.assign(entity, data);
        return this.repo.save(entity);
      }
    
      async delete(id: number): Promise<void> {
        const entity = await this.get(id);
        if (!entity) throw new NotFoundException('PERSON_NOT_FOUND');
        await this.repo.remove(entity);
      }
}
