import axios from 'axios';
import { pool } from '../lib/db.js'; // Asegúrate de que apunte a tu conexión de Supabase

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

   const payload = {
      orderNumber: String(orderData.order_id), 
      payType: 2, // Se mantiene 2 para deducción automática de billetera
      shippingZip: orderData.postal_code || '0000000',
      shippingCountry: 'Chile', 
      shippingCountryCode: orderData.country_code || 'CL',
      shippingProvince: orderData.state_province,
      shippingCity: orderData.city,
      shippingAddress: orderData.street, 
      houseNumber: String(orderData.number || ''), 
      shippingPhone: orderData.phone || '+56900000000',
      shippingCustomerName: `${orderData.first_name} ${orderData.last_name || ''}`.trim(),
      email: orderData.email || '', 
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
  // 📦 OBTENER DETALLE Y TRACKING DE LA ORDEN
  async getOrderTracking(orderId: string) {
    const token = await this.getValidToken();

    try {
      // CJ usa query params para los GET
      const response = await axios.get(`${this.baseUrl}/shopping/order/getOrderDetail`, {
        params: { orderNumber: orderId },
        headers: { 'CJ-Access-Token': token }
      });

      return response.data.data; // Retorna el objeto con status y trackingNumber
    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al consultar orden ${orderId}:`, error.response?.data || error.message);
      return null;
    }
  }

  // 📦 OBTENER INVENTARIO DE UNA VARIANTE (VID)
  async getVariantStock(vid: string): Promise<number | null> {
    const token = await this.getValidToken();
    try {
      // ⚡ URL exacta entregada por la documentación de CJ
      const response = await axios.get(`${this.baseUrl}/product/variant/queryByVid`, {
        params: { vid },
        headers: { 'CJ-Access-Token': token }
      });

      const data = response.data.data;
      
      if (data && data.inventories && Array.isArray(data.inventories)) {
        // Buscamos específicamente el inventario en la bodega de China ('CN')
        const cnInventory = data.inventories.find((inv: any) => inv.countryCode === 'CN');
        
        if (cnInventory && cnInventory.totalInventory !== undefined) {
          return Number(cnInventory.totalInventory);
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
      const response = await axios.get(`${this.baseUrl}/product/list`, {
        params: { keyword, pageNum: 1, pageSize: 50 }, // Traemos los primeros 50 para evaluar
        headers: { 'CJ-Access-Token': token }
      });
      const list = response.data?.data?.list || [];
      
      // ⚡ CORRECCIÓN DE MAPEO SEGÚN DOCUMENTACIÓN:
      // La API de CJ devuelve el identificador como 'id' y el nombre como 'nameEn', 
      // mientras que los workers esperan 'pid' y 'productNameEn'.
      return list.map((item: any) => ({
        ...item,
        pid: item.id || item.pid,
        productNameEn: item.nameEn || item.productNameEn || ''
      }));
    } catch (error: any) {
      console.error(`🚨 [CJ Error] Fallo al buscar nicho "${keyword}":`, error.response?.data || error.message);
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
}