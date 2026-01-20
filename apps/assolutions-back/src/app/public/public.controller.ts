import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicPlanningService } from './public.services';

@Controller('public')
export class PublicPlanningController {
  constructor(private readonly publicPlanning: PublicPlanningService) {}

  /**
   * GET /public/cours/:projectId
   * -> cours de la saison active du projet
   */
  @Get('cours/:projectId')
  async getCoursByProject(@Param('projectId') projectId: number) {
    return this.publicPlanning.getCoursByProject(projectId);
  }

  /**
   * GET /public/seances/:projectId?from=YYYY-MM-DD&to=YYYY-MM-DD
   * -> séances de la saison active du projet sur une plage
   */
  @Get('seances/:projectId')
  async getSeancesByProject(
    @Param('projectId') projectId: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.publicPlanning.getSeancesByProject(projectId, from, to);
  }
}
