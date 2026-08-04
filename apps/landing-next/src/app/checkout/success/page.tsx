'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useSearchParams } from 'next/navigation';
import PurchaseTracker from './components/PurchaseTracker';

function SuccessContent() {
  const clearCart = useCartStore((state) => state.clearCart);
  const searchParams = useSearchParams();
  const [purchaseData, setPurchaseData] = useState<{ paymentId: string; total: number; content_ids: string[] } | null>(null);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id') || '';
    if (!paymentId) return;

    const raw = localStorage.getItem('last_order_backup');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const total = parsed.total || 0;
        const content_ids = parsed.items?.map((i: any) => i.productId) || [];
        if (content_ids.length > 0) {
          setPurchaseData({ paymentId, total, content_ids });
        }
      } catch {}
    }
    clearCart();
  }, [clearCart, searchParams]);

  return (
    <>
      {purchaseData && (
        <PurchaseTracker
          paymentId={purchaseData.paymentId}
          total={purchaseData.total}
          content_ids={purchaseData.content_ids}
        />
      )}
      <div className="max-w-md w-full bg-slate-900/50 border border-emerald-500/30 p-12 rounded- text-center backdrop-blur-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-500/20 p-4 rounded-full">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">
          ¡Pago <span className="text-emerald-500">Exitoso!</span>
        </h1>
        <p className="text-slate-400 mb-10">
          Tu orden ha sido procesada. Recibirás un correo con los detalles.
        </p>
        <Link href="/" className="block w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
          Volver a la Tienda
        </Link>
      </div>
    </>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-white">Cargando...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}