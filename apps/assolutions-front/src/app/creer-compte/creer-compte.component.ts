import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ErrorService } from '../../services/error.service';
import { Compte_VM } from '@shared/lib/compte.interface';
import { Login_VM } from '../../class/login_vm';
import { environment } from '../../environments/environment.prod';

@Component({
  standalone: false,
  selector: 'app-creer-compte',
  templateUrl: './creer-compte.component.html',
  styleUrls: ['./creer-compte.component.css'], // on réutilise ton CSS existant
})
export class CreerCompteComponent {
  VM: Login_VM = new Login_VM();
  action: string;

  /** Si tu veux le réutiliser dans d’autres contextes plus tard */
  @Input() context: 'CREATE' = 'CREATE';

  /** Comme dans ton composant actuel : le parent décidera quoi faire (appel API, etc.) */
  @Output() creer = new EventEmitter<Compte_VM>();

  libelle_titre: string = $localize`Saisissez une adresse mail pour créer un compte`;

  constructor(private router: Router) {
    this.VM.Login = environment.defaultlogin;
    this.VM.Password = environment.defaultpassword;
  }

  validateLogin() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.VM.isLoginValid = emailRegex.test(this.VM.Login);
    this.valide();
  }

  validatePassword(mdp: string) {
    const hasMinLength = mdp.length >= 8;
    const hasNumber = /\d/.test(mdp);
    this.VM.isPasswordValid = hasMinLength && hasNumber;
    this.valide();
  }

  valide() {
    // ici : isValid dépend du choix "avec mot de passe" ou "sans"
    if (this.VM.mdp_requis) {
      this.VM.isValid = this.VM.isLoginValid && this.VM.isPasswordValid;
    } else {
      this.VM.isValid = this.VM.isLoginValid;
    }
  }

  togglePasswordRequired(checked: boolean) {
    this.VM.mdp_requis = checked;
    if (!checked) {
      this.VM.Password = '';
      this.VM.isPasswordValid = true;
    } else {
      this.VM.isPasswordValid = false;
    }
    this.valide();
  }

  CreerCompte() {
    this.action = $localize`Créer un compte`;
    const errorService = ErrorService.instance;

    if (!this.VM.isLoginValid) {
      const o = errorService.CreateError(this.action, $localize`Email invalide`);
      errorService.emitChange(o);
      return;
    }

    if (this.VM.mdp_requis && !this.VM.isPasswordValid) {
      const o = errorService.CreateError(this.action, $localize`Mot de passe invalide`);
      errorService.emitChange(o);
      return;
    }

    const msg = this.VM.mdp_requis
      ? $localize`Voulez-vous confirmer la création d'un compte avec mot de passe ?`
      : $localize`Voulez-vous confirmer la création d'un compte sans mot de passe ?`;

    const ok = window.confirm(msg);
    if (!ok) return;

    const newCompte = new Compte_VM();
    newCompte.actif = false;
    newCompte.mail_actif = false;
    newCompte.email = this.VM.Login;
    newCompte.password = this.VM.mdp_requis ? this.VM.Password : null;
    newCompte.echec_connexion = 0;

    this.creer.emit(newCompte);

    const o = errorService.OKMessage(this.action);
    errorService.emitChange(o);
  }

  RetourLogin() {
    this.router.navigate(['/login'], { queryParams: { user: this.VM.Login } });
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (this.VM.mdp_requis) this.validatePassword(this.VM.Password);
      if (this.VM.isValid) this.CreerCompte();
    }
  }
}
