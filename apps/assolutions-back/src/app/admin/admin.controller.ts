import { Body, Controller, Delete, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { FluxFinancier_VM } from '@shared/lib/flux-financier.interface';
import { Operation_VM } from '@shared/lib/operation.interface';
import { Stock_VM } from '@shared/lib/stock.interface';
import { AdminService } from './admin.services';
import { PasswordGuard } from '../guards/password.guard';
import { AddInfo_VM } from '@shared/lib/addinfo.interface';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';


@Controller('admin')
export class AdminController {
constructor(private srv: AdminService) {}


// --- AddInfo / LV ---
@UseGuards(PasswordGuard)
@Get('addinfo/get/:id')
GetAddInfo(@Param('id') id: number) { return this.srv.GetAddInfo(+id); }


@UseGuards(PasswordGuard)
@Get('addinfo/list/:object_type')
GetAllAddInfoByType(@Param('object_type') t: string) { return this.srv.GetAllAddInfoByType(t); }


@Put('addinfo/add')
AddAddInfo(@Body() vm: AddInfo_VM) { return this.srv.AddAddInfo(vm); }


@Put('addinfo/update')
UpdateAddInfo(@Body() vm: AddInfo_VM) { return this.srv.UpdateAddInfo(vm); }


@UseGuards(PasswordGuard)
@Delete('addinfo/delete/:id')
DeleteAddInfo(@Param('id') id: number) { return this.srv.DeleteAddInfo(+id); }


// --- Bank accounts ---
@UseGuards(PasswordGuard)
@Get('bank/get/:id')
GetBank(@Param('id') id: number) { return this.srv.GetBank(+id); }


@UseGuards(PasswordGuard)
@Get('bank/getall/:project_id')
GetAllBanks(@Param('project_id') projectId: number) { return this.srv.GetAllBanks(+projectId); }


@Put('bank/add')
AddBank(@Headers('projectid') projectId: number, @Body() vm: CompteBancaire_VM) { return this.srv.AddBank(vm, +projectId); }


@Put('bank/update')
UpdateBank(@Headers('projectid') projectId: number, @Body() vm: CompteBancaire_VM) { return this.srv.UpdateBank(vm, +projectId); }


@UseGuards(PasswordGuard)
@Delete('bank/delete/:id')
DeleteBank(@Param('id') id: number) { return this.srv.DeleteBank(+id); }


// --- Financial flows ---
@UseGuards(PasswordGuard)
@Get('flow/get/:id')
GetFlow(@Param('id') id: number) { return this.srv.GetFlow(+id); }


@UseGuards(PasswordGuard)
@Get('flow/getall/:project_id')
GetAllFlows(@Param('project_id') projectId: number) { return this.srv.GetAllFlows(+projectId); }


@Put('flow/add')
AddFlow(@Headers('projectid') projectId: number, @Body() vm: FluxFinancier_VM) { return this.srv.AddFlow(vm, +projectId); }

@Put('flow/update')
UpdateFlow(@Headers('projectid') projectId: number, @Body() vm: FluxFinancier_VM) { return this.srv.UpdateFlow(vm, +projectId); }


@UseGuards(PasswordGuard)
@Delete('flow/delete/:id')
DeleteFlow(@Param('id') id: number) { return this.srv.DeleteFlow(+id); }


// --- Operations ---
@UseGuards(PasswordGuard)
@Get('op/get/:id')
GetOperation(@Param('id') id: number) { return this.srv.GetOperation(+id); }


@UseGuards(PasswordGuard)
@Get('op/by-account/:compte_id')
GetAllOpsForAccount(@Param('compte_id') compteId: number) { return this.srv.GetAllOperationsForAccount(+compteId); }


@UseGuards(PasswordGuard)
@Get('op/by-flow/:flow_id')
GetAllOpsForFlow(@Param('flow_id') flowId: number) { return this.srv.GetAllOperationsForFlow(+flowId); }


@Put('op/add')
AddOperation(@Body() vm: Operation_VM) { return this.srv.AddOperation(vm); }


@Put('op/update')
UpdateOperation(@Body() vm: Operation_VM) { return this.srv.UpdateOperation(vm); }


@UseGuards(PasswordGuard)
@Delete('op/delete/:id')
DeleteOperation(@Param('id') id: number) { return this.srv.DeleteOperation(+id); }


// --- Stock ---
@UseGuards(PasswordGuard)
@Get('stock/get/:id')
GetStock(@Param('id') id: number) { return this.srv.GetStock(+id); }


@UseGuards(PasswordGuard)
@Get('stock/getall/:project_id')
GetAllStock(@Param('project_id') pid: number) { return this.srv.GetAllStock(+pid); }


@Put('stock/add')
AddStock(@Headers('projectid') projectId: number, @Body() vm: Stock_VM) { return this.srv.AddStock(vm, +projectId); }


@Put('stock/update')
UpdateStock(@Headers('projectid') projectId: number, @Body() vm: Stock_VM) { return this.srv.UpdateStock(vm, +projectId); }


@UseGuards(PasswordGuard)
@Delete('stock/delete/:id')
DeleteStock(@Param('id') id: number) { return this.srv.DeleteStock(+id); }
}