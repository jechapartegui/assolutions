import { Injectable } from '@angular/core';
import { Doc } from 'src/class/doc';
import { environment } from 'src/environments/environment.prod';
import { GlobalService } from './global.services';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  url = environment.maseance;
  constructor(public global: GlobalService) {
 }
 public Get(id:number): Promise<Doc> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get",
    id:id
  };

  return this.global.POST(this.url, body)
    .then((response: Doc) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}
 public GetAll(): Promise<Doc[]> {
  // si pas de compte rattacher, renvoyer 0 en compte avec mail : NO_ACCOUNT
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"get_all_project"
  };

  return this.global.POST(this.url, body)
    .then((response: Doc[]) => {
      return response;
    })
    .catch(error => {
      // Gestion de l'erreur
      return Promise.reject(error);
    });
}


public Add(cb:Doc): Promise<number> {
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"add",
    document:cb,
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
public Link(cb:Doc): Promise<boolean> {
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"link",
    document:cb,
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
public Unlink(cb:Doc): Promise<boolean> {
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"unlink",
    document:cb,
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
public Delete(id:number): Promise<boolean> {
  this.url = environment.maseance + 'maseance/document_manage.php';
  //  this.url = this.url + "login.php";
  const body = {
    command:"delete",
    id:id,
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
}

