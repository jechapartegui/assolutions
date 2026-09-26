import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContratProfEntity } from '../contrat_prof/contrat_prof.entity';
import { DocumentEntity } from '../document/document.entity';
import { FluxFinancierEntity } from '../flux_financier/flux_financier.entity';
import { ProfesseurEntity } from '../professeur/professeur.entity';
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

  async get(id: number, projectId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra) throw new NotFoundException('CRA_NOT_FOUND');
    if (cra.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
    const lignes = await this.ligneRepo.find({ where: { cra_id: id }, order: { date: 'ASC', id: 'ASC' } });
    const facture = await this.factureRepo.findOne({ where: { cra_id: id } });
    return { ...cra, lignes, facture };
  }

  async addLine(id: number, dto: AddCraLigneDto, projectId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_LOCKED');
    const montant = dto.quantite * dto.taux;
    await this.ligneRepo.save(this.ligneRepo.create({
      cra_id: id, seance_professeur_id: null, date: dto.date, type: dto.type,
      libelle: dto.libelle, quantite: dto.quantite.toFixed(2), taux: dto.taux.toFixed(2), montant: montant.toFixed(2),
    }));
    await this.recalculate(id);
    return this.get(id, projectId);
  }

  async removeLine(id: number, lineId: number, projectId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_LOCKED');
    const line = await this.ligneRepo.findOne({ where: { id: lineId, cra_id: id } });
    if (!line) throw new NotFoundException('CRA_LINE_NOT_FOUND');
    await this.ligneRepo.remove(line);
    await this.recalculate(id);
    return this.get(id, projectId);
  }

  async validate(id: number, projectId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    if (cra.statut !== 'BROUILLON') throw new BadRequestException('CRA_ALREADY_VALIDATED');
    await this.recalculate(id);
    cra.statut = 'VALIDE';
    cra.date_validation = new Date();
    cra.updated_at = new Date();
    await this.craRepo.save(cra);
    return this.get(id, projectId);
  }

  async finalizeInvoice(id: number, dto: FinalizeFactureDto, projectId: number) {
    const cra = await this.craRepo.findOne({ where: { id } });
    if (!cra || cra.project_id !== projectId) throw new NotFoundException('CRA_NOT_FOUND');
    if (cra.statut !== 'VALIDE') throw new BadRequestException('CRA_MUST_BE_VALIDATED');
    if (await this.factureRepo.findOne({ where: { cra_id: id } })) throw new BadRequestException('INVOICE_ALREADY_EXISTS');
    const document = await this.documentRepo.findOne({ where: { id: dto.document_id } });
    if (!document || (document.project_id != null && document.project_id !== projectId)) throw new NotFoundException('DOCUMENT_NOT_FOUND');

    const { contrat, saison } = await this.contratForProject(cra.contrat_prof_id, projectId);
    const prof = await this.profRepo.findOne({ where: { id: contrat.professeur_id } });
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
