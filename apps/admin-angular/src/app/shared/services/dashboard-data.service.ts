// apps/admin-angular/src/app/shared/services/dashboard-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
  aliexpress_id: string;
  name: string; // Mapeado desde marketing_copy.hook
  title_original: string;
  source: string;
  status: 'WINNER' | 'PENDING' | 'REJECTED_IA';
  
  // Finanzas puras (USD)
  base_cost_usd: number;
  shipping_cost_usd: number;
  net_margin_usd: number;
  suggested_price: number;
  roi_percent: number;
  
  // Referencia Local
  suggested_price_local: number; // Para tus precios en CLP
  
  // IA y Marketing
  marketing_copy: {
    hook: string;
    benefits: string[];
  };
  ai_verdict: string;
  
  // Métricas y Media
  sales_count: number;
  rating: number;
  image_url: string;
  local_images: string[]; // Tus assets en GCS
  video_url?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/api/stats/summary`);
  }

  getInventory(): Observable<WinningProduct[]> {
  return this.http.get<any[]>(`${this.apiUrl}/api/inventory`).pipe(
    map(products => products.map(p => ({
      ...p,
      // Usamos el 'hook' como nombre principal para el listado
      name: p.marketing_copy?.hook || p.title_original,
      // Aseguramos el tipado numérico para cálculos de JS
      base_cost_usd: Number(p.base_cost_usd),
      shipping_cost_usd: Number(p.shipping_cost_usd),
      net_margin_usd: Number(p.net_margin_usd),
      suggested_price: Number(p.suggested_price),
      roi_percent: Number(p.roi_percent),
      suggested_price_local: Number(p.suggested_price_local)
    })))
  );
}

  updateProduct(id: string, data: Partial<WinningProduct>): Observable<any> {
    return this.http.put(`${this.apiUrl}/api/inventory/${id}`, data);
  }

  triggerManualAnalysis(niche: string, country: string, nLimit: number, eLimit: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/analyze`, { 
      niches: niche, 
      country, 
      nicheLimit: nLimit, 
      eliteLimit: eLimit 
    });
  }

  getTrendsTimeline(): ChartData<'line'> {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Discovery Velocity',
        data: [10, 25, 45, 30, 60, 77],
        borderColor: '#00f2ff',
        backgroundColor: 'rgba(0, 242, 255, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }
}