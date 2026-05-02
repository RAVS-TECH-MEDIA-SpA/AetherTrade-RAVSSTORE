import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http'; // Asegúrate de tener el provideHttpClient en app.config.ts
import { CommonModule } from '@angular/common';

interface WinnerProduct {
  id: string;
  sku: string;
  base_cost_usd: number;
  suggested_price: number;
  margin: number;
  market: string;
}

@Component({
  selector: 'app-winner-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Arbitrage Dashboard: AetherTrade</h1>
        <span class="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">Data en Tiempo Real</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-gray-50 text-gray-400 text-sm uppercase tracking-wider">
              <th class="py-4 px-2 font-medium">SKU</th>
              <th class="py-4 px-2 font-medium">Costo (USD)</th>
              <th class="py-4 px-2 font-medium">Sugerido (EUR)</th>
              <th class="py-4 px-2 font-medium">Margen Est.</th>
              <th class="py-4 px-2 font-medium">Mercado</th>
              <th class="py-4 px-2 font-medium text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr *ngFor="let p of winners" class="hover:bg-gray-50/50 transition-colors">
              <td class="py-4 px-2 font-mono text-sm text-gray-600">{{ p.sku }}</td>
              <td class="py-4 px-2 text-gray-700">{{ p.base_cost_usd | currency:'USD':'symbol':'1.2-2' }}</td>
              <td class="py-4 px-2 text-gray-700">{{ p.suggested_price | currency:'EUR':'symbol':'1.2-2' }}</td>
              <td class="py-4 px-2">
                <span [class]="p.margin > 40 ? 'text-green-600 font-semibold' : 'text-orange-500 font-semibold'">
                  {{ p.margin }}%
                </span>
              </td>
              <td class="py-4 px-2 text-gray-600">{{ p.market }}</td>
              <td class="py-4 px-2 text-right">
                <button (click)="approve(p.id)" 
                        class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-all shadow-sm">
                  Activar Landing
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class WinnerListComponent implements OnInit {
  winners: WinnerProduct[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<WinnerProduct[]>('/api/v1/winners/pending')
      .subscribe({
        next: (data) => this.winners = data,
        error: (err) => console.error('Error cargando ganadores:', err)
      });
  }

  approve(id: string) {
    this.http.post(`/api/v1/winners/${id}/activate`, {})
      .subscribe(() => {
        this.winners = this.winners.filter(w => w.id !== id);
      });
  }
}