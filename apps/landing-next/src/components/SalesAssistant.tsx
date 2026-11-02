'use client';

import { FormEvent, useState } from 'react';
import { Bot, LoaderCircle, Send, ShoppingCart, X } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { trackMetaEvent } from '@/lib/metaPixel';
import { useCartStore, type CartItem } from '@/store/cartStore';

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  imageUrl: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: RecommendedProduct[];
}

interface SalesAssistantProps {
  countryCode?: string;
  storeName?: string;
}

export default function SalesAssistant({
  countryCode = 'CL',
  storeName = 'RAVSSTORE'
}: SalesAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const addItem = useCartStore(state => state.addItem);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = countryCode === 'MX' ? 'es-MX' : 'es-CL';
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setMessages(previous => [...previous, { role: 'user', text: message }]);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, country: countryCode, history })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pude responder ahora.');
      setMessages(previous => [...previous, {
        role: 'assistant',
        text: data.reply,
        products: data.products
      }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No pude responder ahora.');
    } finally {
      setIsSending(false);
    }
  };

  const addRecommendedProduct = (product: RecommendedProduct) => {
    const cartItem: CartItem = {
      id: `${product.id}:assistant`,
      productId: product.id,
      title: product.title,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl
    };
    addItem(cartItem);
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: product.currency
    });
    const confirmation = `Agregué ${product.title} a tu carrito. Puedes continuar cuando quieras.`;
    setMessages(previous => [...previous, { role: 'assistant', text: confirmation }]);
    speak(confirmation);
  };

  return (
    <div className="fixed bottom-6 left-6 z-[90]">
      {isOpen ? (
        <section className="flex h-[min(620px,85vh)] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-white shadow-2xl">
          <header className="flex items-center justify-between bg-violet-700 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">{storeName} · Asesora IA</p>
                <p className="text-[11px] text-violet-100">Ventas y soporte del catálogo</p>
              </div>
            </div>
            <button type="button" aria-label="Cerrar asistente" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-200">
                ¡Hola! Cuéntame qué buscas o qué duda tienes y te recomiendo opciones reales del catálogo.
              </p>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-8' : 'mr-4'}>
                <p className={`whitespace-pre-wrap rounded-xl p-3 text-sm ${
                  message.role === 'user' ? 'bg-violet-700' : 'bg-slate-800 text-slate-100'
                }`}>{message.text}</p>
                {message.products?.slice(0, 3).map(product => (
                  <article key={product.id} className="mt-2 flex gap-3 rounded-xl border border-slate-700 bg-slate-900 p-2">
                    {product.imageUrl && (
                      <img src={product.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-xs font-semibold">{product.title}</p>
                      <p className="mt-1 text-xs text-violet-300">
                        {new Intl.NumberFormat(countryCode === 'MX' ? 'es-MX' : 'es-CL', {
                          style: 'currency',
                          currency: product.currency
                        }).format(product.price)}
                      </p>
                      <button
                        type="button"
                        onClick={() => addRecommendedProduct(product)}
                        className="mt-1 flex items-center gap-1 text-xs font-bold text-white hover:text-violet-300"
                      >
                        <ShoppingCart className="h-3 w-3" /> Agregar al carrito
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
            {isSending && <LoaderCircle className="h-5 w-5 animate-spin text-violet-300" />}
            {error && <p className="text-xs text-rose-300">{error}</p>}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-800 p-3">
            <input
              value={input}
              onChange={event => setInput(event.target.value)}
              maxLength={700}
              placeholder="¿Qué producto necesitas?"
              className="min-w-0 flex-1 rounded-full bg-slate-800 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Enviar mensaje"
              className="rounded-full bg-violet-600 p-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-xl hover:bg-violet-500"
        >
          <Bot className="h-5 w-5" /> ¿Te ayudo a elegir?
        </button>
      )}
    </div>
  );
}
