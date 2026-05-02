// src/app/app.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    RouterModule,
    SidebarComponent
  ],
  templateUrl: './app.html',
  styles: [] // <-- Cambiamos styleUrls por styles vacíos para evitar el error
})
export class AppComponent {
  title = 'Aether Trade Admin';
}