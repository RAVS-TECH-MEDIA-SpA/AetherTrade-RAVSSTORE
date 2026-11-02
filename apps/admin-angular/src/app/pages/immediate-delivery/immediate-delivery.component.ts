import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface DeliveryProductPreview {
  name: string;
  category: string;
  price: number;
  localStock: number;
  estimatedDelivery: string;
  status: 'Demo';
}

@Component({
  selector: 'app-immediate-delivery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './immediate-delivery.component.html'
})
export class ImmediateDeliveryComponent {
  readonly products: DeliveryProductPreview[] = [
    { name: 'Organizador compacto para el hogar', category: 'Hogar', price: 19990, localStock: 18, estimatedDelivery: '1–3 días hábiles', status: 'Demo' },
    { name: 'Luz portátil recargable', category: 'Tecnología', price: 24990, localStock: 12, estimatedDelivery: '1–3 días hábiles', status: 'Demo' },
    { name: 'Accesorio práctico para viajes', category: 'Viajes', price: 14990, localStock: 24, estimatedDelivery: '1–3 días hábiles', status: 'Demo' }
  ];
}
