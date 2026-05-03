// apps/admin-angular/src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms'; 
import { BaseChartDirective } from 'ng2-charts'; 
import { ChartConfiguration, ChartData } from 'chart.js'; 
import { DashboardDataService, KpiCard, WinningProduct } from '../../shared/services/dashboard-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  // Cambia 'searchTerm' por 'searchTerms' (en plural)
  searchTerms: string = ''; 
  selectedCountry: string = 'CL';
  selectedLimit: number = 5; 
  isAnalyzing: boolean = false;

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
    this.loadDashboardData();
  }

  /**
   * Carga inicial de datos del servidor de Cabrero
   */
  loadDashboardData(): void {
    this.dataService.getSummary().subscribe({
      next: (data) => {
        this.kpiCards = data.kpis;
        this.countrySalesData = data.countrySales;
      },
      error: (err) => console.error('Error cargando resumen:', err)
    });

    this.dataService.getInventory().subscribe({
      next: (products) => this.topProducts = products,
      error: (err) => console.error('Error cargando inventario:', err)
    });

    this.trendsTimelineData = this.dataService.getTrendsTimeline();
  }

  /**
   * Ejecuta el análisis manual enviando el nicho (o nichos por ;) y el límite
   */
  onNewAnalysis(): void {
    // if (!this.searchTerms.trim()) {
    //   alert('Por favor, ingresa al menos un término de búsqueda.');
    //   return;
    // }

    this.isAnalyzing = true;

    // Nota: El servicio debe soportar este tercer parámetro (limit)
    this.dataService.triggerManualAnalysis(this.searchTerms, this.selectedCountry, this.selectedLimit).subscribe({
      next: (res) => {
        alert(`Análisis iniciado para los términos ingresados. La IA buscará hasta ${this.selectedLimit} nichos.`);
        this.isAnalyzing = false;
        this.searchTerms = '';
      },
      error: (err) => {
        console.error('Error al disparar análisis:', err);
        alert('No se pudo iniciar el análisis. Verifica la conexión con el Worker AI.');
        this.isAnalyzing = false;
      }
    });
  }

  /**
   * Cambia el país seleccionado del dropdown
   */
  setCountry(code: string): void {
    this.selectedCountry = code;
  }

  toggleWinner(product: WinningProduct): void {
    product.status = product.status === 'Winner' ? 'Pending' : 'Winner';
    console.log(`Estado actualizado para ${product.name}`);
  }
}