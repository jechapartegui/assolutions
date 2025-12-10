import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { RegistrationSession } from '../entities/inscription-seance.entity';

@Injectable()
export class RegistrationSessionService {
  private readonly logger = new Logger(RegistrationSessionService.name);
  constructor(
    @InjectRepository(RegistrationSession)
    private readonly repo: Repository<RegistrationSession>,
  ) {}

  async get(personId: number, seanceId: number): Promise<RegistrationSession> {
    const item = await this.repo.findOne({ where: { personId, seanceId } });
    if (!item) return null;
    return item;
  }

  async getRiderSeance(personId: number, seanceId: number): Promise<RegistrationSession | null> {
    return this.repo.findOne({ where: { personId, seanceId } });
  }

  async getAll(): Promise<RegistrationSession[]> {
    return this.repo.find();
  }

  async getAllSeance(seanceId: number): Promise<RegistrationSession[]> {
    return this.repo.find({
      relations: ['person', 'seance'],
      where: { seanceId },
    });
  }

async getAllRiderSaison(personId: number, seasonId: number): Promise<RegistrationSession[]> {
  const start = Date.now();
  this.logger.log(`getAllRiderSaison(personId=${personId}, seasonId=${seasonId}) START`);

  const res = await this.repo.find({
    relations: ['seance'],
    where: {
      personId,
      seance: { seasonId },
    },
  });

  this.logger.debug(
    `getAllRiderSaison(personId=${personId}, seasonId=${seasonId}) - repo.find = ${Date.now() - start}ms (count=${res.length})`,
  );

  return res;
}


  async create(data: Partial<RegistrationSession>): Promise<RegistrationSession> {
    try {
      const created = this.repo.create(data);
      return await this.repo.save(created);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        // par ex. violation de la contrainte unique (personId, seanceId)
        throw new BadRequestException('INTEGRITY_ERROR');
      }
      throw err;
    }
  }

  async update(
    personId: number,
    seanceId: number,
    data: Partial<RegistrationSession>,
  ): Promise<RegistrationSession> {
    // Vérifie l’existence d’abord
    const existing = await this.get(personId, seanceId);

    try {
      // Option 1 : merge + save (plus safe avec clés composites)
      const toUpdate = this.repo.merge(existing, data);
      return await this.repo.save(toUpdate);

      // Option 2 (si tu préfères update "sec" sans reload) :
      // await this.repo.update({ personId, seanceId }, data);
      // return this.get(personId, seanceId);
    } catch (err) {
      if (err instanceof QueryFailedError) {
        throw new BadRequestException('INTEGRITY_ERROR');
      }
      throw err;
    }
  }

  async delete(personId: number, seanceId: number): Promise<void> {
    // Vérifie d’abord que l’enregistrement existe
    await this.get(personId, seanceId);

    await this.repo.delete({ personId, seanceId });
  }
}
