import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessControlService } from '../common/access-control.service';
import { OptionalProjectId } from '../common/decorators/optional-project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ContactService } from './contact.service';
import { CreateContactDto, UpdateContactDto } from './contact.dto';

@Controller('contact')
export class ContactController {
  constructor(
    private readonly service: ContactService,
    private readonly access: AccessControlService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('list')
  async list(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() body: { ids: number[] },
  ) {
    await this.access.assertPersonIdsAccess(req.user.id, body.ids ?? [], projectId);
    return this.service.list(body.ids ?? []);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const contact = await this.service.get(id);
    if (!contact) throw new NotFoundException(`Contact ${id} introuvable`);
    await this.access.assertPersonAccess(req.user.id, contact.object_id, projectId);
    return contact;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Body() dto: CreateContactDto,
  ) {
    await this.access.assertPersonAccess(req.user.id, dto.object_id, projectId);
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/update')
  async update(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    const existing = await this.service.get(id);
    if (!existing) throw new NotFoundException(`Contact ${id} introuvable`);

    await this.access.assertPersonAccess(req.user.id, existing.object_id, projectId);
    if (Number(dto.object_id) !== Number(existing.object_id)) {
      await this.access.assertPersonAccess(req.user.id, dto.object_id, projectId);
    }

    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/delete')
  async remove(
    @Req() req: any,
    @OptionalProjectId() projectId: number | null,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const existing = await this.service.get(id);
    if (!existing) throw new NotFoundException(`Contact ${id} introuvable`);
    await this.access.assertPersonAccess(req.user.id, existing.object_id, projectId);
    return this.service.remove(id);
  }
}
