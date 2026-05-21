import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaisonEntity } from '../saison/saison.entity';
import { SeanceEntity } from '../seance/seance.entity';
import { CreateInscriptionSeanceDto, UpdateInscriptionSeanceDto } from './inscription_seance.dto';
import { InscriptionSeanceEntity } from './inscription_seance.entity';
import { InscriptionSeance, InscriptionStatus_VM, Personne_VM, SeanceStatus_VM } from '@shared/index';
import { PersonneEntity } from '../personne/personne.entity';
import { LienGroupeEntity } from '../lien_groupe/lien_groupe.entity';
import { CompteEntity } from '../compte/compte.entity';

@Injectable()
export class InscriptionSeanceService {
  constructor(
    @InjectRepository(InscriptionSeanceEntity)
    private readonly repo: Repository<InscriptionSeanceEntity>,
    @InjectRepository(SeanceEntity)
    private readonly seanceRepo: Repository<SeanceEntity>,
    @InjectRepository(SaisonEntity)
    private readonly saisonRepo: Repository<SaisonEntity>,
    @InjectRepository(PersonneEntity)
private readonly personneRepo: Repository<PersonneEntity>,
    @InjectRepository(CompteEntity)
private readonly compteRepo: Repository<CompteEntity>,

@InjectRepository(LienGroupeEntity)
private readonly lienGroupeRepo: Repository<LienGroupeEntity>,
  ) {}

  private async assertSeanceInProject(seanceId: number, projectId: number) {
    const seance = await this.seanceRepo.findOne({ where: { seance_id: seanceId } });
    if (!seance) throw new NotFoundException(`seance ${seanceId} introuvable`);
    const saison = await this.saisonRepo.findOne({ where: { id: seance.saison_id } });
    if (!saison) throw new NotFoundException(`saison ${seance.saison_id} introuvable`);
    if (saison.project_id !== projectId) throw new ForbiddenException('WRONG_PROJECT');
  }

