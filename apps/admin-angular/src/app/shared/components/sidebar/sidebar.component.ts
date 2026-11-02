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
  mobileMenuOpen = false;

  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Panel general', route: '/dashboard' },
    { icon: 'rocket_launch', label: 'Scouting', route: '/scouting' },
    { icon: 'inventory_2', label: 'Catálogo', route: '/inventory' },
    { icon: 'local_shipping', label: 'Entrega inmediata', route: '/immediate-delivery' },
    { icon: 'smart_toy', label: 'Agentes IA', route: '/agents' }
  ];

  // Datos del perfil (pueden venir de un Auth Service luego)
  userName = 'Rodrigo Vargas Sanhueza';
  userRole = 'Administrator';

  logout(): void {
    console.log('Cerrando sesión en Aether Trade...');
  }

  toggleMobile(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobile(): void {
    this.mobileMenuOpen = false;
  }
}