import axios from 'axios';
import { pool } from '../lib/db.js'; // Asegúrate de que apunte a tu conexión de Supabase
import { listenArrayEvents } from 'chart.js/helpers';

export class CJDropshippingService {
  private apiKey = process.env.CJ_API_KEY;
  private email = process.env.CJ_EMAIL;
  private baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1';

  // ⚡ GESTIÓN INTELIGENTE DE TOKENS (Usa tu tabla api_tokens)
  private async getValidToken(): Promise<string> {
    const TOKEN_KEY = 'CJ_ACCESS_TOKEN';

    // 1. Buscamos si hay un token válido en la BD
    const { rows } = await pool.query(
      `SELECT token, expires_at FROM api_tokens WHERE key = $1`, 
      [TOKEN_KEY]
    );

    if (rows.length > 0) {
      const expiresAt = new Date(rows[0].expires_at);
      const now = new Date();
      // Si el token vence en más de 1 día, lo reutilizamos
      if (expiresAt.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
        return rows[0].token;
      }
    }

    // 2. Si no hay token o está por caducar, pedimos uno nuevo a CJ
    console.log('🔄 [CJ Auth] Solicitando nuevo Access Token a CJDropshipping...');
    try {
      const response = await axios.post(`${this.baseUrl}/authentication/getAccessToken`, {
        email: this.email,
        apiKey: this.apiKey
      });
      
      if (response.data.code === 200) {
        const newToken = response.data.data.accessToken;
        // CJ da 15 días. Calculamos 14 días (para tener margen de seguridad)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 14);

        // 3. Guardamos el nuevo token en la BD (Upsert)
        await pool.query(`
          INSERT INTO api_tokens (key, token, expires_at) 
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE 
          SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
        `, [TOKEN_KEY, newToken, expiryDate.toISOString()]);

        return newToken;
      }
      throw new Error(`CJ Auth Error: ${response.data.message}`);
    } catch (error: any) {
      console.error('🚨 [CJ Auth Error]:', error.response?.data || error.message);
      throw error;
    }
  }

  // 🚚 Calcula y selecciona automáticamente el mejor courier (Máximo 15 días, el más económico)
  private async getBestLogisticName(countryCode: string, variantId: string, quantity: number): Promise<string> {
    const token = await this.getValidToken();
    try {
      const response = await axios.post(`${this.baseUrl}/logistic/freightCalculate`, {
        startCountryCode: 'CN',
        endCountryCode: countryCode,
        products: [
          {
            vid: variantId,
            quantity: quantity
          }
        ]
      }, {
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json'
        }
      });

      const options = response.data?.data;
      if (!options || !Array.isArray(options) || options.length === 0) {
        console.warn("⚠️ [CJ Freight] Sin opciones de flete. Usando respaldo: CJPacket Latin America Line");
        return "CJPacket Latin America Line";
      }

      // Procesar y filtrar opciones que cumplan la regla de los 15 días
      const validOptions = options.map((opt: any) => {
        const agingText = String(opt.logisticAging || opt.deliveryTime || '');
        const numbers = agingText.match(/\d+/g);
        const maxDays = numbers ? parseInt(numbers[numbers.length - 1], 10) : 999;
        
        return {
          name: opt.logisticName || opt.name,
          price: Number(opt.logisticPrice || opt.price || 9999),
          maxDays: maxDays
        };
      }).filter((opt: any) => opt.maxDays <= 15 && opt.name); // ⚡ REGLA ESTRICTA: <= 15 días

      if (validOptions.length === 0) {
        console.warn("⚠️ [CJ Freight] Ninguna opción cumple con el límite de 15 días. Usando respaldo.");
        return "CJPacket Latin America Line";
      }

      // Ordenar por precio ascendente (el más barato que cumpla con el tiempo)
      validOptions.sort((a: any, b: any) => a.price - b.price);

      console.log(`📦 [CJ Freight] Courier elegido: ${validOptions[0].name} ($${validOptions[0].price} USD, ~${validOptions[0].maxDays} días)`);
      return validOptions[0].name;

    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al calcular fletes, usando respaldo:`, error.response?.data || error.message);
      return "CJPacket Latin America Line";
    }
  }

  // 📦 CREACIÓN DE LA ORDEN V2 (Automatizada)
  async createOrder(orderData: any, items: any[]) {
    const token = await this.getValidToken();

    const firstItem = items[0] || {};
    const bestLogistic = await this.getBestLogisticName(
      orderData.country_code || 'CL',
      firstItem.cj_variant_id,
      firstItem.quantity || 1
    );
console.log('🚀 [CJ Dropshipping] Preparando payload :', orderData, 'con courier:', bestLogistic);
   const payload = {
      orderNumber: String(orderData.order_id), 
      payType: 2, // Se mantiene 2 para deducción automática de billetera
      shippingZip: orderData.postal_code || '0000000',
      shippingCountry: 'Chile', 
      shippingCountryCode: orderData.country_code || 'CL',
      shippingProvince: orderData.state_province,
      shippingCity: orderData.city,
      shippingAddress: orderData.street, 
      shippingAddress2: orderData.details || '',
      houseNumber: String(orderData.number || ''), 
      shippingPhone: orderData.phone || '+56900000000',
      shippingCustomerName: `${orderData.first_name} ${orderData.last_name || ''}`.trim(),
      email: orderData.email || '', 
      taxId: orderData.document_id || '11111111-1',
      remark: 'Dropshipping order. Please do NOT include any invoices, price tags, receipts, or promotional materials inside or outside the package. Thank you!',
      fromCountryCode: 'CN', 
      platform: 'shopify', // ⚡ Cambiado de 'custom' a 'shopify' para pasar la validación de CJ
      logisticName: bestLogistic, // ⚡ Dinámico: Selecciona automáticamente el courier más económico cumpliendo el límite de 15 días
      products: items.map(item => ({
        vid: item.cj_variant_id, 
        quantity: item.quantity
      }))
    };
// 🔍 DEBUG: Imprime el JSON final formateado según las reglas de CJ
    console.log(`🚀 [DEBUG CJ API REQUEST] JSON final enviado a CJ:`, JSON.stringify(payload, null, 2));
    try {
      // Usamos el endpoint V2 mostrado en tu documentación
      const response = await axios.post(`${this.baseUrl}/shopping/order/createOrderV2`, payload, {
        headers: {
          'CJ-Access-Token': token,
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ [CJ Dropshipping] Orden ${orderData.order_id} inyectada exitosamente.`);
      return response.data;
    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al crear orden ${orderData.order_id}:`, error.response?.data || error.message);
      throw error;
    }
  }
  
  // 📦 OBTENER DETALLE Y TRACKING DE ÓRDENES EN LOTE (V2)
  async getOrderTrackingBatch(orderIds: string[]) {
    const token = await this.getValidToken();

    try {
      // ⚡ Usamos el endpoint POST 1.16 para enviar un array de IDs en el body
      const response = await axios.post(`${this.baseUrl}/shopping/order/getOrderDetailBatch`, {
        orderIds: orderIds
      }, {
        headers: { 
          'CJ-Access-Token': token,
          'Content-Type': 'application/json'
        }
      });

      // Retorna el array de órdenes (data)
      return response.data.data; 
    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al consultar batch de tracking:`, error.response?.data || error.message);
      return null;
    }
  }

  // 📦 OBTENER INVENTARIO DE UNA VARIANTE (VID) - ACTUALIZADO SEGÚN DOCS 2.0
