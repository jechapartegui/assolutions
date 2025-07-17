import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GroupeService } from "./groupe.service";
import { GroupeController } from "./groupe.controller";
import { GroupService } from "../../crud/group.service";
import { LinkGroupService } from "../../crud/linkgroup.service";

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
    ]),
  ],
  providers: [GroupeService, GroupService, LinkGroupService],
  controllers: [GroupeController],
  exports: [GroupeService], // 👈 ajoute ça
})
export class GroupeModule {}
