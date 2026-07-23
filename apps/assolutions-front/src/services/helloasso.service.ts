import { Injectable } from '@angular/core';
import { ApiClientService } from './api-client.service';

@Injectable({ providedIn: 'root' })
export class HelloAssoService {
  private readonly base = '/helloasso';

  constructor(private api: ApiClientService) {}

  testHelloAsso(): Promise<void> {
    return this.api.POST<{ ok: boolean; checkoutIntentId: number; redirectUrl: string }>(`${this.base}/test-checkout`, {}).then((res) => {
      window.location.href = res.redirectUrl;
    }).catch((err) => {
      console.error('Erreur POC HelloAsso', err);
      alert('Erreur POC HelloAsso : regarde la console');
    });
  
}
  
 
}
