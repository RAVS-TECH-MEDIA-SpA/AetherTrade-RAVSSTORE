// apps/admin-angular/src/app/pages/inventory/inventory.component.ts
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
  hoveredProductId: string | null = null;

  constructor(private dataService: DashboardDataService, public currencyService: CurrencyService) {}

  ngOnInit(): void { this.loadInventory(); }

  loadInventory(): void {
    this.dataService.getInventory().subscribe(res => {
      // Prioridad: Winner -> Pending -> Rejected
      this.products = res.sort((a, b) => {
        const order = { 'WINNER': 1, 'PENDING': 2, 'REJECTED_IA': 3 };
        return (order[a.status] || 4) - (order[b.status] || 4);
      });
    });
  }

  openEditor(p: WinningProduct): void {
    this.selectedProduct = JSON.parse(JSON.stringify(p)); // Clon para edición limpia
    this.isModalOpen = true;
  }

  saveProduct(): void {
    if (this.selectedProduct) {
      this.dataService.updateProduct(this.selectedProduct.id, this.selectedProduct).subscribe(() => {
        this.loadInventory();
        this.isModalOpen = false;
      });
    }
  }

  toggleStatus(p: WinningProduct): void {
    const next = p.status === 'WINNER' ? 'REJECTED_IA' : 'WINNER';
    this.dataService.updateProduct(p.id, { status: next }).subscribe(() => this.loadInventory());
  }

  formatLocal(usd: number, curr: 'CLP' | 'MXN' | 'BRL'): string {
    const val = this.currencyService.getConvertedValue(usd, curr);
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: curr, maximumFractionDigits: 0 }).format(val);
  }
}