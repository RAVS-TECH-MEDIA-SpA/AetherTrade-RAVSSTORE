'use client';
import { useEffect } from 'react';
import { ensureFbcFromUrl } from '@/lib/metaPixel';

export default function MetaPixelInit() {
  useEffect(() => {
    ensureFbcFromUrl();
  }, []);
  return null;
}