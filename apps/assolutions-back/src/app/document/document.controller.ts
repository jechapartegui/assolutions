import { Controller, Post, Body, UseGuards, Param, Get } from '@nestjs/common';
import { PasswordGuard } from '../guards/password.guard';
import { DocumentService } from './document.services';

// src/auth/auth.controller.ts
@Controller('document')
export class DocumentController {
  constructor(private readonly docserv: DocumentService) {}

  @UseGuards(PasswordGuard)
  @Post('modify_photo_user')
  async modifyPhotoUser(@Body() body: { id: number, photo?: string }) {
    return this.docserv.ModifyPhoto(+body.id, body.photo);
  }

  @UseGuards(PasswordGuard)
  @Get('get_photo_user/:id')
  async getPhoto(@Param('id') id: number): Promise<string> {
    return this.docserv.GetPhotoAsBase64(+id);
  }
}

