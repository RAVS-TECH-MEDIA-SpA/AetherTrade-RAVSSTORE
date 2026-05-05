// apps/admin-angular/src/app/shared/services/dashboard-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChartData } from 'chart.js';

import { environment } from '../../../environments/environment';

export interface KpiCard {
  title: string;
  value: string;
  trend: number;
  icon: string;
}

export interface WinningProduct {
  id: string;
  name: string;
  source: string;
  asin_sku: string;
  margin: number;
  sales_30d: number;
  status: string;
  image_url: string;
  ai_verdict?: string; // Para el despliegue moderno con Tooltip
  roi_percent?: number;
  sales_count?: number;
}

interface SummaryResponse {
  kpis: KpiCard[];
  countrySales: ChartData<'bar'>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  private apiUrl = environment.apiUrl; 

  constructor(private http: HttpClient) { } 

  getSummary(): Observable<SummaryResponse> {
    return this.http.get<SummaryResponse>(`${this.apiUrl}/api/stats/summary`);
  }

  getInventory(): Observable<WinningProduct[]> {
    return this.http.get<any[]>(`${this.apiUrl}/api/inventory`).pipe(
      map(products => products.map(p => ({
        ...p,
        name: p.marketing_copy?.title_localized || p.title_original,
        asin_sku: p.aliexpress_id,
        margin: p.roi_percent || 0,
        sales_30d: p.sales_count || 0,
        status: p.status,
        ai_verdict: p.ai_verdict // Mapeo del veredicto analizado por la IA
      })))
    );
  }

  /**
   * Dispara el análisis manual/auto sincronizado con la V3.4 del Gateway
   * @param niche - String de nichos separados por punto y coma (ej: "gaming; fitness")
   * @param country - Código de país (ej: "CL")
   * @param nicheLimit - Cantidad de nichos (Amplitud)
   * @param eliteLimit - Cantidad de ganadores por nicho (Profundidad)
   */
  triggerManualAnalysis(
    niche: string, 
    country: string, 
    nicheLimit: number, 
    eliteLimit: number
  ): Observable<any> {
    // Enviamos el payload exacto que el triggerAnalysis del Gateway espera procesar
    return this.http.post(`${this.apiUrl}/api/analyze`, { 
      niches: niche, 
      country, 
      nicheLimit, 
      eliteLimit 
    });
  }

  getTrendsTimeline(): ChartData<'line'> {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Smart Home',
          data: [5, 12, 8, 20, 15, 25],
          borderColor: '#00f2ff',
          tension: 0.4,
          fill: true,
          backgroundColor: 'rgba(0, 242, 255, 0.1)'
        }
      ]
    };
  }
}