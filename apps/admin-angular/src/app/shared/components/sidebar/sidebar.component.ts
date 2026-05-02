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
  navItems: NavItem[] = [
    { icon: 'insert_chart', label: 'Analytics', route: '/dashboard' },
    { icon: 'inventory_2', label: 'Inventory', route: '/inventory' },
    { icon: 'query_stats', label: 'Trends', route: '/trends' },
    { icon: 'group', label: 'Team', route: '/team' },
    { icon: 'settings', label: 'Settings', route: '/settings' },
    { icon: 'help_outline', label: 'Help', route: '/help' }
  ];

  // Datos del perfil (pueden venir de un Auth Service luego)
  userName = 'Rodrigo Vargas Sanhueza';
  userRole = 'Administrator';

  logout(): void {
    console.log('Cerrando sesión en Aether Trade...');
  }
}