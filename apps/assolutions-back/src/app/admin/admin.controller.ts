import { Body, Controller, Get, Headers, Param, ParseBoolPipe, Post, Put, UseGuards } from '@nestjs/common';
import { FluxFinancier_VM } from '@shared/lib/flux-financier.interface';
import { Operation_VM } from '@shared/lib/operation.interface';
import { Stock_VM } from '@shared/lib/stock.interface';
import { AdminService } from './admin.services';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AddInfo_VM } from '@shared/lib/addinfo.interface';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';


@Controller('admin')
export class AdminController {
constructor(private srv: AdminService) {}


// --- AddInfo / LV ---
@UseGuards(JwtAuthGuard)
@Get('addinfo/get/:id')
GetAddInfo(@Param('id') id: number) { return this.srv.GetAddInfo(+id); }


@UseGuards(JwtAuthGuard)
@Get('addinfo/list/:object_type/:force')
GetAllAddInfoByType(
  @Headers('projectid') projectId: number,
  @Param('object_type') t: string,
  @Param('force', ParseBoolPipe) force: boolean,
) { return this.srv.GetAllAddInfoByType(t, projectId, force); }


@Put('addinfo/add')
AddAddInfo(@Body() vm: AddInfo_VM) { return this.srv.AddAddInfo(vm); }

@UseGuards(JwtAuthGuard)
@Put('addinfo/update_lv')
UpdateAddInfoLV(@Headers('projectid') projectId: number, @Body() vm: AddInfo_VM) { return this.srv.UpdateAddInfoLV(vm, projectId); }

@UseGuards(JwtAuthGuard)
@Put('addinfo/update')
UpdateAddInfo(@Body() vm: AddInfo_VM) { return this.srv.UpdateAddInfo(vm); }


@UseGuards(JwtAuthGuard)
@Post('addinfo/delete')
DeleteAddInfo(@Body() body: { id: number}) { return this.srv.DeleteAddInfo(body.id); }


// --- Bank accounts ---
@UseGuards(JwtAuthGuard)
@Get('bank/get/:id')
GetBank(@Param('id') id: number) { return this.srv.GetBank(+id); }


@UseGuards(JwtAuthGuard)
@Get('bank/getall/')
GetAllBanks(@Headers('projectid') projectId: number) { return this.srv.GetAllBanks(+projectId); }


@UseGuards(JwtAuthGuard)
@Put('bank/add')
AddBank(@Headers('projectid') projectId: number, @Body() vm: CompteBancaire_VM) { return this.srv.AddBank(vm, +projectId); }


@UseGuards(JwtAuthGuard)
@Put('bank/update')
UpdateBank(@Headers('projectid') projectId: number, @Body() vm: CompteBancaire_VM) { return this.srv.UpdateBank(vm, +projectId); }


@UseGuards(JwtAuthGuard)
@Post('bank/delete')
DeleteBank(@Body() body: { id: number}) { return this.srv.DeleteBank(+body.id); }


// --- Financial flows ---
@UseGuards(JwtAuthGuard)
@Get('flow/get/:id')
GetFlow(@Param('id') id: number) { return this.srv.GetFlow(+id); }


@UseGuards(JwtAuthGuard)
@Get('flow/getall/')
GetAllFlows(@Headers('projectid') projectId: number) { return this.srv.GetAllFlows(projectId); }

@UseGuards(JwtAuthGuard)
@Get('flow/getall_season/:saison_id')
GetAllSeasonFlows(@Param('saison_id') seasonId: number) { return this.srv.GetAllFlowsSeason(seasonId); }


@UseGuards(JwtAuthGuard)
@Put('flow/add')
AddFlow(@Headers('projectid') projectId: number, @Body() vm: FluxFinancier_VM) { return this.srv.AddFlow(vm, +projectId); }


@UseGuards(JwtAuthGuard)
@Put('flow/update')
UpdateFlow(@Headers('projectid') projectId: number, @Body() vm: FluxFinancier_VM) { return this.srv.UpdateFlow(vm, +projectId); }


@UseGuards(JwtAuthGuard)
@Post('flow/delete/')
DeleteFlow(@Body() body: { id: number})  { return this.srv.DeleteFlow(body.id); }


// --- Operations ---
@UseGuards(JwtAuthGuard)
@Get('op/get/:id')
GetOperation(@Param('id') id: number) { return this.srv.GetOperation(+id); }


@UseGuards(JwtAuthGuard)
@Get('op/by-account/:compte_id')
GetAllOpsForAccount(@Param('compte_id') compteId: number) { return this.srv.GetAllOperationsForAccount(+compteId); }


@UseGuards(JwtAuthGuard)
@Get('op/by-flow/:flow_id')
GetAllOpsForFlow(@Param('flow_id') flowId: number) { return this.srv.GetAllOperationsForFlow(+flowId); }


@UseGuards(JwtAuthGuard)
@Put('op/add')
AddOperation(@Body() vm: Operation_VM) { return this.srv.AddOperation(vm); }


@UseGuards(JwtAuthGuard)
@Put('op/update')
UpdateOperation(@Body() vm: Operation_VM) { return this.srv.UpdateOperation(vm); }


@UseGuards(JwtAuthGuard)
@Post('op/delete/')
DeleteOperation(@Body() body: { id: number})  { return this.srv.DeleteOperation(body.id); }


// --- Stock ---
@UseGuards(JwtAuthGuard)
@Get('stock/get/:id')
GetStock(@Param('id') id: number) { return this.srv.GetStock(+id); }


@UseGuards(JwtAuthGuard)
@Get('stock/getall/:project_id')
GetAllStock(@Param('project_id') pid: number) { return this.srv.GetAllStock(+pid); }


@Put('stock/add')
AddStock(@Headers('projectid') projectId: number, @Body() vm: Stock_VM) { return this.srv.AddStock(vm, +projectId); }


@Put('stock/update')
UpdateStock(@Headers('projectid') projectId: number, @Body() vm: Stock_VM) { return this.srv.UpdateStock(vm, +projectId); }


@UseGuards(JwtAuthGuard)
@Post('stock/delete/')
DeleteStock(@Body() body: { id: number}) { return this.srv.DeleteStock(body.id); }
}