import { Body, Controller,  Param, Post, Res, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { DocumentService } from './document.services';
import type { Response } from 'express';

// src/auth/auth.controller.ts
@Controller('document')
export class DocumentController {
  constructor(private readonly docserv: DocumentService) {}
  @UseGuards(PasswordGuard)
  @Post('modifier_photo_user')
  async login(
    @Body() { id, photo }: { id: number; photo: Blob }
  ) {
    return this.docserv.ModifyPhoto(id, photo);
  }
async getPhoto(@Param('id') id: number, @Res() res: Response) {
  const photoBuffer = await this.docserv.getPhoto(id); // <-- retourne le buffer
  res.set({
    'Content-Type': 'image/jpeg', // ou image/png
    'Content-Disposition': 'inline; filename="photo.jpg"',
  });
  res.send(photoBuffer); // <-- on envoie ici dans le contrôleur
}
}
