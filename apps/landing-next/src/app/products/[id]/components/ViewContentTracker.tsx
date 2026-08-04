'use client';
import { useEffect } from 'react';
import { trackMetaEvent, generateEventId } from '@/lib/metaPixel';

interface Props {
  product: { id: string; suggested_price_local: number; title: string };
}

export default function ViewContentTracker({ product }: Props) {
  useEffect(() => {
    // 1. Generamos un ID único para la deduplicación de este evento
    const eventId = generateEventId();
    
    // Opcional: Guardamos en sesión por si lo necesitas para el flujo de pago
    sessionStorage.setItem(`vc_${product.id}`, eventId);
    
    // 2. Disparamos el evento a Facebook
    trackMetaEvent(
      'ViewContent',
      {
        content_ids: [product.id],
        content_type: 'product',
        content_name: product.title,
        value: Number(product.suggested_price_local),
        currency: 'CLP',
      },
      eventId
    );
  }, [product]);

  return null; // Es un componente invisible que solo ejecuta lógica
}