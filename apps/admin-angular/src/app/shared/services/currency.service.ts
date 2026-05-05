// apps/admin-angular/src/app/shared/services/currency.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface ExchangeRates {
  CLP: number; MXN: number; BRL: number; timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private ratesSubject = new BehaviorSubject<ExchangeRates>({ CLP: 950, MXN: 18, BRL: 5, timestamp: '' });
  public rates$ = this.ratesSubject.asObservable();

  constructor(private http: HttpClient) { this.refreshRates(); }

  refreshRates(): void {
    this.http.get<any>('https://open.er-api.com/v6/latest/USD').subscribe(res => {
      if (res?.rates) {
        this.ratesSubject.next({ CLP: res.rates.CLP, MXN: res.rates.MXN, BRL: res.rates.BRL, timestamp: res.time_last_update_utc });
      }
    });
  }

  getConvertedValue(usd: number, curr: 'CLP' | 'MXN' | 'BRL'): number {
    return usd * (this.ratesSubject.value[curr] || 1);
  }
}