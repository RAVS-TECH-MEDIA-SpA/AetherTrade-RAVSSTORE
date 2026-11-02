'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initMetaPixel } from '@/lib/metaPixel';

export default function MetaPixelInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialized = useRef(false);

  useEffect(() => {
    // 1. En la primera carga, initMetaPixel() inyecta el script y dispara el 1er PageView
    if (!isInitialized.current) {
      initMetaPixel();
      isInitialized.current = true;
    } 
    // 2. En las siguientes navegaciones, solo disparamos el PageView
    else if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}