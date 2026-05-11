import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardDataService, WinningProduct } from '../../shared/services/dashboard-data.service';
import { CurrencyService } from '../../shared/services/currency.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html'
})
export class InventoryComponent implements OnInit {
  products: WinningProduct[] = [];
  selectedProduct: WinningProduct | null = null;
  isModalOpen = false;
  isGlossaryOpen = false;
  hoveredProductId: string | null = null;

  // ESTADO PARA NOTIFICACIONES
  showToast = false;
  toastMsg = '';
  toastType: 'success' | 'error' = 'success';

  constructor(private dataService: DashboardDataService, public currencyService: CurrencyService) {}

  ngOnInit(): void { this.loadInventory(); }

  loadInventory(): void {
    this.dataService.getInventory().subscribe(res => {
      this.products = res.sort((a, b) => {
        const order: Record<string, number> = { 'WINNER': 1, 'PENDING': 2, 'REJECTED_IA': 3 };
        return (order[a.status] || 4) - (order[b.status] || 4);
      });
    });
  }

  openEditor(p: WinningProduct): void {
    this.selectedProduct = JSON.parse(JSON.stringify(p)); 
    this.isModalOpen = true;
  }

  onPriceUpdate(): void {
    if (!this.selectedProduct) return;
    const p = this.selectedProduct;
    const finalPrice = p.suggested_price_local || 0;
    const landedCostUsd = (p.base_cost_usd || 0) + (p.shipping_cost_usd || 0);
    const currentVat = p.vat_rate || 19;
    const currentExchange = p.rate_to_usd || 950;
    const netRevenueLocal = (finalPrice / (1 + currentVat / 100)) - (finalPrice * 0.05);
    const realNetMarginUsd = (netRevenueLocal / currentExchange) - landedCostUsd;
    const realRoi = landedCostUsd > 0 ? (realNetMarginUsd / landedCostUsd) * 100 : 0;
    p.net_margin_usd = Number(realNetMarginUsd.toFixed(2));
    p.roi_percent = Number(realRoi.toFixed(2));
  }

  removeImage(index: number): void {
    if (this.selectedProduct && this.selectedProduct.local_images) {
      this.selectedProduct.local_images.splice(index, 1);
    }
  }

  removeVideo(): void {
    if (this.selectedProduct) {
      this.selectedProduct.video_url = null;
    }
  }

  // MÉTODO PARA DISPARAR LA NOTIFICACIÓN
  private triggerToast(msg: string, type: 'success' | 'error' = 'success') {
    this.toastMsg = msg;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }

  saveProduct(): void {
    if (this.selectedProduct) {
      const exchange = this.selectedProduct.rate_to_usd || 950;
      this.selectedProduct.suggested_price = Number((this.selectedProduct.suggested_price_local / exchange).toFixed(2));
      
      this.dataService.updateProduct(this.selectedProduct.id, this.selectedProduct).subscribe({
        next: () => {
          this.loadInventory();
          this.isModalOpen = false;
          this.triggerToast('Master DB Updated Successfully', 'success');
        },
        error: (err) => {
          console.error(err);
          this.triggerToast('Error updating Master DB', 'error');
        }
      });
    }
  }

  toggleStatus(p: WinningProduct): void {
    const next = p.status === 'WINNER' ? 'REJECTED_IA' : 'WINNER';
    this.dataService.updateProduct(p.id, { status: next }).subscribe(() => {
        this.loadInventory();
        this.triggerToast(`Status changed to ${next}`, 'success');
    });
  }

  formatLocal(usd: number, curr: 'CLP' | 'MXN' | 'BRL'): string {
    const val = this.currencyService.getConvertedValue(usd, curr);
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(val);
  }
}