 async full(seanceId: number, projectId: number): Promise<InscriptionSeance[]> {
  const seance = await this.seanceRepo.findOne({
    where: { seance_id: seanceId },
  });

  if (!seance) {
    throw new NotFoundException(`seance ${seanceId} introuvable`);
  }

  const result: InscriptionSeance[] = [];

  const inscriptions = await this.repo.find({
    where: { seance_id: seanceId },
    order: { date_inscription: 'DESC' },
  });

  for (const inscription of inscriptions) {
   


    result.push({
      project_id: projectId,
      personne_id: inscription.personne_id,
      seance_id: inscription.seance_id,
      date_inscription: inscription.date_inscription,

      statut_inscription:
        this.toInscriptionStatus(inscription.statut_inscription),

      statut_seance:
        this.toSeanceStatus(inscription.statut_seance),
    });
  }

  if (seance.convocation_nominative) {
    return result;
  }

  const personnesDejaDansResult = new Set(
    result.map(r => Number(r.personne_id)),
  );

  const totalPersonnesInscrites = result.length;

  const groupes = await this.repo.query(
    `
    SELECT groupe_id
    FROM lien_groupe
    WHERE object_id = $1
      AND object_type = $2
    `,
    [seanceId, 'séance'],
  );

  for (const groupe of groupes) {
    const liensRiders = await this.repo.query(
      `
      SELECT object_id AS personne_id
      FROM lien_groupe
      WHERE groupe_id = $1
        AND object_type = $2
      `,
      [groupe.groupe_id, 'rider'],
    );

    for (const lien of liensRiders) {
      const personneId = Number(lien.personne_id);

      if (personnesDejaDansResult.has(personneId)) {
        continue;
      }

      const personnes = await this.repo.query(
        `
        SELECT *
        FROM personne
        WHERE id = $1
        `,
        [personneId],
      );

      if (!personnes.length) continue;

      const personne = personnes[0] as Personne_VM;

      if (personne.archive) continue;

      const age = this.getAge(personne.date_naissance);

      if (seance.age_minimum != null && age < seance.age_minimum) continue;
      if (seance.age_maximum != null && age > seance.age_maximum) continue;

     

    

      result.push({
        project_id: projectId,
        personne_id: personneId,
        seance_id: seanceId,
        date_inscription: null,
        statut_inscription: null,
        statut_seance: null,
      });

      personnesDejaDansResult.add(personneId);
    }
  }

  return result;
}

private getAge(dateNaissance: Date | string): number {
  const naissance = new Date(dateNaissance);
  const today = new Date();

  let age = today.getFullYear() - naissance.getFullYear();

  const mois = today.getMonth() - naissance.getMonth();
  if (
    mois < 0 ||
    (mois === 0 && today.getDate() < naissance.getDate())
  ) {
    age--;
  }

  return age;
}

private toInscriptionStatus(value: any): InscriptionStatus_VM | null {
  if (!value) return null;

  const v = String(value).toLowerCase();

  if (v === 'présent' || v === 'present') return InscriptionStatus_VM.PRESENT;
  if (v === 'absent') return InscriptionStatus_VM.ABSENT;
  if (v === 'convoqué' || v === 'convoque') return InscriptionStatus_VM.CONVOQUE;
  if (v === 'essai') return InscriptionStatus_VM.ESSAI;

  return null;
}

private toSeanceStatus(value: any): SeanceStatus_VM | null {
  if (!value) return null;

  const v = String(value).toLowerCase();

  if (v === 'présent' || v === 'present') return SeanceStatus_VM.PRESENT;
  if (v === 'absent') return SeanceStatus_VM.ABSENT;

  return null;
}
  async listForProject(projectId: number) {
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .innerJoin('saison', 'sa', 'sa.id = se.saison_id')
      .where('sa.project_id = :projectId', { projectId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }
  async upsert(dto: CreateInscriptionSeanceDto, projectId: number) {
  await this.assertSeanceInProject(dto.seance_id, projectId);

  const existing = await this.repo.findOne({
    where: { personne_id: dto.personne_id, seance_id: dto.seance_id },
  });

  if (!existing) {
    const entity = this.repo.create({
      ...dto,
      date_inscription: new Date(),
    } as any);
    return this.repo.save(entity);
  }

  existing.statut_inscription = dto.statut_inscription ?? null;
  existing.statut_seance = dto.statut_seance ?? null;
  existing.date_inscription = new Date();
  return this.repo.save(existing);
}



  async create(dto: CreateInscriptionSeanceDto, projectId: number) {
    await this.assertSeanceInProject(dto.seance_id, projectId);

    const entity = this.repo.create(dto as CreateInscriptionSeanceDto);
    return this.repo.save(entity);
  }

  async update(personneId: number, seanceId: number, dto: UpdateInscriptionSeanceDto, projectId: number) {
    await this.assertSeanceInProject(seanceId, projectId);
      const item = await this.repo.findOne({ where: { personne_id: personneId, seance_id: seanceId } });
    if (!item) {
    const  dtocreate = {
        personne_id: personneId,
        seance_id: seanceId, statut_inscription: dto.statut_inscription, statut_seance: dto.statut_seance } as CreateInscriptionSeanceDto;
    const entity = this.repo.create(dtocreate);
    return this.repo.save(entity);
    } else {
    Object.assign(item, dto);
    return this.repo.save(item);

    }
  }

  async remove(personneId: number, seanceId: number) {
      const item = await this.repo.findOne({ where: { personne_id: personneId, seance_id: seanceId } });
      if(!item) {
        throw new NotFoundException(`InscriptionSeance ${personneId}-${seanceId} introuvable`);
      }
    await this.repo.remove(item);
    return { ok: true };
  }
    async getForProject(personneId: number, seanceId: number, projectId: number) {
    await this.assertSeanceInProject(seanceId, projectId);

    const item = await this.repo.findOne({ where: { personne_id: personneId, seance_id: seanceId } });
    if (!item) throw new NotFoundException(`inscription_seance introuvable`);
    return item;
}

  async listBySaison(saisonId: number) {
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .where('se.saison_id = :saisonId', { saisonId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }

  async listBySaison_UniqueID(saisonId: number) {
    const inscriptions = await this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .where('se.saison_id = :saisonId', { saisonId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
   const uniqueIds = new Set<number>();
    inscriptions.forEach(i => uniqueIds.add(i.personne_id));
    return Array.from(uniqueIds);
  }

  async listByPersonneAndSaison(personneId: number, saisonId: number) {
    return this.repo
      .createQueryBuilder('i')
      .innerJoin('seance', 'se', 'se.seance_id = i.seance_id')
      .where('se.saison_id = :saisonId', { saisonId })
      .andWhere('i.personne_id = :personneId', { personneId })
      .orderBy('i.date_inscription', 'DESC')
      .getMany();
  }

  async GetAdherentCompte(login: string, seanceId: number) {
  const seance = await this.seanceRepo.findOne({
    where: { seance_id: seanceId },
  });

  if (!seance) {
    throw new NotFoundException(`seance ${seanceId} introuvable`);
  }

  const compte = await this.compteRepo.findOne({
    where: { login },
  });

  if (!compte) {
    throw new NotFoundException(`compte with login ${login} introuvable`);
  }

  const personnes = await this.personneRepo.find({
    where: { compte: compte.id },
  });

  if (!personnes.length) {
    throw new NotFoundException(`personne with login ${login} introuvable`);
  }

  const personneIds = personnes.map(p => p.id);

  const inscriptions = await this.full(seanceId, seance.saison_id);

  return inscriptions.filter(i => personneIds.includes(i.personne_id));
}

}
