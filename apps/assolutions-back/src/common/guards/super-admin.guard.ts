import { CanActivate, Injectable } from "@nestjs/common";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate() {
    // coquille vide => interdit tout pour l’instant
    return false;
  }
}
