import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  template: `
    <div class="admin-container">
      <h1>Dashboard de Arbitraje: AetherTrade</h1>
      <table class="winner-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Costo (USD)</th>
            <th>Sugerido (EUR)</th>
            <th>Margen Est.</th>
            <th>Mercado</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of winners">
            <td>{{ p.sku }}</td>
            <td>{{ p.base_cost_usd | currency }}</td>
            <td>{{ p.suggested_price | currency:'EUR' }}</td>
            <td [style.color]="p.margin > 40 ? 'green' : 'orange'">{{ p.margin }}%</td>
            <td>{{ p.market }}</td>
            <td>
              <button (click)="approve(p.id)" class="btn-approve">Activar Landing</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .winner-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
    .btn-approve { background: #2ecc71; color: white; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; }
  `]
})
export class WinnerListComponent implements OnInit {
  winners: WinnerProduct[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<WinnerProduct[]>('/api/v1/winners/pending')
      .subscribe(data => this.winners = data);
  }

  approve(id: string) {
    this.http.post(`/api/v1/winners/${id}/activate`, {})
      .subscribe(() => this.winners = this.winners.filter(w => w.id !== id));
  }
}