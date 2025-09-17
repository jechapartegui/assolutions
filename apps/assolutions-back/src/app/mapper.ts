import { AddInfo } from "../entities/addinfo.entity";
import { BankAccount } from "../entities/compte_bancaire.entity";
import { FinancialFlow } from "../entities/flux_financier.entity";
import { Operation } from "../entities/operation.entity";
import { StockItem } from "../entities/stock.entity";
import { AddInfo_VM } from '@shared/lib/addinfo.interface';
import { CompteBancaire_VM } from '@shared/lib/compte-bancaire.interface';
import { FluxFinancier_VM } from '@shared/lib/flux-financier.interface';
import { Operation_VM } from '@shared/lib/operation.interface';
import { Stock_VM } from '@shared/lib/stock.interface';
import { toPersonneLight_VM } from "./member/member.services";
import { Document } from "../entities/document.entity";

function parseJson<T>(s?: string | null): T | null {
if (!s) return null;
try { return JSON.parse(s) as T; } catch { return null; }
}
function stringifyJson(obj: unknown): string | null {
if (obj == null) return null;
return JSON.stringify(obj);
}


export function toAddInfoVM(e: AddInfo): AddInfo_VM {
return { id: e.id, object_id: e.objectId, object_type: e.objectType, value_type: e.valueType, text: e.text };
}
export function toAddInfoEntity(vm: AddInfo_VM): AddInfo {
const e = new AddInfo();
if (vm.id) e.id = vm.id;
e.objectId = vm.object_id; e.objectType = vm.object_type; e.valueType = vm.value_type; e.text = vm.text;
return e;
}


export function toBankVM(e: BankAccount): CompteBancaire_VM {
return {
id: e.id, project_id: e.projectId, nom: e.name, type: e.type, info: e.info ?? undefined,
actif: !!e.active, iban: e.iban ?? undefined,
carte: parseJson<Record<string, unknown>>(e.cardJson),
carte_titulaire_id : e.cardHolder,
};
}
export function toBankEntity(vm: CompteBancaire_VM): BankAccount {
const e = new BankAccount();
if (vm.id) e.id = vm.id;
e.projectId = vm.project_id; e.name = vm.nom; e.type = vm.type; e.info = vm.info ?? null; e.active = !!vm.actif;
e.iban = vm.iban ?? null; e.cardJson = stringifyJson(vm.carte); e.cardHolder = vm.carte_titulaire_id;
return e;
}


export function toFlowVM(e: FinancialFlow, operations : Operation [] = [], stocks: StockItem[] = [], doc:Document[] = [] ): FluxFinancier_VM {
return {
id: e.id, libelle: e.label, date: e.date, classe_comptable: e.accountingClass,
destinataire: parseJson(e.recipient)!, recette: !!e.isIncome, statut: e.status, montant: e.amount, nb_paiement: e.nbpayment, liste_stock : stocks.map(x => toStockVM(x)), Documents: doc,
temp_id : 0,
info: e.info ?? undefined,  saison_id: e.seasonId ?? undefined, liste_operation : operations.map(x => toOpVM(x)), 
};
}

export function toFlowEntity(vm: FluxFinancier_VM, projectId:number): FinancialFlow {
const e = new FinancialFlow();
if (vm.id) e.id = vm.id;
e.projectId = projectId;
e.label = vm.libelle; e.date = vm.date; e.accountingClass = vm.classe_comptable;
e.recipient = stringifyJson(vm.destinataire)!; e.isIncome = !!vm.recette; e.status = vm.statut; e.amount = vm.montant;
e.info = vm.info ?? null;  e.seasonId = vm.saison_id ?? null;
return e;
}


export function toOpVM(e: Operation): Operation_VM {
return {
id: e.id, solde: e.balance, date_operation: e.operationDate, mode: e.mode,
destinataire: parseJson(e.recipient)!, paiement_execute: !!e.executed, temp_id : 0,
compte_bancaire_id: e.bankAccountId, flux_financier_id: e.financialFlowId, info: e.info ?? undefined,
};
}
export function toOpEntity(vm: Operation_VM): Operation {
const e = new Operation();
if (vm.id) e.id = vm.id;
e.balance = vm.solde; e.operationDate = vm.date_operation; e.mode = vm.mode;
e.recipient = stringifyJson(vm.destinataire)!; e.executed = !!vm.paiement_execute;
e.bankAccountId = vm.compte_bancaire_id; e.financialFlowId = vm.flux_financier_id; e.info = vm.info ?? null;
return e;
}


export function toStockVM(e: StockItem): Stock_VM {
return {
id: e.id, qte: e.quantity, lieu_stockage: parseJson(e.storagePlace)!, type_stock: e.stockType,
valeur_achat: e.buyValue ?? undefined, date_achat: e.buyDate ?? undefined, flux_financier_id: e.financialFlowId ?? undefined,
libelle: e.label, info: e.info, temp_id : 0, to_sell : false
};
}
export function toStockEntity(vm: Stock_VM, project_id:number): StockItem {
const e = new StockItem();
if (vm.id) e.id = vm.id; e.projectId = project_id;
e.quantity = vm.qte; e.storagePlace = stringifyJson(vm.lieu_stockage)!; e.stockType = vm.type_stock;
e.buyValue = vm.valeur_achat ?? null; e.buyDate = vm.date_achat ?? null; e.financialFlowId = vm.flux_financier_id ?? null;
e.label = vm.libelle; e.info = vm.info;
return e;
}