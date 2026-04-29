-- 1. LIMPIEZA TOTAL Y EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS niche_cache CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS tax_rules CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- 2. TASAS DE CAMBIO (Referencia para Arbitraje)
-- Crucial para que el AnalysisWorker convierta USD a CLP automáticamente
CREATE TABLE exchange_rates (
    currency_code CHAR(3) PRIMARY KEY,
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. REGLAS FISCALES Y MERCADOS
CREATE TABLE tax_rules (
    country_code CHAR(2) PRIMARY KEY,
    country_name VARCHAR(50) NOT NULL,
    vat_rate DECIMAL(5, 2) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_tax_currency FOREIGN KEY (currency_code) 
        REFERENCES exchange_rates(currency_code) ON DELETE RESTRICT
);

-- 4. PRODUCTOS (Sincronizado con Modal y Analysis Worker)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aliexpress_id VARCHAR(100) NOT NULL,
    title_original TEXT NOT NULL,
    
    -- Visuales
    image_url TEXT,                 -- URL original de AliExpress
    video_url TEXT,                 -- URL de video (YouTube/MP4)
    local_images JSONB DEFAULT '[]', -- Galería unificada (GCS + Serper)
    
    -- Arbitraje Financiero
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0,
    net_margin_usd DECIMAL(12, 2) DEFAULT 0,
    suggested_price_local DECIMAL(12, 2), -- Aquí guardaremos el valor en CLP (ej: 75000)
    roi_percent DECIMAL(10, 2) DEFAULT 0,
    competitor_avg_price DECIMAL(12, 2) DEFAULT 0,
    
    -- Métricas y Estado
    rating DECIMAL(3, 2) DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    target_country CHAR(2) NOT NULL,
    status VARCHAR(20) DEFAULT 'WINNER', -- 'WINNER', 'CANDIDATE', 'REJECTED'
    
    -- IA Marketing (Soporta Multilenguaje)
    marketing_copy JSONB DEFAULT '{}', -- { headline, description, bullets[], english_content }
    ai_verdict TEXT,                   -- EXPLICACIÓN TÉCNICA DE LA IA (Recuperado)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_product_country FOREIGN KEY (target_country) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_product_market UNIQUE (aliexpress_id, target_country)
);

-- 5. CACHE DE NICHOS (Para TrendService)
CREATE TABLE niche_cache (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    niche_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_niche_country FOREIGN KEY (country_code) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_niche_country UNIQUE (country_code, niche_text)
);

-- 6. ÍNDICES (Optimización de búsqueda)
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_country ON products(target_country);
CREATE INDEX idx_products_created ON products(created_at DESC);

-- 7. AUTOMATIZACIÓN DE ACTUALIZACIÓN
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at 
BEFORE UPDATE ON products 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-----------------------------------------------------------
-- 8. CARGA DE DATOS MAESTROS (Escenario Abril 2026)
-----------------------------------------------------------

-- Insertar Monedas con tasa proyectada a 2026
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('USD', 1.00), 
('CLP', 855.00), 
('BRL', 5.15), 
('MXN', 17.10), 
('EUR', 0.93), 
('GBP', 0.80);

-- Países activos para el Discovery
INSERT INTO tax_rules (country_code, country_name, vat_rate, currency_code, is_active) VALUES 
('CL', 'Chile', 19.00, 'CLP', TRUE),
('BR', 'Brasil', 17.00, 'BRL', FALSE),
('MX', 'México', 16.00, 'MXN', FALSE),
('ES', 'España', 21.00, 'EUR', FALSE);