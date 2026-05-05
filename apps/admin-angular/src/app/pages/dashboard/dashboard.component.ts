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
  // Variables sincronizadas con la plantilla HTML
  kpis: KpiCard[] = [];
  qualityData?: ChartData<'doughnut'>;
  trendsTimelineData?: ChartData<'line'>;

  // Configuración reparada para el gráfico circular (Soluciona TS2353)
  donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%', // El "Donut" profesional solicitado
    plugins: { 
      legend: { 
        display: true, 
        position: 'bottom', 
        labels: { color: '#8b949e', font: { size: 10 } } 
      } 
    }
  };

  // Configuración general para gráficos de barras/líneas en USD
  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
      y: { 
        grid: { color: '#2d333b' }, 
        ticks: { color: '#8b949e', callback: (v) => '$' + v } 
      }, 
      x: { 
        grid: { display: false }, 
        ticks: { color: '#8b949e' } 
      } 
    }
  };

  constructor(private dataService: DashboardDataService) { }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  /**
   * Carga y procesa la data real de los 77 productos en la DB
   */
  loadAnalytics(): void {
    this.dataService.getInventory().subscribe(products => {
      this.calculateRealMetrics(products);
      this.generateMarketCharts(products);
    });
  }

  /**
   * Calcula KPIs basados en 'net_margin_usd' y 'roi_percent'
   */
 // apps/admin-angular/src/app/pages/dashboard/dashboard.component.ts

  calculateRealMetrics(products: WinningProduct[]): void {
  const winners = products.filter(p => p.status === 'WINNER');
  
  const totalNetProfit: number = winners.reduce((acc, p) => {
      const margin = Number(p.net_margin_usd);
      return acc + (isNaN(margin) ? 0 : margin); 
  }, 0);
  
  const avgRoi: number = winners.length > 0 
    ? winners.reduce((acc, p) => acc + (Number(p.roi_percent) || 0), 0) / winners.length 
    : 0;

  // Proyección de Meta Ads: Estimamos un 20% del margen neto para publicidad
  const estimatedAdsCost = totalNetProfit * 0.20;

  this.kpis = [
    { title: 'Potential Net Profit', value: `$${totalNetProfit.toFixed(2)}`, trend: 15, icon: 'payments' },
    { title: 'Market Winners', value: winners.length.toString(), trend: 5, icon: 'military_tech' },
    { title: 'Items Scanned', value: products.length.toString(), trend: 100, icon: 'database' },
    { title: 'Global Avg. ROI', value: `${avgRoi.toFixed(1)}%`, trend: 8, icon: 'insights' },
    // NUEVA CARD: Publicidad y Meta Ads
    { 
      title: 'Meta Ads Budget (Est.)', 
      value: `$${estimatedAdsCost.toFixed(2)}`, 
      trend: 12, 
      icon: 'campaign' 
    }
  ];
}

  /**
   * Genera visualizaciones basadas en la distribución de ROI real
   */
  generateMarketCharts(products: WinningProduct[]): void {
    // Categorización por Océano Azul vs Competencia
    const high = products.filter(p => (Number(p.roi_percent) || 0) >= 100).length;
    const mid = products.filter(p => (Number(p.roi_percent) || 0) < 100 && (Number(p.roi_percent) || 0) >= 50).length;
    const low = products.filter(p => (Number(p.roi_percent) || 0) < 50).length;

    this.qualityData = {
      labels: ['Blue Ocean (>100%)', 'Steady (50-100%)', 'Low Margin'],
      datasets: [{ 
        data: [high, mid, low], 
        backgroundColor: ['#00f2ff', '#7c4dff', '#f85149'], 
        borderWidth: 0 
      }]
    };
    
    // Timeline de descubrimiento sincronizado
    this.trendsTimelineData = this.dataService.getTrendsTimeline();
  }
}