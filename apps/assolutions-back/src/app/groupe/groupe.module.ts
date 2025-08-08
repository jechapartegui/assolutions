import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupeService } from "./groupe.service";
import { GroupeController } from "./groupe.controller";
import { GroupService } from "../../crud/group.service";
import { LinkGroupService } from "../../crud/linkgroup.service";
import { Group } from "../../entities/groupe.entity";
import { LinkGroup } from "../../entities/lien_groupe.entity";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Group, LinkGroup
    ]),
  ],
  providers: [GroupeService, GroupService, LinkGroupService],
  controllers: [GroupeController],
  exports: [GroupeService, LinkGroupService], // 👈 ajoute ça
})
export class GroupeModule {}
