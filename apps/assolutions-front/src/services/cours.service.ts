import { Injectable } from '@angular/core';
import { environment } from '../environments/environment.prod';
import { GlobalService } from './global.services';
import { KeyValuePair, KeyValuePairAny } from '@shared/lib/autres.interface';
import { Cours_VM } from '@shared/lib/cours.interface';
import { HttpErrorResponse } from '@angular/common/http';
import { PersonneLight_VM } from '@shared/lib/personne.interface';

@Injectable({
  providedIn: 'root'
})
export class CoursService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
  }

  public Get(id:number): Promise<Cours_VM> {
    this.url = environment.maseance + 'api/cours/get/' + id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
  public GetAll(saison_id:number): Promise<Cours_VM[]> {
    this.url = environment.maseance + 'api/cours/getall/'  + saison_id;
    //  this.url = this.url + "login.php";
   

    return this.global.GET(this.url)
      .then((response: any) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
  }
  public GetAllLight(saison_id:number): Promise<KeyValuePair[]> {
      this.url = environment.maseance + 'api/cours/getall_light/'  + saison_id;
  
    return this.global.GET(this.url)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }

  public Add(l:Cours_VM): Promise<Cours_VM> {
  this.url = environment.maseance + 'api/cours/add';

  return this.global.PUT(this.url, l)
    .then((response: Cours_VM) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Update(l:Cours_VM): Promise<boolean> {
  this.url = environment.maseance + 'api/cours/update';
  return this.global.PUT(this.url, l)
    .then((response: boolean) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
public Delete(id:number) {
  this.url = environment.maseance + 'api/cours/delete/';
const body = {
      id: id, 
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
}

public UpdateSerieCours(cours:Cours_VM, date:Date): Promise<KeyValuePairAny> {
  this.url = environment.maseance + 'api/cours/updateserie';
  const body = {
      cours: cours, 
      date: date
    };
    return this.global.POST(this.url, body)
      .then((response: KeyValuePairAny) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });


}

public GetCoursProf(id:number) : Promise<PersonneLight_VM>{
  this.url = environment.maseance + 'api/cours_prof/get/' + id;
   

    return this.global.GET(this.url)
      .then((response: PersonneLight_VM) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
}

public GetCoursProf_Cours(cours_id:number): Promise<PersonneLight_VM[]>{
    this.url = environment.maseance + 'api/cours_prof/getall/' + cours_id;
   

    return this.global.GET(this.url)
      .then((response: PersonneLight_VM[]) => {
        return response;
      })
      .catch((error: HttpErrorResponse) => {
        console.error('Erreur brute', error);
        const message = error?.message || 'Erreur inconnue';
        console.error(message);        // Gestion de l'erreur
        return Promise.reject(message);
      });
}

public AddCoursProf(cours_id:number, person_id:number): Promise<number>{
   this.url = environment.maseance + 'api/cours_prof/add';
  let body = {
    cours_id:cours_id,
    person_id:person_id
  }
  return this.global.PUT(this.url, body)
    .then((response: number) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}

public DeleteCoursProf(cours_id:number, person_id:number): Promise<boolean>{
   this.url = environment.maseance + 'api/cours_prof/delete/';
const body = {
      cours_id: cours_id, 
      person_id: person_id
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
}

}