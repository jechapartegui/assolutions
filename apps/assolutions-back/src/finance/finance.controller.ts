import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectId } from '../common/decorators/project-id.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectAdminGuard } from '../common/guards/project-admin.guard';

import {
  CreateBudgetLigneDto,
  CreateBudgetScenarioDto,
  CreateClasseComptableDto,
  CreateOperationDto,
  UpdateBudgetLigneDto,
  UpdateBudgetScenarioDto,
  UpdateClasseComptableDto,
  UpdateOperationDto,
} from './finance.dto';

import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, ProjectAdminGuard)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('classe-comptable')
  listClasses(
    @ProjectId() projectId: number,
    @Query('pays') pays?: string,
    @Query('lang') lang?: string,
  ) {
    return this.service.listClasses(projectId, pays, lang ?? 'fr');
  }

  @Post('classe-comptable')
  createClasse(
    @ProjectId() projectId: number,
    @Body() dto: CreateClasseComptableDto,
  ) {
    return this.service.createClasse(projectId, dto);
  }

  @Post('classe-comptable/:id/update')
  updateClasse(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClasseComptableDto,
  ) {
    return this.service.updateClasse(projectId, id, dto);
  }

  @Post('classe-comptable/:id/delete')
  deleteClasse(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteClasse(projectId, id);
  }

  @Get('budget-scenario')
  listScenarios(
    @ProjectId() projectId: number,
    @Query('saison_id') saisonId?: string,
  ) {
    return this.service.listScenarios(projectId, saisonId ? +saisonId : undefined);
  }

  @Post('budget-scenario')
  createScenario(
    @ProjectId() projectId: number,
    @Body() dto: CreateBudgetScenarioDto,
  ) {
    return this.service.createScenario(projectId, dto);
  }

  @Post('budget-scenario/:id/update')
  updateScenario(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBudgetScenarioDto,
  ) {
    return this.service.updateScenario(projectId, id, dto);
  }

  @Post('budget-scenario/:id/delete')
  deleteScenario(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteScenario(projectId, id);
  }

  @Get('budget-ligne')
  listLignes(
    @ProjectId() projectId: number,
    @Query('scenario_id') scenarioId?: string,
  ) {
    return this.service.listLignes(projectId, scenarioId ? +scenarioId : undefined);
  }

  @Post('budget-ligne')
  createLigne(
    @ProjectId() projectId: number,
    @Body() dto: CreateBudgetLigneDto,
  ) {
    return this.service.createLigne(projectId, dto);
  }

  @Post('budget-ligne/:id/update')
  updateLigne(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBudgetLigneDto,
  ) {
    return this.service.updateLigne(projectId, id, dto);
  }

  @Post('budget-ligne/:id/delete')
  deleteLigne(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteLigne(projectId, id);
  }

  @Get('operation')
  listOperations(
    @ProjectId() projectId: number,
    @Query('flux_financier_id') fluxId?: string,
  ) {
    return this.service.listOperations(projectId, fluxId ? +fluxId : undefined);
  }

  @Post('operation')
  createOperation(
    @ProjectId() projectId: number,
    @Body() dto: CreateOperationDto,
  ) {
    return this.service.createOperation(projectId, dto);
  }

  @Post('operation/:id/update')
  updateOperation(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOperationDto,
  ) {
    return this.service.updateOperation(projectId, id, dto);
  }

  @Post('operation/:id/delete')
  deleteOperation(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.deleteOperation(projectId, id);
  }

  @Post('operation/:id/create-flux')
  createFluxFromOperation(
    @ProjectId() projectId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('saison_id', ParseIntPipe) saisonId: number,
  ) {
    return this.service.createFluxFromOperation(projectId, id, saisonId);
  }

  @Get('budget-realise')
  budgetRealise(
    @ProjectId() projectId: number,
    @Query('saison_id') saisonId: string,
  ) {
    return this.service.budgetRealise(projectId, +saisonId);
  }
}