// apps/admin-angular/src/app/shared/components/sidebar/sidebar.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  
  // Estructura del menú basada en la maqueta Aether Dashboard 2026
 // apps/admin-angular/src/app/shared/components/sidebar/sidebar.component.ts
navItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { icon: 'rocket_launch', label: 'Scouting', route: '/scouting' }, // El "Corazón" de la búsqueda
  { icon: 'inventory_2', label: 'Inventory', route: '/inventory' }, // Los 77 productos actuales
  { icon: 'query_stats', label: 'Trends', route: '/trends' },
  { icon: 'settings', label: 'Settings', route: '/settings' }
];

  // Datos del perfil (pueden venir de un Auth Service luego)
  userName = 'Rodrigo Vargas Sanhueza';
  userRole = 'Administrator';

  logout(): void {
    console.log('Cerrando sesión en Aether Trade...');
  }
}