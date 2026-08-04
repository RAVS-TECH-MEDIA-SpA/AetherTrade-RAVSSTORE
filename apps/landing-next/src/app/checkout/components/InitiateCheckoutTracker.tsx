'use client';
import { useEffect, useRef } from 'react';
import { trackMetaEvent, generateEventId } from '@/lib/metaPixel';

interface Props {
  products: { id: string }[];
  total: number;
}

export default function InitiateCheckoutTracker({ products, total }: Props) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    if (!products?.length || !total) return;

    // Evita doble disparo si el usuario vuelve atrás o Strict Mode en dev
    const sessionKey = `meta_ic_${products.length}_${total}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) return;

    const eventId = generateEventId();

    trackMetaEvent('InitiateCheckout', {
      content_ids: products.map((p: any) => p.id), // debe ser products.id::text = g:id del feed
      content_type: 'product',
      value: Number(total),
      currency: 'CLP',
      num_items: products.length,
    }, eventId);

    hasTracked.current = true;
    sessionStorage.setItem(sessionKey, eventId);
  }, [products, total]);

  return null;
}