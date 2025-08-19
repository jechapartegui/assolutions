import {
    Injectable
  } from '@nestjs/common';
import { Project } from '../../entities/projet.entity';
import { ProjectService } from '../../crud/project.service';
  
  
  @Injectable()
  export class ProjetService {
  
    constructor(private projectSer:ProjectService
       ) {
    }
      async get(id: number) : Promise<Project> {
        return await this.projectSer.get(id);
      }

  
    
    }