'use client';
import { useEffect, useRef } from 'react';
import { trackMetaEvent } from '@/lib/metaPixel';

interface Props {
  paymentId: string;
  total: number;
  content_ids: string[];
}

export default function PurchaseTracker({ paymentId, total, content_ids }: Props) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!paymentId || paymentId.startsWith('unknown_')) return;
    if (hasTracked.current) return;
    if (!content_ids?.length) return;

    const key = `meta_purchase_${paymentId}`;
    if (sessionStorage.getItem(key)) return;

    trackMetaEvent('Purchase', {
      content_ids,
      content_type: 'product',
      value: Number(total),
      currency: 'CLP',
      num_items: content_ids.length,
    }, paymentId);

    hasTracked.current = true;
    sessionStorage.setItem(key, '1');
    localStorage.removeItem('last_order_backup'); // Limpia backup solo después de trackear
  }, [paymentId, total, content_ids]);

  return null;
}