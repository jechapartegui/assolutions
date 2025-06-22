import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../bdd/document';
import { fileTypeFromBuffer } from 'file-type';


@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly DocumentRepo: Repository<Document>
  ) {}

  async GetPhotoAsBase64(id: number): Promise<string> {
    const existing = await this.DocumentRepo.findOne({
      where: { objet_type: 'member', objet_id: id, typedoc: 'photo' }
    });

    if (!existing || !existing.document) {
      return ''; // ou undefined
    }

    const fileType = await fileTypeFromBuffer(existing.document);
    const mime = fileType?.mime || 'image/png';

    const base64 = existing.document.toString('base64');
    return `data:${mime};base64,${base64}`;
  }

  async ModifyPhoto(id: number, base64?: string): Promise<string> {
    const existing = await this.DocumentRepo.findOne({
      where: { objet_type: 'member', objet_id: id, typedoc: 'photo' }
    });

    if (!base64) {
      // Suppression de la photo
      if (existing) await this.DocumentRepo.remove(existing);
      return 'PHOTO_DELETED';
    }

    const matches = base64.match(/^data:(.+);base64,(.*)$/);
    if (!matches) {
      throw new Error('Invalid base64 format');
    }

    const mime = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    if (existing) {
      existing.document = buffer;
      existing.mimetype = mime;
      await this.DocumentRepo.save(existing);
    } else {
      const doc = this.DocumentRepo.create({
        objet_type: 'member',
        objet_id: id,
        typedoc: 'photo',
        document: buffer,
        mimetype: mime
      });
      await this.DocumentRepo.save(doc);
    }

    return 'PHOTO_UPDATED';
  }
}

