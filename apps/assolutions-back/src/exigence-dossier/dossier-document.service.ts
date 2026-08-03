import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { DocumentEntity } from '../document/document.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { ProjectEntity } from '../project/project.entity';
import { SaveDossierDocumentDto } from './dossier-document.dto';

@Injectable()
export class DossierDocumentService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    @InjectRepository(PersonneEntity)
    private readonly personneRepo: Repository<PersonneEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(
    dto: SaveDossierDocumentDto,
    projectId: number,
    accountId: number,
  ) {
    await this.assertAuthorizedPerson(dto.personne_id, projectId, accountId);

    const raw = dto.data_base64.includes(',')
      ? dto.data_base64.split(',').pop() ?? ''
      : dto.data_base64;
    if (!raw) throw new BadRequestException('Fichier vide');

    const file = Buffer.from(raw, 'base64');
    if (!file.length) throw new BadRequestException('Fichier invalide');
    if (file.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Le fichier dépasse 10 Mo');
    }

    return this.documentRepo.save(
      this.documentRepo.create({
        titre: dto.titre.trim(),
        objet_id: dto.personne_id,
        objet_type: 'rider',
        typedoc: dto.typedoc.trim().toUpperCase(),
        file_data: file,
        file_path: null,
        storage_type: 'DB',
        mimetype: dto.mimetype,
        date_document: dto.date_document?.slice(0, 10) ?? null,
        date_expiration: null,
        valide: true,
        commentaire: null,
        auteur: null,
        project_id: projectId,
      }),
    );
  }

  private async assertAuthorizedPerson(
    personId: number,
    projectId: number,
    accountId: number,
  ): Promise<void> {
    const person = await this.personneRepo.findOne({ where: { id: personId } });
    if (!person) throw new NotFoundException('Personne introuvable');
    if (Number(person.compte) === Number(accountId)) return;

    const project = await this.dataSource
      .getRepository(ProjectEntity)
      .findOne({ where: { id: projectId } as any });
    const ownerId = Number(
      (project as any)?.compte_id ??
        (project as any)?.compteId ??
        (project as any)?.compte?.id ??
        (project as any)?.compte ??
        0,
    );
    if (ownerId !== Number(accountId)) {
      throw new ForbiddenException('PERSONNE_HORS_COMPTE');
    }
  }
}
