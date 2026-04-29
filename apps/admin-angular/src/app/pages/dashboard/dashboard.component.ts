import { Component, OnInit } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { DashboardDataService, KpiCard, WinningProduct } from '../../shared/services/dashboard-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  // Inyectamos datos en duro
  kpiCards: KpiCard[] = [];
  countrySalesData!: ChartData<'bar'>;
  trendsTimelineData!: ChartData<'line'>;
  topProducts: WinningProduct[] = [];

  // Opciones de Gráficos (Estilo profesional)
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }
  };

  lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom' } },
    scales: { y: { grid: { display: false } }, x: { grid: { display: false } } }
  };

  constructor(private dataService: DashboardDataService) { }

  ngOnInit(): void {
    // Carga de datos mockeados al iniciar
    this.kpiCards = this.dataService.getKpis();
    this.countrySalesData = this.dataService.getCountrySales();
    this.trendsTimelineData = this.dataService.getTrendsTimeline();
    this.topProducts = this.dataService.getTopProducts();
  }
}