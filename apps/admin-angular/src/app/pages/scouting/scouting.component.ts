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
  // --- ESTADO DE UI ---
  public nichosSeleccionados: string[] = [];
  public textoInput: string = '';
  public selectedNicheLimit: number = 5;  // Amplitud
  public selectedEliteLimit: number = 10; // Profundidad
  
  // Renombrado a isProcessing para coincidir con el error TS2339 del HTML
  public isProcessing: boolean = false; 
  
  public totalEstimatedCredits: number = 0;
  public logs: { time: string, msg: string, type: string }[] = [];

  constructor(private dataService: DashboardDataService) {}

  ngOnInit(): void { 
    this.recalcularCuota();
    this.addLog('Aether-Core Terminal V3.5.0 inicializada en Cabrero.', 'system'); 
  }

  /**
   * Calcula el peor escenario de gasto. 
   * Fórmula: Nichos + (Nichos * Profundidad)
   */
  public recalcularCuota(): void {
    const n = Number(this.nichosSeleccionados.length > 0 ? this.nichosSeleccionados.length : this.selectedNicheLimit);
    const e = Number(this.selectedEliteLimit);
    this.totalEstimatedCredits = n + (n * e);
  }

  public agregarTag(): void {
    if (this.textoInput) {
      // Limpiamos el punto y coma y posibles espacios
      const tag = this.textoInput.replace(';', '').trim();
      if (tag && !this.nichosSeleccionados.includes(tag)) {
        this.nichosSeleccionados.push(tag);
        this.textoInput = '';
        this.recalcularCuota();
      }
    }
  }

  /**
   * TRIGGER: Dispara la ráfaga al Gateway.
   * Eliminado el bloqueo estricto de > 100 créditos para permitir modo Admin.
   */
  public triggerAnalysis(): void {
    // 1. Evitar doble disparo
    if (this.isProcessing) return;
    
    // 2. Alerta de Seguridad (Soft Warning)
    if (this.totalEstimatedCredits > 150) {
      const confirmacion = confirm(`⚠️ El estimado es de ${this.totalEstimatedCredits} créditos. ¿Deseas proceder con esta ráfaga de alto consumo?`);
      if (!confirmacion) return;
    }

    this.isProcessing = true;
    const niches = this.nichosSeleccionados.join(';');
    
    this.addLog(`🚀 Scouting iniciado: ${niches || 'Generación Dinámica IA'}`, 'info');
    this.addLog(`📊 Créditos Estimados: ${this.totalEstimatedCredits}`, 'system');
    
    this.dataService.triggerManualAnalysis(niches, 'CL', this.selectedNicheLimit, this.selectedEliteLimit)
      .subscribe({
        next: (res: any) => {
          this.addLog(`✅ Batch ${res.batchId || 'N/A'} encolado exitosamente.`, 'success');
          this.isProcessing = false;
          this.nichosSeleccionados = []; // Limpiamos para el próximo lote
          this.recalcularCuota();
        },
        error: (err) => {
          const errMsg = err.error?.error || 'Gateway Timeout / Connection Refused';
          this.addLog(`🚨 ERROR: ${errMsg}`, 'error');
          this.isProcessing = false;
        }
      });
  }

  private addLog(msg: string, type: string): void {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs.unshift({ time, msg, type });
  }
}