import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Lieu } from "../bdd/lieu";
import { lieu } from "@shared/compte/src/lib/lieu.interface";
import { KeyValuePair } from "@shared/compte/src/lib/autres.interface";

@Injectable()
export class LieuService {
  constructor(
    @InjectRepository(Lieu)
    private readonly LieuRepo: Repository<Lieu>,
  ) {}
  async Get(id: number) {
    const plieu = await this.LieuRepo.findOne({ where: { id } });
    if (!plieu) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    //transformer plieu en lieu ou id =id nom= nom mais ou on deserialise adresse .
    return this.tolieu(plieu);

  }
  async GetAll(project_id: number) {
    const lieux = await this.LieuRepo.find({ where: { project_id } });
    if (!lieux) {
      throw new UnauthorizedException('NO_USER_FOUND');
    }
    return lieux.map((plieu) => {
      return this.tolieu(plieu);
    });
  }

private tolieu(plieu: Lieu): lieu {
  let adre: any = null;

  try {
    // Si l'adresse existe et peut être parsée
    adre = plieu.adresse && plieu.adresse.length > 2 ? JSON.parse(plieu.adresse) : null;
  } catch (e) {
    adre = null; // En cas d'échec du parsing
  }

  // Valeurs par défaut si l'adresse est manquante ou invalide
const adresse = adre?.Street || "";
const code_postal = adre?.PostCode || "";
const ville = adre?.City || "";


  const lieu: lieu = {
    id: plieu.id,
    nom: plieu.nom,
    adresse,
    code_postal,
    ville,
  };

  return lieu;
}

  
private toLieu(pLieu: lieu, project_id: number): Lieu {
  // Crée un objet pour l'adresse
  const adresseObj = {
    name: pLieu.adresse,        // Le nom de l'adresse
    postcode: pLieu.code_postal, // Le code postal
    city: pLieu.ville           // La ville
  };

  // Sérialisation de l'adresse sous forme de chaîne JSON
  const const_adresse = JSON.stringify(adresseObj);

  const L: Lieu = {
    id: pLieu.id,
    nom: pLieu.nom,
    project_id: project_id,
    adresse: const_adresse, // Assure que l'adresse est bien stockée en JSON
    shared: false
  };

  return L;
}

  
    async GetAllLight(project_id:number) {
      const pISSs = await this.LieuRepo.find({ where: { project_id } });
      if (!pISSs) {
        throw new UnauthorizedException('NO_LOCATION_FOUND');
      }
   return pISSs.map((plieu): KeyValuePair => {
    return {
      key: plieu.id,
      value: plieu.nom
    };
  });
  
  
    }
  
    async Add(s: lieu, project_id :number) {
    if (!s) {
      throw new BadRequestException('INVALID_LOCATION');
    }
    const objet_base = this.toLieu(s, project_id);
  
    const newISS = this.LieuRepo.create(objet_base);
    const saved = await this.LieuRepo.save(newISS);
    return this.tolieu(saved).id;
  }
  async Update(s: lieu, project_id :number) {
    if (!s) {
      throw new BadRequestException('INVALID_LOCATION');
    }
    const objet_base = this.toLieu(s, project_id);
  
    const existing = await this.LieuRepo.findOne({ where: { id: s.id } });
    if (!existing) {
      throw new NotFoundException('NO_LOCATION_FOUND');
    }
  
    const updated = await this.LieuRepo.save({ ...existing, ...objet_base });
    return this.tolieu(updated);
  }
  
  async Delete(id: number) {
    const toDelete = await this.LieuRepo.findOne({ where: { id } });
    if (!toDelete) {
      throw new NotFoundException('NO_LOCATION_FOUND');
    }
  
    await this.LieuRepo.remove(toDelete);
    return { success: true };
  }
  
  
  
}