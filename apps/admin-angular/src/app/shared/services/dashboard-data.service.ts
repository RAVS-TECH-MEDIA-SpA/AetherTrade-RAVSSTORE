// apps/admin-angular/src/app/shared/services/dashboard-data.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ChartData } from 'chart.js';

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
  status: 'Winner' | 'Pending' | 'Rejected';
  image_url: string;
}

interface SummaryResponse {
  kpis: KpiCard[];
  countrySales: ChartData<'bar'>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {
  private apiUrl = 'http://localhost:3000'; // Ajusta según tu configuración de proxy o entorno
  // private apiUrl = environment.apiUrl;
  constructor(private http: HttpClient) { }

  /**
   * Obtiene los KPIs consolidados desde el API Gateway
   */
  getSummary(): Observable<SummaryResponse> {
    return this.http.get<SummaryResponse>(`${this.apiUrl}/api/stats/summary`);
  }

  /**
   * Obtiene la lista completa de productos del inventario
   */
  getInventory(): Observable<WinningProduct[]> {
    return this.http.get<WinningProduct[]>(`${this.apiUrl}/api/inventory`);
  }

  /**
   * Dispara un nuevo análisis manual al Worker AI
   */
  triggerManualAnalysis(niche: string, country: string, limit: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/analyze`, { niche, country, limit });
  }

  /**
   * Implementación temporal para líneas de tiempo hasta que 
   * el worker de IA pueble niche_stats
   */
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