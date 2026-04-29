import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

// Interfaces para tipar los datos
export interface KpiCard {
  title: string;
  value: string;
  change: number; // Porcentaje de cambio
  icon: string; // Clase de icono (Heroicons, FontAwesome)
}

export interface WinningProduct {
  id: string;
  name: string;
  country: string; // Código de país (CL, MX, ES)
  priceLocal: number;
  marginUsd: number;
  roi: number;
  imageUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardDataService {

  // --- KPI CARDS (HARDCODED) ---
  kpis: KpiCard[] = [
    { title: 'Total Sales (USD)', value: '$4,567', change: 12.3, icon: 'banknotes' },
    { title: 'Winners Found', value: '89', change: 5.0, icon: 'trophy' },
    { title: 'Avg. Margin %', value: '22%', change: -1.2, icon: 'chart-pie' },
    { title: 'Competitors Tracked', value: '1,234', change: 2.1, icon: 'users' }
  ];

  // --- SALES BY COUNTRY CHART (HARDCODED) ---
  countrySalesData: ChartData<'bar'> = {
    labels: ['CL', 'MX', 'ES', 'US'],
    datasets: [
      { 
        data: [460, 280, 240, 150], 
        label: 'USD Revenue', 
        backgroundColor: '#3b82f6', // blue-500
        borderRadius: 8
      }
    ]
  };

  // --- TRENDS TIMELINE CHART (HARDCODED) ---
  trendsTimelineData: ChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [5, 12, 8, 20, 15, 25],
        label: 'Niche: Smart Home Gadgets',
        borderColor: '#10b981', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        data: [8, 10, 15, 12, 18, 22],
        label: 'Niche: Portable Electronics',
        borderColor: '#a855f7', // purple-500
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // --- TOP WINNING PRODUCTS TABLE (HARDCODED) ---
  topProducts: WinningProduct[] = [
    {
      id: 'ali1001',
      name: 'Smart Posture Corrector',
      country: 'CL',
      priceLocal: 14990,
      marginUsd: 12.50,
      roi: 32.2,
      imageUrl: 'https://ae01.alicdn.com/kf/S... (Imagen Mock)'
    },
    {
      id: 'ali1002',
      name: 'Portable Space Heater',
      country: 'MX',
      priceLocal: 650,
      marginUsd: 8.90,
      roi: 28.5,
      imageUrl: 'https://ae01.alicdn.com/kf/H... (Imagen Mock)'
    },
    {
      id: 'ali1003',
      name: 'Thermal Winter Socks (Pack 5)',
      country: 'ES',
      priceLocal: 19.99,
      marginUsd: 6.20,
      roi: 25.1,
      imageUrl: 'https://ae01.alicdn.com/kf/U... (Imagen Mock)'
    }
  ];

  getKpis() { return this.kpis; }
  getCountrySales() { return this.countrySalesData; }
  getTrendsTimeline() { return this.trendsTimelineData; }
  getTopProducts() { return this.topProducts; }
}