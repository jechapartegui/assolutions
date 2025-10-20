import { BadRequestException, Injectable } from '@nestjs/common';
import { AddInfoService } from '../../crud/addinfo.service';
import { BankAccountService } from '../../crud/bankaccount.service';
import { FinancialFlowService } from '../../crud/financialflow.service';
import { OperationService } from '../../crud/operation.service';
import { StockService } from '../../crud/stock.service';
import {
  toAddInfoEntity,
  toAddInfoVM,
  toBankEntity,
  toBankVM,
  toFlowEntity,
  toFlowVM,
  toOpEntity,
  toOpVM,
  toStockEntity,
  toStockVM,
} from '../mapper';
import { AddInfo_VM } from '@shared/lib/addinfo.interface';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';
import { FluxFinancier_VM } from '@shared/lib/flux-financier.interface';
import { Operation_VM } from '@shared/lib/operation.interface';
import { Stock_VM } from '@shared/lib/stock.interface';

@Injectable()
export class AdminService {
  constructor(
    private addinfo: AddInfoService,
    private bank: BankAccountService,
    private flow: FinancialFlowService,
    private ops: OperationService,
    private stock: StockService
  ) {}

  // --- AddInfo / LV
  async GetAddInfo(id: number) {
    return toAddInfoVM(await this.addinfo.get(id));
  }
  async GetAllAddInfoByType(object_type: string, project_id: number, force:boolean) {
    if(force) {
      const existing = await this.addinfo.getAllByType(object_type, project_id);
      if(existing) {return toAddInfoVM(existing);} else 
      {
      const existing2 = await this.addinfo.getAllByType(object_type, null);
      if(existing2) {return toAddInfoVM(existing2);}
      }
      
    } else {
      const existing3 = await this.addinfo.getAllByType(object_type, null);
      if(existing3) {return toAddInfoVM(existing3);}
    }
   
  }
  async AddAddInfo(vm: AddInfo_VM) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toAddInfoVM(await this.addinfo.create(toAddInfoEntity(vm)));
  }
  async UpdateAddInfoLV(vm: AddInfo_VM, project_id:number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    vm.project_id = project_id;
    const existing = await this.addinfo.getAllByType(vm.object_type, project_id);
    if(existing){
      vm.id = existing.id;
    return toAddInfoVM(await this.addinfo.update(vm.id, toAddInfoEntity(vm)));

    } else {
    return toAddInfoVM(await this.addinfo.create(toAddInfoEntity(vm)));

    }
  }
  
  async UpdateAddInfo(vm: AddInfo_VM) {
    if (!vm || !vm.id) throw new BadRequestException('INVALID_ITEM');
    return toAddInfoVM(await this.addinfo.update(vm.id, toAddInfoEntity(vm)));
  }
  async DeleteAddInfo(id: number) {
    await this.addinfo.delete(id);
  }

  // --- Bank accounts
  async GetBank(id: number) {
    return toBankVM(await this.bank.get(id));
  }
  async GetAllBanks(project_id: number) {
    return (await this.bank.getAll(project_id)).map(toBankVM);
  }
  async AddBank(vm: CompteBancaire_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    vm.project_id = project_id;
    return toBankVM(await this.bank.create(toBankEntity(vm)));
  }
  async UpdateBank(vm: CompteBancaire_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    vm.project_id = project_id;
    return toBankVM(await this.bank.update(vm.id, toBankEntity(vm)));
  }
  async DeleteBank(id: number) {
    await this.bank.delete(id);
  }

  // --- Financial flows
  async GetFlow(id: number) {
    const flow = await this.flow.get(id);
    return toFlowVM(flow, flow.operations);
  }
  async GetAllFlows(project_id: number) {
    const flows = await this.flow.getAll(project_id);
    return flows.map((e) => toFlowVM(e));
  }
  async GetAllFlowsSeason(saison_id: number) {
    const flows = await this.flow.getAllSeason(saison_id);
    return flows.map((e) => toFlowVM(e, e.operations));
  }
  async AddFlow(vm: FluxFinancier_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toFlowVM(await this.flow.create(toFlowEntity(vm, project_id)));
  }
  async UpdateFlow(vm: FluxFinancier_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toFlowVM(
      await this.flow.update(vm.id, toFlowEntity(vm, project_id))
    );
  }
  async DeleteFlow(id: number) {
    await this.flow.delete(id);
  }

  // --- Operations
  async GetOperation(id: number) {
    return toOpVM(await this.ops.get(id));
  }
  async GetAllOperationsForAccount(compte_id: number) {
    return (await this.ops.getAllByAccount(compte_id)).map(toOpVM);
  }
  async GetAllOperationsForFlow(flow_id: number) {
    return (await this.ops.getAllByFlow(flow_id)).map(toOpVM);
  }
  async AddOperation(vm: Operation_VM) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toOpVM(await this.ops.create(toOpEntity(vm)));
  }
  async UpdateOperation(vm: Operation_VM) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toOpVM(await this.ops.update(vm.id, toOpEntity(vm)));
  }
  async DeleteOperation(id: number) {
    await this.ops.delete(id);
  }

  // --- Stock
  async GetStock(id: number) {
    return toStockVM(await this.stock.get(id));
  }
  async GetAllStock(project_id: number) {
    return (await this.stock.getAll(project_id)).map(toStockVM);
  }
  async AddStock(vm: Stock_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toStockVM(await this.stock.create(toStockEntity(vm, project_id)));
  }
  async UpdateStock(vm: Stock_VM, project_id: number) {
    if (!vm) throw new BadRequestException('INVALID_ITEM');
    return toStockVM(
      await this.stock.update(vm.id, toStockEntity(vm, project_id))
    );
  }
  async DeleteStock(id: number) {
    await this.stock.delete(id);
  }
}
