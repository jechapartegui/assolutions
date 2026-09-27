import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { DocumentEntity } from '../document/document.entity';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { ProfesseurEntity } from '../professeur/professeur.entity';
import { PersonneEntity } from '../personne/personne.entity';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceProfesseurEntity } from '../seance_professeur/seance_professeur.entity';
import { AddCraLigneDto, FinalizeFactureDto, OpenCraDto } from './cra.dto';
import { CraEntity, CraLigneEntity, FactureProfEntity } from './cra.entity';

@Injectable()
export class CraService {
  constructor(
    @InjectRepository(CraEntity) private readonly craRepo: Repository<CraEntity>,
    @InjectRepository(CraLigneEntity) private readonly ligneRepo: Repository<CraLigneEntity>,
    @InjectRepository(FactureProfEntity) private readonly factureRepo: Repository<FactureProfEntity>,
    @InjectRepository(ContratProfEntity) private readonly contratRepo: Repository<ContratProfEntity>,
    @InjectRepository(ProfesseurEntity) private readonly profRepo: Repository<ProfesseurEntity>,
    @InjectRepository(PersonneEntity) private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(SaisonEntity) private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(SeanceProfesseurEntity) private readonly spRepo: Repository<SeanceProfesseurEntity>,
    @InjectRepository(DocumentEntity) private readonly documentRepo: Repository<DocumentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async contratForProject(id: number, projectId: number) {
    const contrat = await this.contratRepo.findOne({ where: { id } });
    if (!contrat) throw new NotFoundException('CONTRAT_PROF_NOT_FOUND');
    const saison = await this.saisonRepo.findOne({ where: { id: contrat.saison_id } });
    if (!saison || saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    return { contrat, saison };
  }

  async getProfessorContext(userId: number, projectId: number) {
    const personnes = await this.personneRepo.find({ where: { compte: userId, archive: false } });
    const personIds = personnes.map((p) => p.id);
    if (!personIds.length) throw new ForbiddenException('PROFESSOR_PROFILE_NOT_FOUND');

    const profs = await this.profRepo.find({ where: { id: In(personIds), project_id: projectId } });
    const profIds = profs.map((p) => p.id);
    if (!profIds.length) throw new ForbiddenException('PROFESSOR_PROFILE_NOT_FOUND');

    const saison = await this.saisonRepo.findOne({ where: { project_id: projectId, active: true } });
    if (!saison) throw new NotFoundException('ACTIVE_SEASON_NOT_FOUND');

    const contrats = await this.contratRepo.find({
      where: { saison_id: saison.id, professeur_id: In(profIds) },
      order: { date_debut: 'ASC', id: 'ASC' },
    });
    if (!contrats.length) throw new NotFoundException('PROFESSOR_CONTRACT_NOT_FOUND');

    const today = new Date();
    const todayIso = this.localIsoDate(today);
    const available = new Map<string, { annee: number; mois: number; contrat_prof_id: number }>();

    for (const contrat of contrats) {
      const start = contrat.date_debut > saison.date_debut ? contrat.date_debut : saison.date_debut;
      const contractualEnd = contrat.date_fin && contrat.date_fin < saison.date_fin ? contrat.date_fin : saison.date_fin;
      const end = contractualEnd < todayIso ? contractualEnd : todayIso;
      if (start > end) continue;

      const cursor = new Date(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, 1);
      const last = new Date(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, 1);
      while (cursor <= last) {
        const annee = cursor.getFullYear();
        const mois = cursor.getMonth() + 1;
        const key = `${annee}-${String(mois).padStart(2, '0')}`;
        if (available.has(key)) throw new BadRequestException('MULTIPLE_PROFESSOR_CONTRACTS_FOR_MONTH');
        available.set(key, { annee, mois, contrat_prof_id: contrat.id });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const months = Array.from(available.values()).sort((a, b) => b.annee - a.annee || b.mois - a.mois);
    const existing = months.length
      ? await this.craRepo.find({ where: { contrat_prof_id: In(contrats.map((x) => x.id)) } })
      : [];

    return {
      saison: { id: saison.id, nom: saison.nom, date_debut: saison.date_debut, date_fin: saison.date_fin },
      professeur_ids: profIds,
      months: months.map((m) => {
        const cra = existing.find((x) => x.contrat_prof_id === m.contrat_prof_id && x.annee === m.annee && x.mois === m.mois);
        return { annee: m.annee, mois: m.mois, statut: cra?.statut ?? 'A_SAISIR', cra_id: cra?.id ?? null };
      }),
    };
  }

  async openMine(userId: number, projectId: number, annee: number, mois: number) {
    if (!Number.isInteger(annee) || !Number.isInteger(mois) || mois < 1 || mois > 12) {
      throw new BadRequestException('INVALID_CRA_PERIOD');
    }
    const context = await this.getProfessorContext(userId, projectId);
    const allowed = context.months.find((x) => x.annee === annee && x.mois === mois);
    if (!allowed) throw new BadRequestException('CRA_PERIOD_NOT_AVAILABLE');

    const personnes = await this.personneRepo.find({ where: { compte: userId, archive: false } });
    const profIds = (await this.profRepo.find({
      where: { id: In(personnes.map((p) => p.id)), project_id: projectId },
    })).map((p) => p.id);
    const saison = await this.saisonRepo.findOne({ where: { project_id: projectId, active: true } });
    if (!saison) throw new NotFoundException('ACTIVE_SEASON_NOT_FOUND');
    const contrats = await this.contratRepo.find({ where: { saison_id: saison.id, professeur_id: In(profIds) } });
    const monthStart = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const monthEndDate = new Date(annee, mois, 0);
    const monthEnd = this.localIsoDate(monthEndDate);
    const matches = contrats.filter((x) => x.date_debut <= monthEnd && (!x.date_fin || x.date_fin >= monthStart));
    if (matches.length !== 1) throw new BadRequestException('PROFESSOR_CONTRACT_NOT_UNIQUE_FOR_PERIOD');

    return this.open({ contrat_prof_id: matches[0].id, annee, mois }, projectId);
  }

  private async assertCraOwner(cra: CraEntity, projectId: number, userId: number) {
    if (cra.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    const contrat = await this.contratRepo.findOne({ where: { id: cra.contrat_prof_id } });
    if (!contrat) throw new NotFoundException('CONTRAT_PROF_NOT_FOUND');
    const personne = await this.personneRepo.findOne({ where: { id: contrat.professeur_id, compte: userId, archive: false } });
    const prof = await this.profRepo.findOne({ where: { id: contrat.professeur_id, project_id: projectId } });
    if (!personne || !prof) throw new ForbiddenException('CRA_NOT_OWNED_BY_USER');
  }

  private localIsoDate(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async open(dto: OpenCraDto, projectId: number) {
    const { contrat, saison } = await this.contratForProject(dto.contrat_prof_id, projectId);
    let cra = await this.craRepo.findOne({ where: { contrat_prof_id: contrat.id, annee: dto.annee, mois: dto.mois } });
    if (cra) return this.get(cra.id, projectId);

    cra = await this.craRepo.save(this.craRepo.create({
      project_id: projectId, saison_id: saison.id, contrat_prof_id: contrat.id,
      annee: dto.annee, mois: dto.mois, statut: 'BROUILLON', montant_total: '0',
    }));

    const debut = `${dto.annee}-${String(dto.mois).padStart(2, '0')}-01`;
    const finDate = new Date(dto.annee, dto.mois, 0);
    const fin = `${dto.annee}-${String(dto.mois).padStart(2, '0')}-${String(finDate.getDate()).padStart(2, '0')}`;
    const prof = await this.profRepo.findOne({ where: { id: contrat.professeur_id } });
    const defaultRate = Number(prof?.hourly_rate ?? 0);

    const rows = await this.spRepo.createQueryBuilder('sp')
      .innerJoin('seance', 's', 's.seance_id = sp.seance_id')
      .where('sp.professeurcontract_id = :contratId', { contratId: contrat.id })
      .andWhere('s.date_seance BETWEEN :debut AND :fin', { debut, fin })
      .select(['sp.id AS id', 'sp.minutes AS minutes', 'sp.cout AS cout', 's.date_seance AS date', 's.label AS label'])
      .orderBy('s.date_seance', 'ASC').getRawMany();

    if (rows.length) {
      await this.ligneRepo.save(rows.map((r: any) => {
        const qty = Number(r.minutes) / 60;
        const rate = r.cout != null && Number(r.cout) > 0 ? Number(r.cout) / Math.max(qty, 0.01) : defaultRate;
        return this.ligneRepo.create({
          cra_id: cra!.id, seance_professeur_id: Number(r.id), date: r.date, type: 'SEANCE',
          libelle: r.label || 'Séance', quantite: qty.toFixed(2), taux: rate.toFixed(2),
          montant: (qty * rate).toFixed(2),
        });
      }));
    }
    await this.recalculate(cra.id);
    return this.get(cra.id, projectId);
  }

  async get(id: number, projectId: number, userId?: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra) throw new NotFoundException('CRA_NOT_FOUND');
    if (userId != null) await this.assertCraOwner(cra, projectId, userId);
    else if (cra.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    const lignes = await this.ligneRepo.find({ where: { cra_id: id }, order: { date: 'ASC', id: 'ASC' } });
    const facture = await this.factureRepo.findOne({ where: { cra_id: id } });
    return { ...cra, lignes, facture };
  }

  async addLine(id: number, dto: AddCraLigneDto, projectId: number, userId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    await this.assertCraOwner(cra, projectId, userId);
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_LOCKED');
    const periodStart = `${cra.annee}-${String(cra.mois).padStart(2, '0')}-01`;
    const periodEnd = this.localIsoDate(new Date(cra.annee, cra.mois, 0));
    const today = this.localIsoDate(new Date());
    const maxDate = periodEnd < today ? periodEnd : today;
    if (dto.date < periodStart || dto.date > maxDate) throw new BadRequestException('CRA_LINE_DATE_OUTSIDE_PERIOD');
    if (!['PRESTATION', 'FRAIS', 'REDUCTION'].includes(dto.type)) throw new BadRequestException('INVALID_CRA_LINE_TYPE');
    if (dto.quantite <= 0 || dto.taux < 0) throw new BadRequestException('INVALID_CRA_LINE_AMOUNT');
    const sign = dto.type === 'REDUCTION' ? -1 : 1;
    const montant = sign * dto.quantite * dto.taux;
    await this.ligneRepo.save(this.ligneRepo.create({
      cra_id: id, seance_professeur_id: null, date: dto.date, type: dto.type,
      libelle: dto.libelle, quantite: dto.quantite.toFixed(2), taux: dto.taux.toFixed(2), montant: montant.toFixed(2),
    }));
    await this.recalculate(id);
    return this.get(id, projectId, userId);
  }

  async removeLine(id: number, lineId: number, projectId: number, userId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    await this.assertCraOwner(cra, projectId, userId);
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_LOCKED');
    const line = await this.ligneRepo.findOne({ where: { id: lineId, cra_id: id } });
    if (!line) throw new NotFoundException('CRA_LINE_NOT_FOUND');
    await this.ligneRepo.remove(line);
    await this.recalculate(id);
    return this.get(id, projectId, userId);
  }

  async validate(id: number, projectId: number, userId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    await this.assertCraOwner(cra, projectId, userId);
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_ALREADY_VALIDATED');
    await this.recalculate(id);
    cra.statut = 'VALIDE';
    cra.date_validation = new Date();
    cra.updated_at = new Date();
    await this.craRepo.save(cra);
    return this.get(id, projectId, userId);
  }

  async finalizeInvoice(id: number, dto: FinalizeFactureDto, projectId: number, userId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    await this.assertCraOwner(cra, projectId, userId);
    if (cra.statut !== 'VALIDE') throw new BadRequestException('CRA_MUST_BE_VALIDATED');
    if (await this.factureRepo.findOne({ where: { cra_id: id } })) throw new BadRequestException('INVOICE_ALREADY_EXISTS');
    const document = await this.documentRepo.findOne({ where: { id: dto.document_id } });
    if (!document || (document.project_id != null && document.project_id !== projectId)) throw new NotFoundException('DOCUMENT_NOT_FOUND');

    const { contrat, saison } = await this.contratForProject(cra.contrat_prof_id, projectId);
    const amount = Number(cra.montant_total);

    return this.dataSource.transaction(async (manager) => {
      const flux = await manager.getRepository(FluxFinancierEntity).save(manager.getRepository(FluxFinancierEntity).create({
        libelle: `Facture professeur ${dto.numero || ''} - ${String(cra.mois).padStart(2, '0')}/${cra.annee}`.trim(),
        date: dto.date_facture, destinataire: `Professeur #${contrat.professeur_id}`, recette: false,
        statut: 0, montant: amount, info: `CRA #${cra.id}`, project_id: projectId, saison_id: saison.id,
        classe_comptable_id: null, nb_paiement: 1, type_frais: 'FACTURE_PROF', personne_id: contrat.professeur_id,
        contrat_prof_id: contrat.id, flux_systeme: true, origine: 'CRA',
      }));

      const facture = await manager.getRepository(FactureProfEntity).save(manager.getRepository(FactureProfEntity).create({
        cra_id: cra.id, flux_financier_id: flux.id, document_id: document.id, numero: dto.numero ?? null,
        date_facture: dto.date_facture, montant_ttc: amount.toFixed(2), statut: 'DEPOSEE',
      }));

      document.objet_type = 'FLUX_FINANCIER';
      document.objet_id = flux.id;
      document.typedoc = 'Facture';
      await manager.getRepository(DocumentEntity).save(document);
      cra.statut = 'FACTURE';
      cra.updated_at = new Date();
      await manager.getRepository(CraEntity).save(cra);
      return { cra, facture, flux };
    });
  }

  private async recalculate(id: number) {
    const rows = await this.ligneRepo.find({ where: { cra_id: id } });
    const total = rows.reduce((s, x) => s + Number(x.montant), 0);
    await this.craRepo.update(id, { montant_total: total.toFixed(2), updated_at: new Date() });
  }
}
