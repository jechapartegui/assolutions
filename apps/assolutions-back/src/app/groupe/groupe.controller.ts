import { Controller } from "@nestjs/common";
import { GroupeService } from "./groupe.service";

@Controller('groupe')
export class GroupeController {
  constructor(private readonly groupe_serv: GroupeService) {}

}