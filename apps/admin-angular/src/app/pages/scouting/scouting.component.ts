// apps/admin-angular/src/app/pages/scouting/scouting.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../shared/services/dashboard-data.service';

@Component({
  selector: 'app-scouting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './scouting.component.html'
})
export class ScoutingComponent implements OnInit {
  nichosSeleccionados: string[] = [];
  textoInput: string = '';
  selectedNicheLimit: number = 5;  // Amplitud
  selectedEliteLimit: number = 10; // Profundidad
  isAnalyzing: boolean = false;
  totalEstimatedCredits: number = 0;
  logs: { time: string, msg: string, type: string }[] = [];

  constructor(private dataService: DashboardDataService) {}

  ngOnInit(): void { 
    this.recalcularCuota();
    this.addLog('Aether-Core Terminal V3.4.4 inicializada.', 'system'); 
  }

  recalcularCuota(): void {
    const n = Number(this.nichosSeleccionados.length > 0 ? this.nichosSeleccionados.length : this.selectedNicheLimit);
    const e = Number(this.selectedEliteLimit);
    this.totalEstimatedCredits = n + (n * e);
  }

  agregarTag(): void {
    if (this.textoInput && this.nichosSeleccionados.length < this.selectedNicheLimit) {
      this.nichosSeleccionados.push(this.textoInput.replace(';', '').trim());
      this.textoInput = '';
      this.recalcularCuota();
    }
  }

  onNewAnalysis(): void {
    if (this.totalEstimatedCredits > 100) return;
    this.isAnalyzing = true;
    const niches = this.nichosSeleccionados.join(';');
    this.addLog(`Scouting iniciado: ${niches || 'Modo Auto'}`, 'info');
    
    this.dataService.triggerManualAnalysis(niches, 'CL', this.selectedNicheLimit, this.selectedEliteLimit)
      .subscribe({
        next: () => {
          this.addLog('Tarea encolada en Pub/Sub. Créditos: -' + this.totalEstimatedCredits, 'success');
          this.isAnalyzing = false;
          this.nichosSeleccionados = [];
        },
        error: (err) => {
          this.addLog(`Error: ${err.error?.error || 'Worker offline'}`, 'error');
          this.isAnalyzing = false;
        }
      });
  }

  private addLog(msg: string, type: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({ time, msg, type });
  }
}