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
  // Lógica de Tags (WordPress Style)
  nichosSeleccionados: string[] = []; 
  textoInput: string = ''; 
  
  selectedCountry: string = 'CL';
  
  // CONFIGURACIÓN DE LÍMITES V3.4 (NUEVO)
  selectedNicheLimit: number = 5;  // Amplitud: Cuántos nichos (Antes selectedLimit)
  selectedEliteLimit: number = 10; // Profundidad: Cuántos productos ganadores por nicho
  
  isAnalyzing: boolean = false;
  totalEstimatedCredits: number = 0; // Cálculo reactivo de impacto en cuota

  sortColumn: string = ''; 
  isAsc: boolean = true;

  kpiCards: KpiCard[] = [];
  countrySalesData?: ChartData<'bar'>;
  trendsTimelineData!: ChartData<'line'>;
  topProducts: WinningProduct[] = [];

  // RESTAURADO: barChartOptions
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { 
      y: { beginAtZero: true, grid: { color: '#2d333b' }, ticks: { color: '#8b949e' } }, 
      x: { grid: { display: false }, ticks: { color: '#8b949e' } } 
    }
  };

  // RESTAURADO: lineChartOptions
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
    this.recalcularCuota(); // Inicializar el monitor de cuota
  }

  /**
   * NUEVO: Calcula el impacto en la cuota Pro basándose en el embudo (Funnel)
   * Fórmula: Nichos + (Nichos * Ganadores por Nicho)
   */
 /**
 * REPARADO: Casting a Number para evitar concatenación de strings
 */
    recalcularCuota(): void {
      const n = Number(this.nichosSeleccionados.length > 0 
                ? this.nichosSeleccionados.length 
                : this.selectedNicheLimit);
      const e = Number(this.selectedEliteLimit);
      
      // Ahora sí: 10 + 50 = 60
      this.totalEstimatedCredits = n + (n * e);
    }

  /**
   * Se dispara cuando cambian los controles de límites en la UI (NUEVO)
   */
  onParamChange(): void {
    this.recalcularCuota();
  }

  /**
   * Validador: Agrega tag si no se ha superado el límite de amplitud
   */
  agregarTag(event: any): void {
    const valor = this.textoInput.trim().replace(';', '');
    
    if (valor) {
      if (this.nichosSeleccionados.length < this.selectedNicheLimit) {
        if (!this.nichosSeleccionados.includes(valor)) {
          this.nichosSeleccionados.push(valor);
          this.recalcularCuota(); // Actualizar cuota al añadir tag
        }
        this.textoInput = '';
      } else {
        alert(`Has alcanzado el máximo de ${this.selectedNicheLimit} nichos configurados.`);
        this.textoInput = '';
      }
    }
  }

  removerTag(index: number): void {
    this.nichosSeleccionados.splice(index, 1);
    this.recalcularCuota(); // Actualizar cuota al remover
  }

  /**
   * Si bajas el límite en el dropdown y ya tenías más tags, los recortamos
   */
  ajustarTagsAlLimite(): void {
    if (this.nichosSeleccionados.length > this.selectedNicheLimit) {
      this.nichosSeleccionados = this.nichosSeleccionados.slice(0, this.selectedNicheLimit);
    }
    this.recalcularCuota();
  }

  loadDashboardData(): void {
    this.dataService.getSummary().subscribe({
      next: (data) => {
        this.kpiCards = data.kpis;
        this.countrySalesData = data.countrySales;
      }
    });

    this.dataService.getInventory().subscribe({
      next: (products) => this.topProducts = products
    });

    this.trendsTimelineData = this.dataService.getTrendsTimeline();
  }

  toggleSort(column: string): void {
    if (this.sortColumn === column) {
      this.isAsc = !this.isAsc;
    } else {
      this.sortColumn = column;
      this.isAsc = true;
    }
    this.topProducts.sort((a, b) => {
      const valA = (a as any)[column];
      const valB = (b as any)[column];
      if (valA === undefined || valB === undefined) return 0;
      if (typeof valA === 'string') {
        const res = valA.localeCompare(valB);
        return this.isAsc ? res : -res;
      }
      return this.isAsc ? (valA - valB) : (valB - valA);
    });
  }

  /**
   * Ejecuta el análisis con protección de cuota Pro (NUEVO)
   */
  onNewAnalysis(): void {
    // Protección contra ráfagas excesivas en Plan Pro
    if (this.totalEstimatedCredits > 100) {
      alert(`⚠️ Operación bloqueada: El consumo estimado (${this.totalEstimatedCredits}) supera el límite de 100 créditos por hora.`);
      return;
    }

    this.isAnalyzing = true;
    const searchString = this.nichosSeleccionados.join(';');

    // Inyectamos ambos límites: Niche y Elite
    this.dataService.triggerManualAnalysis(
      searchString, 
      this.selectedCountry, 
      this.selectedNicheLimit,
      this.selectedEliteLimit
    ).subscribe({
      next: () => {
        const mensaje = searchString 
          ? `Iniciado análisis de nichos: ${this.nichosSeleccionados.join(', ')}`
          : `IA iniciando descubrimiento libre para ${this.selectedNicheLimit} nichos (Top ${this.selectedEliteLimit} ganadores c/u).`;
        
        alert(`${mensaje}\nConsumo estimado: ${this.totalEstimatedCredits} créditos.`);
        this.isAnalyzing = false;
        this.nichosSeleccionados = [];
        this.recalcularCuota();
      },
      error: (err) => {
        this.isAnalyzing = false;
        // Si el Gateway devolvió error de cuota (403), lo mostramos específicamente
        const errorMsg = err.error?.error || 'Error en la comunicación con el Worker AI.';
        alert(`🚨 ${errorMsg}`);
      }
    });
  }

  setCountry(code: string): void { 
    this.selectedCountry = code; 
    this.recalcularCuota();
  }

  toggleWinner(product: WinningProduct): void {
    product.status = (product.status === 'Winner' || product.status === 'WINNER') ? 'REJECTED_IA' : 'WINNER';
  }
}