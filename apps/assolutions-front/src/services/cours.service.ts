import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';
import { cours } from 'src/class/cours';
import { KeyValuePair } from 'src/class/keyvaluepair';

@Injectable({
  providedIn: 'root'
})
export class CoursService {

  url = environment.maseance;
  constructor(public global: GlobalService) {
  }


  public Update(c: cours): Promise<boolean> {
    this.url = environment.maseance + 'maseance/cours_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "update",
      cours: c,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Delete(id: number): Promise<boolean> {
    this.url = environment.maseance + 'maseance/cours_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "delete",
      id: id,
    };

    return this.global.POST(this.url, body)
      .then((response: boolean) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Add(c: cours): Promise<number> {
    this.url = environment.maseance + 'maseance/cours_manage.php';
    //  this.url = this.url + "login.php";
    const body = {
      command: "add",
      cours: c,
    };

    return this.global.POST(this.url, body)
      .then((response: number) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }


  public GetCours(): Promise<cours[]> {
    this.url = environment.maseance + "maseance/cours_manage.php";
    const body = {
      command: "get_all"
    };

    return this.global.POST(this.url, body)
      .then((response: cours[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetCoursSeason(season_id: number): Promise<cours[]> {
    this.url = environment.maseance + "maseance/cours_manage.php";
    const body = {
      command: "get_all",
      season_id: season_id
    };

    return this.global.POST(this.url, body)
      .then((response: cours[]) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public Get(id: number): Promise<cours> {
    this.url = environment.maseance + "maseance/cours_manage.php";
    const body = {
      command: "get",
      id: id
    };

    return this.global.POST(this.url, body)
      .then((response: cours) => {
        return response;
      })
      .catch(error => {
        // Gestion de l'erreur
        return Promise.reject(error);
      });
  }
  public GetCoursLight(): Promise<KeyValuePair[]> {
    this.url = environment.maseance + "maseance/cours_manage.php";
    const body = {
      command: "get_all_light_byseason"
    };

    return this.global.POST(this.url, body)
      .then((response: KeyValuePair[]) => {
        return response;
      })
      .catch(error => {
        return Promise.reject(error);
      });
  }

}