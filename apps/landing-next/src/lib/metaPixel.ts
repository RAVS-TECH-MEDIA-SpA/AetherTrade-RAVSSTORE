// src/lib/metaPixel.ts
'use client';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

export function setCookie(name: string, value: string, days = 90): void {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + date.toUTCString();
  document.cookie = name + '=' + value + ';' + expires + ';path=/';
}

export function ensureFbcFromUrl(): void {
  if (typeof window === 'undefined') return;
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get('fbclid');
  if (fbclid) {
    const creationTime = new Date().getTime();
    const fbcValue = `fb.1.${creationTime}.${fbclid}`;
    setCookie('_fbc', fbcValue, 90);
  }
}

export function getFbp(): string | null {
  return getCookie('_fbp');
}

export function getFbc(): string | null {
  return getCookie('_fbc');
}

export function getMetaCookies(): { fbc: string | null; fbp: string | null } {
  return {
    fbc: getFbc(),
    fbp: getFbp(),
  };
}

export function generateEventId(): string {
  if (typeof crypto!== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x'? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// <-- INTEGRACIÓN QUE TE FALTABA
export function initMetaPixel() {
  if (typeof window === 'undefined') return;
  if (!META_PIXEL_ID) {
    console.warn('[Meta Pixel] NEXT_PUBLIC_META_PIXEL_ID no definido');
    return;
  }
  if (window.fbq) return; // ya inicializado

  // Snippet oficial de Meta
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded =!0;
    n.version = '2.0';
    n.queue = [];
    const t = b.createElement(e);
    t.async =!0;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
  ensureFbcFromUrl();
}

export function trackMetaEvent(eventName: string, data: any, eventId?: string): string {
  const finalEventId = eventId || generateEventId();
  if (typeof window!== 'undefined' && window.fbq) {
    window.fbq('track', eventName, data, { eventID: finalEventId });
  } else {
    console.warn(`[Meta Pixel] fbq no está definido. Evento ${eventName} no enviado.`);
  }
  return finalEventId;
}