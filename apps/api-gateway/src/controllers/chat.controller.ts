import { Request, Response } from 'express';
import { z } from 'zod';
import { GeminiService } from '../services/gemini.service.js';
import { findProductsForAssistant } from '../products/products.service.js';
import { MARKET_CONFIG } from '../services/constants.js';

const gemini = new GeminiService();
const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(700),
  country: z.string().trim().toUpperCase().default('CL'),
  mode: z.enum(['sales', 'support']).default('sales'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    text: z.string().max(1200)
  })).max(10).default([])
});

export const handleSalesChat = async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Mensaje inválido.' });
  }

  const { message, country, history, mode } = parsed.data;
  const market = MARKET_CONFIG[country as keyof typeof MARKET_CONFIG];
  if (!market) return res.status(400).json({ error: `Mercado no soportado: ${country}` });

  try {
    const products = await findProductsForAssistant(message, country);
    const catalog = products.map(product => ({
      id: product.id,
      title: product.marketing_copy?.title_localized || product.title_original,
      category: product.category_name,
      price: Number(product.suggested_price_local),
      currency: market.currency,
      inStock: product.in_stock,
      estimatedTransitDays: Number(product.estimated_transit_days) || null
    }));
    const reply = await gemini.answerSalesChat(message, 'RAVSSTORE', catalog, history, mode);

    return res.json({
      reply,
      products: products.map(product => ({
        id: product.id,
        title: product.marketing_copy?.title_localized || product.title_original,
        price: Number(product.suggested_price_local),
        currency: market.currency,
        imageUrl: product.image_url || ''
      }))
    });
  } catch (error) {
    console.error('Error procesando el asistente de ventas:', error);
    return res.status(502).json({ error: 'El asistente no está disponible en este momento.' });
  }
};
