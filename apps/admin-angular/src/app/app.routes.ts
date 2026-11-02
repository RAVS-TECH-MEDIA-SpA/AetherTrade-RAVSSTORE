// apps/admin-angular/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ScoutingComponent } from './pages/scouting/scouting.component';
import { InventoryComponent } from './pages/inventory/inventory.component';
import { AgentsComponent } from './pages/agents/agents.component';
import { ImmediateDeliveryComponent } from './pages/immediate-delivery/immediate-delivery.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'scouting', component: ScoutingComponent },
  { path: 'inventory', component: InventoryComponent },
  { path: 'agents', component: AgentsComponent },
  { path: 'immediate-delivery', component: ImmediateDeliveryComponent },
  { path: '**', redirectTo: 'dashboard' }
];