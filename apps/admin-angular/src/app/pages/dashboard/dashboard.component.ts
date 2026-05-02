// apps/admin-angular/src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { BaseChartDirective } from 'ng2-charts'; 
import { ChartConfiguration, ChartData } from 'chart.js'; 
import { DashboardDataService, KpiCard, WinningProduct } from '../../shared/services/dashboard-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  kpiCards: KpiCard[] = [];
  countrySalesData?: ChartData<'bar'>;
  trendsTimelineData!: ChartData<'line'>;
  topProducts: WinningProduct[] = [];

  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
      y: { beginAtZero: true, grid: { color: '#2d333b' }, ticks: { color: '#8b949e' } }, 
      x: { grid: { display: false }, ticks: { color: '#8b949e' } } 
    }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#8b949e' } } },
    scales: { 
      y: { grid: { color: '#2d333b' }, ticks: { color: '#8b949e' } }, 
      x: { grid: { display: false }, ticks: { color: '#8b949e' } } 
    }
  };

  constructor(private dataService: DashboardDataService) { }

  ngOnInit(): void {
    // 1. Cargar KPIs y Gráfico de Barras desde el resumen
    this.dataService.getSummary().subscribe({
      next: (data) => {
        this.kpiCards = data.kpis;
        this.countrySalesData = data.countrySales;
      },
      error: (err) => console.error('Error cargando resumen:', err)
    });

    // 2. Cargar Inventario Real
    this.dataService.getInventory().subscribe({
      next: (products) => this.topProducts = products,
      error: (err) => console.error('Error cargando inventario:', err)
    });

    // 3. Cargar Línea de Tiempo (Mantenemos mock hasta tener data histórica)
    this.trendsTimelineData = this.dataService.getTrendsTimeline();
  }

  toggleWinner(product: WinningProduct): void {
    // Aquí podrías añadir la llamada al servicio para actualizar en BD
    product.status = product.status === 'Winner' ? 'Pending' : 'Winner';
    console.log(`Estado actualizado para ${product.name}`);
  }
}