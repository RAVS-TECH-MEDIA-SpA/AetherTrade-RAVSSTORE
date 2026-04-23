import axios from 'axios';
import 'dotenv/config'; // Asegúrate de tener dotenv instalado

const checkAPI = async () => {
  const options = {
    method: 'GET',
    url: 'https://aliexpress-datahub.p.rapidapi.com/item_search',
    params: { q: 'Baseus 65W GaN', page: '1' },
    headers: {
      'X-RapidAPI-Key': process.env.RAPID_API_KEY,
      'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    if (response.data?.result?.item) {
      console.log("✅ Conexión Exitosa. Se encontraron", response.data.result.item.length, "productos.");
    } else {
      console.log("⚠️ Conexión establecida, pero la API devolvió un formato inesperado.");
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error("❌ Error de Autenticación/Suscripción:");
    console.error("Status:", error.response?.status);
    console.error("Mensaje:", error.response?.data?.message || error.message);
  }
};

checkAPI();