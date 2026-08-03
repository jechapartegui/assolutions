import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { DocumentEntity } from '../document/document.entity';
import { InscriptionSaisonEntity } from '../inscription_saison/inscription_saison.entity';
import { SaveSouscriptionDto } from '../souscription/souscription.dto';

@Injectable()
export class SouscriptionContextEnricherService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(InscriptionSaisonEntity)
    private readonly inscriptionRepo: Repository<InscriptionSaisonEntity>,
  ) {}

  async enrich<T extends { personnes?: any[] }>(
    context: T,
    saisonId: number,
  ): Promise<T> {
    const people = context.personnes ?? [];
    const ids = people.map((person) => Number(person.id)).filter(Boolean);
    if (!ids.length) return context;

    const [photos, inscriptions] = await Promise.all([
      this.documentRepo
        .createQueryBuilder('document')
        .where('document.objet_id IN (:...ids)', { ids })
        .andWhere("LOWER(document.typedoc) = 'photo'")
        .andWhere("LOWER(document.objet_type) IN ('member', 'rider')")
        .andWhere('(document.valide IS NULL OR document.valide = true)')
        .getMany(),
      this.inscriptionRepo.find({
        where: {
          saison_id: saisonId,
          personne_id: In(ids),
        },
      }),
    ]);

    const photoIds = new Set(photos.map((photo) => Number(photo.objet_id)));
    const registeredIds = new Set(
      inscriptions
        .filter((item: any) => item.active !== false && item.active !== 'false')
        .map((item) => Number(item.personne_id)),
    );

    context.personnes = people.map((person) => ({
      ...person,
      photo_presente: photoIds.has(Number(person.id)),
      inscription_active: registeredIds.has(Number(person.id)),
    }));
    return context;
  }

  async assertNotAlreadyRegistered(
    dto: SaveSouscriptionDto,
  ): Promise<void> {
    const ids = (dto.personnes ?? []).map((item) => Number(item.personne_id));
    if (!ids.length) return;

    const registrations = await this.inscriptionRepo.find({
      where: {
        saison_id: Number(dto.saison_id),
        personne_id: In(ids),
      },
    });
    const active = registrations.filter(
      (item: any) => item.active !== false && item.active !== 'false',
    );
    if (active.length) {
      throw new BadRequestException(
        `Une ou plusieurs personnes sont déjà inscrites sur cette saison : ${active
          .map((item) => item.personne_id)
          .join(', ')}`,
      );
    }
  }
}
