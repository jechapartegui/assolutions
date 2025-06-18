import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { DocumentService } from './document.services';

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
}
