import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

type ShortPayload = { i: number; l?: string; r?: 0 | 1 }; // i=id, l=login, r=0/1 pour non/oui

@Component({
    standalone:false,
  selector: 'app-short-link-redirect',
  template: '' // rien à afficher
})
export class ShortLinkRedirectComponent implements OnInit {
  constructor(private ar: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const answerLegacy = this.ar.snapshot.paramMap.get('answer'); // 'y' | 'n' | null
    const legacyCode = this.ar.snapshot.paramMap.get('code');
    const slug = this.ar.snapshot.paramMap.get('slug');

    // --- 1) Format legacy: /s/:code/:answer (code=base62(id))
    if (answerLegacy && legacyCode) {
      const id = this.base62Decode(legacyCode);
      if (!Number.isFinite(id))  {this.router.navigateByUrl('/');return};
      const qp: any = { id, reponse: answerLegacy.toLowerCase() === 'y' ? '1' : '0' };
       this.router.navigate(['/ma-seance'], { queryParams: qp });
       return;
    }

    // --- 2) Nouveau format: /s/:slug (slug=b64url(JSON minimal))
    if (slug) {
      const payload = this.b64urlToJSON<ShortPayload>(slug);
      if (!payload || !Number.isFinite(payload.i))  {this.router.navigateByUrl('/'); return;};

      const qp: any = { id: payload.i };
      if (payload.l) qp.login = payload.l;
      if (payload.r !== undefined) qp.reponse = payload.r ? '1' : '0';

      // (option) ici: appeler un service pour enregistrer la réponse avant de naviguer
      // ex: this.seanceService.answer(payload.i, !!payload.r).subscribe(() => ...)

      this.router.navigate(['/ma-seance'], { queryParams: qp });
      return;
    }

    // fallback
    this.router.navigateByUrl('/');
  }

  private base62Decode(s: string): number {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let n = 0;
    for (const c of s) {
      const v = alphabet.indexOf(c);
      if (v < 0) return NaN;
      n = n * 62 + v;
    }
    return n;
  }

  private b64urlToJSON<T>(slug: string): T | null {
    try {
      // base64url -> base64
      let b64 = slug.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      // decode
      const json = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
}