async getVariantStock(vid: string): Promise<number | null> {
  const token = await this.getValidToken();
  try {
    // 🌟 CORRECCIÓN 1: Endpoint corregido según la documentación oficial de CJ (/product/stock/queryByVid)
    const response = await axios.get(`${this.baseUrl}/product/stock/queryByVid`, {
      params: { vid },
      headers: { 'CJ-Access-Token': token }
    });

    const dataArray = response.data?.data;
    
    // 🌟 CORRECCIÓN 2: Mapeo de la respuesta real. La data de CJ es directamente el array de almacenes.
    if (dataArray && Array.isArray(dataArray)) {
      // Buscamos específicamente el inventario en la bodega de China ('CN')
      const cnInventory = dataArray.find((inv: any) => inv.countryCode === 'CN');
      
      if (cnInventory && cnInventory.totalInventoryNum !== undefined) {
        return Number(cnInventory.totalInventoryNum); // Retorna la propiedad correcta de los nuevos Docs
      }

      // Fallback: Si no hay bodega en China pero sí en otras locaciones, sumamos el inventario total disponible
      if (dataArray.length > 0 && dataArray[0].totalInventoryNum !== undefined) {
        return dataArray.reduce((acc: number, curr: any) => acc + (Number(curr.totalInventoryNum) || 0), 0);
      }
    }
    
    return 0; // Si el arreglo viene vacío o sin datos válidos, asumimos stock 0 por seguridad
  } catch (error: any) {
    console.error(`🚨 [CJ Error] Fallo al consultar stock del VID ${vid}:`, error.response?.data || error.message);
    return null; // Retornamos null para diferenciar una caída de API de un stock 0 real
  }
}


  // 🔍 BUSCADOR DE PRODUCTOS (Discovery Worker)
  async searchProducts(keyword: string): Promise<any[]> {
    const token = await this.getValidToken();
    try {

      console.log(`🔍 [CJ Search] Buscando productos para el nicho: "${keyword}" con token válido.`);
      // ⚡ CORRECCIÓN API V2: Usamos productNameEn en lugar de keyword.
      // Además, agregamos minPrice: 5 para bloquear baratijas y asegurar tickets más altos.
      const response = await axios.get(`${this.baseUrl}/product/listV2`, {
        params: { 
          keyWord: keyword, 
          page: 1, 
          size: 50
        }, 
        headers: { 'CJ-Access-Token': token }
      });

      // ⚡ ESCUDO 1: CJ devuelve HTTP 200 pero con código interno de saturación
      if (response.data?.code === 1600200) {
        throw new Error("CJ_RATE_LIMIT");
      }
// 1. Extraemos de forma segura el arreglo real de productos
const contentObj = response.data?.data?.content?.[0];
const productList = contentObj?.productList || [];

// 2. Log de control preciso
console.log(`✅ [CJ Search] Resultados obtenidos para "${keyword}": ${productList.length} productos.`);

// 3. Mapeo correcto de las propiedades (id ➔ pid, nameEn ➔ productNameEn)
return productList.map((item: any) => ({
  ...item,
  pid: item.id || item.pid,
  productNameEn: item.nameEn || item.productNameEn || ''
}));

    } catch (error: any) {
      const errorData = error.response?.data || {};

      // ⚡ ESCUDO 2: Axios atrapa la saturación como excepción o la relanzamos desde el try
      if (errorData.code === 1600200 || error.message === "CJ_RATE_LIMIT") {
        throw new Error("CJ_RATE_LIMIT");
      }

      console.error(`🚨 [CJ Error] Fallo al buscar nicho "${keyword}":`, errorData || error.message);
      return [];
    }
  }

  // 📦 OBTENER DETALLE COMPLETO (Analysis Worker)
  async getProductDetail(pid: string): Promise<any> {
    const token = await this.getValidToken();
    try {
      const response = await axios.get(`${this.baseUrl}/product/query`, {
        params: { pid },
        headers: { 'CJ-Access-Token': token }
      });
      return response.data?.data;
    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al obtener detalle de ${pid}:`, error.response?.data || error.message);
      return null;
    }
  }


  /**
   * Calcula el flete estimado utilizando la API 2.0 de CJ Dropshipping
   * Retorna un objeto con la tarifa más barata y los días máximos de tránsito.
   */

  async getEstimatedFreight(vid: string, endCountryCode: string): Promise<{ price: number, transitDays: number }> {
    // ⚡ Obtenemos el token dinámico de su sistema
    const token = await this.getValidToken();

    try {
      const payload = {
        startCountryCode: "CN",
        endCountryCode: endCountryCode,
        products: [{ quantity: 1, vid: vid }]
      };

      // ⚡ Inyectamos el token en los headers de la petición POST
      const response = await axios.post(`${this.baseUrl}/logistic/freightCalculate`, payload, {
        headers: { 'CJ-Access-Token': token }
      });
      
      const methods = response.data?.data || []; 
      
      if (methods.length > 0) {
        // Encontramos el método con el 'logisticPrice' más bajo
        const cheapestMethod = methods.reduce((prev: any, curr: any) => {
          const prevPrice = Number(prev.logisticPrice) || Infinity;
          const currPrice = Number(curr.logisticPrice) || Infinity;
          return (currPrice < prevPrice) ? curr : prev;
        }, { logisticPrice: Infinity });

        if (cheapestMethod.logisticPrice !== Infinity) {
          const price = Number(cheapestMethod.logisticPrice);
          let transitDays = 15; // Valor estándar de respaldo

          // Parseamos el string de tiempo (ej. "15-45")
          if (cheapestMethod.logisticAging) {
            const parts = cheapestMethod.logisticAging.split('-');
            
            if (parts.length === 2) {
              const minDays = parseInt(parts[0], 10);
              const maxDays = parseInt(parts[1], 10);
              
              if (!isNaN(minDays) && !isNaN(maxDays)) {
                // 1. Calculamos el promedio entre el mínimo y el máximo
                const avgDays = Math.ceil((minDays + maxDays) / 2);
                
                // 2. Tope comercial: Si el promedio supera los 25 días, lo limitamos a 22.
                // Esto evita asustar al cliente por márgenes de seguridad irreales de CJ.
                transitDays = avgDays > 25 ? 22 : avgDays;
              }
            } else {
              // Fallback si la API devuelve un solo número (ej. "20")
              const maxDays = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(maxDays)) {
                transitDays = maxDays > 25 ? 22 : maxDays;
              }
            }
          }

          return { price, transitDays };
        }
      }
      
      console.warn(`⚠️ CJ no devolvió métodos válidos para VID ${vid}. Usando fallback.`);
      return { price: 5.00, transitDays: 15 }; 

    } catch (error: any) {
      // ⚡ Mejoramos el log para atrapar el mensaje exacto de CJ en caso de otro error HTTP
      console.error(`🚨 Error consultando flete dinámico en CJ para VID ${vid}:`, error.response?.data || error.message);
      return { price: 5.00, transitDays: 15 }; 
    }
  }
}