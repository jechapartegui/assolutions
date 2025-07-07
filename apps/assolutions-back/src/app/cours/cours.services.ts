import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KeyValuePair } from "@shared/src/lib/autres.interface";
import { Cours } from "../bdd/cours";
import { CoursProfesseur } from "../bdd/cours_professeur";
import { LienGroupe } from "../bdd/lien-groupe";
import { LienGroupe_VM } from "@shared/src/lib/groupe.interface";
import { CoursProfesseurVM, CoursVM } from "@shared/src/lib/cours.interface";

@Injectable()
export class CoursService {
  constructor(
    @InjectRepository(Cours)
    private readonly CoursRepo: Repository<Cours>,
  @InjectRepository(CoursProfesseur) 
  private readonly CoursProfRepo: Repository<CoursProfesseur>,
  @InjectRepository(LienGroupe) private readonly LienGroupeRepo: Repository<LienGroupe>,
  ) {}

  async Get(id: number) {
   const cours = await this.CoursRepo.findOne({
  where: { id },
  relations: ['professeursCours', 'professeursCours.professeur']
});
    if (!cours) {
      throw new UnauthorizedException('NO_ITEM_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.to_cours(cours);

  }
async GetAll(saison_id: number) {
  const coursList = await this.CoursRepo.find({ where: { saison_id } });
  if (!coursList) {
    throw new UnauthorizedException('NO_ITEM_FOUND');
  }

  const results = await Promise.all(
    coursList.map(async (s) => {
      const result = this.to_cours(s);
      result.groupes = await this.getGroupesForCours(s.id);
      return result;
    })
  );

  return results;
}

  async GetAllLight(saison_id:number) {
    const pISSs = await this.CoursRepo.find({ where: { saison_id } });
    if (!pISSs) {
      throw new UnauthorizedException('NO_ITEM_FOUND');
    }
 return pISSs.map((plieu): KeyValuePair => {
  return {
    key: plieu.id,
    value: plieu.nom
  };
});


  }

  async Add(s: CoursVM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = this.toCours(s, project_id);
  const newISS = this.CoursRepo.create(objet_base);
  const saved = await this.CoursRepo.save(newISS);
    await this.updateGroupesForCours(saved.id, s.groupes);
  // 🔁 Ajouter les liaisons professeurs
  await this.updateCoursProfesseurs(saved.id, s.professeursCours);

  return saved.id;
}

async Update(s: CoursVM, project_id: number) {
  if (!s) {
    throw new BadRequestException('INVALID_ITEM');
  }

  const objet_base = this.toCours(s, project_id);
  const existing = await this.CoursRepo.findOne({ where: { id: s.id } });

  if (!existing) {
    throw new NotFoundException('ITEM_NOT_FOUND');
  }

  const updated = await this.CoursRepo.save({ ...existing, ...objet_base });

  // 🔁 Mettre à jour les liaisons professeurs
    await this.updateGroupesForCours(updated.id, s.groupes);
  await this.updateCoursProfesseurs(updated.id, s.professeursCours);

  return true;
}

private async updateCoursProfesseurs(cours_id: number, profs: CoursProfesseurVM[]) {
  // Supprimer les liaisons existantes
  await this.CoursProfRepo.delete({ cours_id });

  // Recréer les liaisons à partir des id
  const newLiaisons = profs.map(kvp => {
    const cp = new CoursProfesseur();
    cp.cours_id = cours_id;
    cp.prof_id = Number(kvp.prof_id);
    return cp;
  });

  await this.CoursProfRepo.save(newLiaisons);
}


async Delete(id: number) {
  const toDelete = await this.CoursRepo.findOne({ where: { id } });
  await this.CoursProfRepo.delete({ cours_id :id});
  await this.LienGroupeRepo.delete({ objet_type: 'cours', objet_id: id });

  if (!toDelete) {
    throw new NotFoundException('ITEM_NOT_FOUND');
  }

  await this.CoursRepo.remove(toDelete);
  return { success: true };
}


toCours(data: CoursVM, project_id: number): Cours {
  const c = new Cours();
    c.nom = data.nom;
    c.saison_id = data.saison_id;
    c.afficher_present = data.afficher_present;
    c.age_maximum = data.age_maximum!;
    c.age_minimum = data.age_minimum!;
    c.convocation_nominative = data.convocation_nominative;
    c.duree = data.duree;
    c.est_limite_age_maximum = data.est_limite_age_maximum;
    c.est_limite_age_minimum = data.est_limite_age_minimum;
    c.est_place_maximum = data.est_place_maximum;
    c.heure = data.heure;
    c.id = data.id;
    c.lieu_id = data.lieu_id;
    c.jour_semaine = data.jour_semaine;
    c.place_maximum = data.place_maximum!;
    c.prof_principal_id = data.prof_principal_id;
    c.project_id = project_id;
    c.lienGroupes = data.groupes.map(g => {
      const lien = new LienGroupe();
      lien.objet_type = 'cours';
      lien.objet_id = c.id;
      lien.groupe_id = g.id;
      return lien;
    });
    c.professeursCours = data.professeursCours.map(p => {
      const cp = new CoursProfesseur();
      cp.cours_id = c.id;
      cp.prof_id = Number(p.prof_id);
      return cp;
    });
  return c;
}
to_cours(entity: Cours): CoursVM {
  return {
    id: entity.id,
    nom: entity.nom,
    saison_id: entity.saison_id,
    afficher_present: entity.afficher_present,
    age_maximum: entity.age_maximum ?? undefined,
    age_minimum: entity.age_minimum?? undefined,
    convocation_nominative: entity.convocation_nominative,
    duree: entity.duree,
    est_limite_age_maximum: entity.est_limite_age_maximum,
    est_limite_age_minimum: entity.est_limite_age_minimum,
    est_place_maximum: entity.est_place_maximum,
    heure: entity.heure,
    lieu_id: entity.lieu_id,
    jour_semaine: entity.jour_semaine,
    place_maximum: entity.place_maximum ?? undefined,
    prof_principal_id: entity.prof_principal_id,
     groupes: entity.lienGroupes
      ?.map(lg => new LienGroupe_VM(
         lg.groupe_id ?? 0,
         lg.groupeEntity?.nom ?? '',
         Number(lg.id),
      ))
      ?? [],  // ← fallback ici
    professeursCours: entity.professeursCours
      ? entity.professeursCours.map(p => ({ 
          cours_id: entity.id,
          prof_id: p.prof_id
        }))
      : [], 
  };
}


async getGroupesForCours(cours_id: number): Promise<LienGroupe_VM[]> {
  const liens = await this.LienGroupeRepo
    .createQueryBuilder('lien')
    .leftJoinAndSelect('lien.groupeEntity', 'groupe')
    .where('lien.objet_type = :type', { type: 'cours' })
    .andWhere('lien.objet_id = :id', { id: cours_id })
    .select([
      'lien.id AS id_lien',
      'groupe.id AS id',
      'groupe.nom AS nom',
    ])
    .getRawMany();
 
  return liens.map(lien => new LienGroupe_VM(lien.id, lien.nom, lien.id_lien));
}


private async updateGroupesForCours(cours_id: number, groupes: LienGroupe_VM[]) {
  await this.LienGroupeRepo.delete({ objet_type: 'cours', objet_id: cours_id });

  const nouveauxLiens = groupes.map(vm => {
    const lien = new LienGroupe();
    lien.objet_type = 'cours';
    lien.objet_id = cours_id;
    lien.groupe_id = vm.id;
    return lien;
  });

  await this.LienGroupeRepo.save(nouveauxLiens);
}



}