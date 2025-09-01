import { Component, OnInit} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompteService } from '../../services/compte.service';
import { ErrorService } from '../../services/error.service';
import { AppStore } from '../app.store';

@Component({
  standalone: false,
  selector: 'app-reinit-mdp',
  templateUrl: './reinit-mdp.component.html',
  styleUrls: ['./reinit-mdp.component.css']
})
export class ReinitMdpComponent implements OnInit {
  loading = true;
  error: string | null = null;
  success: string | null = null;

  subtitle = '';
  showPwd1 = false;
  showPwd2 = false;

  vm = {
    logged: true,
    token: null as string | null,
    Login: '',
    withPassword: true, // par défaut on propose d’en mettre un
    Password: '',
    Confirm: '',
    isPasswordValid: false,
    isConfirmValid: false,
    isValid: false
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: AppStore,
    private auth: CompteService
  ) {}

  ngOnInit(): void {
    // Détecter le mode
    const token = this.route.snapshot.queryParamMap.get('token');
    const loginFromLink = this.route.snapshot.queryParamMap.get('login');

    const logged = this.store.isLoggedIn?.() ?? false;
    if (token) {
      this.vm.logged = false;
      this.vm.token = token;
      this.vm.Login = loginFromLink || ''; // si besoin, sera validé côté API
      this.subtitle = $localize`Lien de réinitialisation`;
    } else if (logged) {
      this.vm.logged = true;
      this.vm.Login = this.store.compte().email || '';
      this.subtitle = $localize`Modification du mot de passe de votre compte`;
    } else {
      // ni token ni session → on redirige vers login ou on affiche une erreur
      this.error = $localize`Lien invalide ou session expirée.`;
    }

    this.loading = false;
    this.validate();
  }

  onKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (this.vm.withPassword && this.vm.isValid) this.submitSetPassword();
      if (!this.vm.withPassword) this.submitNoPassword();
    }
  }

  validate(): void {
    const pass = this.vm.Password || '';
    const hasLen = pass.length >= 8;
    const hasNum = /\d/.test(pass);
    this.vm.isPasswordValid = this.vm.withPassword ? (hasLen && hasNum) : true;

    this.vm.isConfirmValid = this.vm.withPassword ? (this.vm.Password === this.vm.Confirm && !!this.vm.Confirm) : true;
    this.vm.isValid = this.vm.isPasswordValid && this.vm.isConfirmValid;
  }

  async submitSetPassword(): Promise<void> {
    this.error = null; this.success = null;
    if (!this.vm.isValid) return;

    try {
      if (this.vm.logged) {
        // À implémenter côté service : change pour l'utilisateur courant
        await this.auth.ChangeMyPassword(this.vm.Password);
      } else {
        // À implémenter côté service : reset via token
        await this.auth.resetPasswordWithToken(this.vm.Login, this.vm.token!, this.vm.Password);
      }
      this.success = $localize`Votre mot de passe a été mis à jour.`;
      this.vm.Password = this.vm.Confirm = '';
      this.validate();
      if(!this.vm.logged) {
        // si on vient de réinitialiser via un token, on propose d'aller se logguer
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
         setTimeout(() => {
          this.router.navigate(['/menu']);
        }, 2000);
      }
    } catch (err: any) {
      this.error = err?.message || $localize`Une erreur est survenue pendant la mise à jour.`;
    }
  }

  async submitNoPassword(): Promise<void> {
    this.error = null; this.success = null;

    try {
      if (this.vm.logged) {
        // Exemple : active le "passwordless" / supprime le mdp
        await this.auth.ChangeMyPassword(null);
      } else {
        await this.auth.resetPasswordWithToken(this.vm.Login, this.vm.token!, null);
      }
      this.success = $localize`Votre compte est configuré sans mot de passe.`;
      this.vm.Password = this.vm.Confirm = '';
      this.vm.withPassword = false;
      this.validate();
 if(!this.vm.logged) {
        // si on vient de réinitialiser via un token, on propose d'aller se logguer
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
         setTimeout(() => {
          this.router.navigate(['/menu']);
        }, 2000);
      }
    } catch (err: any) {
      this.error = err?.message || $localize`Impossible de configurer le compte sans mot de passe.`;
    }
  }
}