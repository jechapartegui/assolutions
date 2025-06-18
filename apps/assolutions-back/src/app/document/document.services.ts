import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Adherent } from '../bdd/riders';
import { Document } from '../bdd/document';
import { MemberService } from '../member/member.services';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Adherent)
    private readonly AdherentRepo: Repository<Adherent>,
    @InjectRepository(Document)
    private readonly DocumentRepo: Repository<Document>,
    private readonly memberservice: MemberService
  ) {}

  async ModifyPhoto(id: number, photoBlob?: Blob) {
    if (!id) {
      throw new BadRequestException('INVALID_MEMBER_ID');
    }

    const existingPhoto = await this.DocumentRepo.findOne({
      where: {
        objet_type: 'member',
        objet_id: id,
        typedoc: 'photo',
      },
    });

    // SUPPRESSION
    if (!photoBlob && existingPhoto) {
      await this.DocumentRepo.remove(existingPhoto);
      return { success: true, action: 'deleted' };
    }

    // AUCUNE ACTION
    if (!photoBlob && !existingPhoto) {
      return { success: false, message: 'No photo to delete or update' };
    }

    // CONVERT BLOB → Buffer (important)
    const buffer = Buffer.from(await photoBlob!.arrayBuffer());

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('EMPTY_PHOTO');
    }

    if (!existingPhoto) {
      // AJOUT
      const newDoc = this.DocumentRepo.create({
        date_import: new Date(),
        document: buffer,
        objet_id: id,
        objet_type: 'member',
        projet: 0,
        typedoc: 'photo',
        titre: 'Photo du membre',
      });
      const saved = await this.DocumentRepo.save(newDoc);
      return { success: !!saved, action: 'created' };
    } else {
      // MISE À JOUR
      existingPhoto.document = buffer;
      existingPhoto.date_import = new Date();
      const updated = await this.DocumentRepo.save(existingPhoto);
      return { success: !!updated, action: 'updated' };
    }
  }
}
