import { TypeOrmModule } from "@nestjs/typeorm";
import { LoginProjectEntity } from "./login_project.entity";
import { RegistryModule } from "../registry/registry.module";
import { LoginProjectService } from "./login_project.service";
import { LoginProjectController } from "./login_project.controller";
import { Module } from "@nestjs/common";

@Module({
  imports: [TypeOrmModule.forFeature([LoginProjectEntity]), RegistryModule],
  controllers: [LoginProjectController],
  providers: [LoginProjectService],
})
export class LoginProjectModule {}