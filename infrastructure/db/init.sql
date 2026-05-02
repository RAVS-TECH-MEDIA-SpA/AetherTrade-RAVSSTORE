-- apps/infrastructure/db/init.sql

-- 1. LIMPIEZA TOTAL Y EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS niche_stats CASCADE;
DROP TABLE IF EXISTS sales_performance CASCADE;
DROP TABLE IF EXISTS niche_cache CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS tax_rules CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

DROP TABLE IF EXISTS sales_performance CASCADE;

-- 2. TASAS DE CAMBIO
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
    image_url TEXT,
    video_url TEXT,
    local_images JSONB DEFAULT '[]',
    
    -- Arbitraje Financiero
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0,
    net_margin_usd DECIMAL(12, 2) DEFAULT 0,
    suggested_price_local DECIMAL(12, 2),
    roi_percent DECIMAL(10, 2) DEFAULT 0,
    competitor_avg_price DECIMAL(12, 2) DEFAULT 0,
    
    -- Métricas y Estado
    rating DECIMAL(3, 2) DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    target_country CHAR(2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- Cambiado a PENDING por seguridad
    
    -- IA Marketing
    marketing_copy JSONB DEFAULT '{}',
    ai_verdict TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PERSISTENCIA DE DATOS CRUDA (Al final para no romper mapeos antiguos)
    raw_details JSONB DEFAULT '{}', 
    
    CONSTRAINT fk_product_country FOREIGN KEY (target_country) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_product_market UNIQUE (aliexpress_id, target_country)
);

-- 5. CACHE DE NICHOS
CREATE TABLE niche_cache (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    niche_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_niche_country FOREIGN KEY (country_code) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_niche_country UNIQUE (country_code, niche_text)
);

-- 6. NUEVA: RENDIMIENTO DE VENTAS (Para el Widget "Total Sales" y "Sales Analysis")
CREATE TABLE sales_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- Métricas de Ingreso
    amount_usd DECIMAL(12, 2) NOT NULL, -- Precio de venta final cobrado al cliente
    
    -- Métricas de Egreso (Lo que absorbemos)
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0, -- Lo que pagamos nosotros por el envío "gratis"
    tax_paid_usd DECIMAL(12, 2) DEFAULT 0,      -- Impuestos (IVA/VAT) pagados en esa venta
    gateway_fee_usd DECIMAL(12, 2) DEFAULT 0,   -- Comisión de la pasarela (ej: 5%)
    
    -- El "Bottom Line"
    net_profit_usd DECIMAL(12, 2) NOT NULL,    -- Ganancia real: (Amount - Shipping - Tax - Fee - BaseCost)
    
    -- Segmentación
    country_code CHAR(2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para filtros rápidos por Producto y País
CREATE INDEX idx_sales_product ON sales_performance(product_id);
CREATE INDEX idx_sales_country_date ON sales_performance(country_code, sale_date);

-- 7. NUEVA: ESTADÍSTICAS DE NICHOS (Para el Widget "Trend Scouting")
-- Registra cuántos ganadores se encuentran por cada ejecución del Discovery
CREATE TABLE niche_stats (
    id SERIAL PRIMARY KEY,
    niche_id INTEGER REFERENCES niche_cache(id) ON DELETE CASCADE,
    winners_count INTEGER DEFAULT 0,
    avg_roi DECIMAL(10, 2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. AUTOMATIZACIÓN Y DATOS MAESTROS (Exchange & Taxes)
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('USD', 1.00), ('CLP', 855.00), ('MXN', 17.10), ('EUR', 0.93);

INSERT INTO tax_rules (country_code, country_name, vat_rate, currency_code, is_active) VALUES 
('CL', 'Chile', 19.00, 'CLP', TRUE),
('MX', 'México', 16.00, 'MXN', FALSE),
('ES', 'España', 21.00, 'EUR', FALSE);

-- Índices para el Dashboard
CREATE INDEX idx_sales_date ON sales_performance(sale_date);
CREATE INDEX idx_niche_stats_date ON niche_stats(recorded_at);