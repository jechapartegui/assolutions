import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ContactService } from "./contact.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CreateContactDto, UpdateContactDto } from "./contact.dto";
import { Contact } from "./contact.entity";

@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @UseGuards(JwtAuthGuard)
  @Post('list')
  list(@Body() body: { ids: number[] })  {
    return this.service.list(body.ids);
  }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    get(id: number) {
        return this.service.get(id);
    }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(dto: CreateContactDto) {
    return this.service.create(dto);
  }

    @UseGuards(JwtAuthGuard)
    @Post(':id/update')
    update(id: number,dto: UpdateContactDto) {
        return this.service.update(id, dto);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/delete')
    remove(id: number) {
        return this.service.remove(id);
    }
  }