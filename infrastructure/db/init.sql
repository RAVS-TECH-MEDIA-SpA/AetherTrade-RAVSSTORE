-- apps/infrastructure/db/init.sql
-- PROYECTO: AETHER TRADE 2026
-- UBICACIÓN: Cabrero, Región del Biobío, Chile

-- 1. LIMPIEZA TOTAL Y EXTENSIONES
-- Eliminamos en orden inverso de dependencias para evitar errores de FK
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS niche_stats CASCADE;
DROP TABLE IF EXISTS sales_performance CASCADE;
DROP TABLE IF EXISTS niche_cache CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tax_rules CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- 2. TASAS DE CAMBIO (Fuente de Verdad Financiera)
CREATE TABLE exchange_rates (
    currency_code CHAR(3) PRIMARY KEY, -- CLP, MXN, BRL, USD, EUR
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. REGLAS FISCALES Y MERCADOS (Configuración de Operación)
CREATE TABLE tax_rules (
    country_code CHAR(2) PRIMARY KEY, -- CL, MX, BR
    country_name VARCHAR(50) NOT NULL,
    vat_rate DECIMAL(5, 2) NOT NULL,
    currency_code CHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_tax_currency FOREIGN KEY (currency_code) 
        REFERENCES exchange_rates(currency_code) ON DELETE RESTRICT
);

-- 4. PRODUCTOS (Maestro de Winners encontrados por la IA)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aliexpress_id VARCHAR(100) NOT NULL,
    title_original TEXT NOT NULL,
    
    -- Visuales y Multimedia para Landing y Dashboard
    image_url TEXT,
    video_url TEXT,
    local_images JSONB DEFAULT '[]',
    
    -- Arbitraje Financiero y Cálculos de ROI
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0, -- Costo absorbido por nosotros
    net_margin_usd DECIMAL(12, 2) DEFAULT 0,
    suggested_price_local DECIMAL(12, 2),       -- Precio final en moneda local
    roi_percent DECIMAL(10, 2) DEFAULT 0,
    competitor_avg_price DECIMAL(12, 2) DEFAULT 0,
    
    -- Métricas de Mercado y Segmentación
    rating DECIMAL(3, 2) DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    target_country CHAR(2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, WINNER, REJECTED
    
    -- IA Marketing & Contenidos Localizados
    marketing_copy JSONB DEFAULT '{}', -- { "localizedProductName": "...", "description": "..." }
    ai_verdict TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Datos crudos de la última ejecución del Scraper
    raw_details JSONB DEFAULT '{}', 
    
    CONSTRAINT fk_product_country FOREIGN KEY (target_country) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_product_market UNIQUE (aliexpress_id, target_country)
);
ALTER TABLE products ADD COLUMN source TEXT DEFAULT 'AliExpress';
-- Agregamos la columna faltante para el precio sugerido
ALTER TABLE products ADD COLUMN IF NOT EXISTS suggested_price NUMERIC(10, 2);

-- Aprovechamos de asegurar que las columnas de desglose de costo existan
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_cost_usd NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_cost_usd NUMERIC(10, 2);
-- 5. CACHE DE NICHOS (Discovery History)
CREATE TABLE niche_cache (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    niche_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_niche_country FOREIGN KEY (country_code) 
        REFERENCES tax_rules(country_code) ON DELETE CASCADE,
    CONSTRAINT unique_niche_country UNIQUE (country_code, niche_text)
);

-- 6. RENDIMIENTO DE VENTAS (Transaccional - Sincronizado con Webhooks de Mercado Pago)
CREATE TABLE sales_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- NUEVA COLUMNA: Cantidad de unidades vendidas (Manejo de Bundles)
    quantity INTEGER DEFAULT 1 NOT NULL,
    
    -- Métricas de Ingreso Bruto
    amount_usd DECIMAL(12, 2) NOT NULL, -- (suggested_price_local * quantity) convertido a USD
    
    -- Costos Variables (Lo que absorbemos y comisiones)
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0, -- Costo logístico real por el envío "gratis"
    tax_paid_usd DECIMAL(12, 2) DEFAULT 0,      -- Impuestos liquidados (IVA/VAT)
    gateway_fee_usd DECIMAL(12, 2) DEFAULT 0,   -- Comisión pasarela (Mercado Pago/Stripe)
    
    -- Utilidad Real del Pedido
    net_profit_usd DECIMAL(12, 2) NOT NULL,     -- Ganancia: (Amount - Shipping - Tax - Fee - (BaseCost * Quantity))
    
    -- Metadata Geográfica y Temporal
    country_code CHAR(2) NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices optimizados para el Dashboard de Angular y Analytics
CREATE INDEX idx_sales_product ON sales_performance(product_id);
CREATE INDEX idx_sales_country_date ON sales_performance(country_code, sale_date);
CREATE INDEX idx_sales_date ON sales_performance(sale_date);

-- 7. ESTADÍSTICAS DE NICHOS (Data para el Widget "Trend Scouting")
CREATE TABLE niche_stats (
    id SERIAL PRIMARY KEY,
    niche_id INTEGER REFERENCES niche_cache(id) ON DELETE CASCADE,
    winners_count INTEGER DEFAULT 0,
    avg_roi DECIMAL(10, 2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_niche_stats_date ON niche_stats(recorded_at);

-- 8. GESTIÓN DE USUARIOS (Seguridad Dashboard)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'EDITOR', -- ADMIN o EDITOR
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. SEMILLA DE DATOS MAESTROS (Carga Inicial)

-- Tasas de Cambio iniciales (Aprox Mayo 2026)
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('USD', 1.000000), 
('CLP', 845.000000), 
('MXN', 16.800000), 
('BRL', 5.150000),
('EUR', 0.920000);

-- Reglas Fiscales para Mercados Objetivo
INSERT INTO tax_rules (country_code, country_name, vat_rate, currency_code, is_active) VALUES 
('CL', 'Chile', 19.00, 'CLP', TRUE),
('MX', 'México', 16.00, 'MXN', FALSE),
('BR', 'Brasil', 17.00, 'BRL', FALSE),
('ES', 'España', 21.00, 'EUR', FALSE);

-- Usuario Administrador de Rodrigo (Cabrero Dev)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@aether.trade', 'rodrigo_hash_secure_2026', 'ADMIN');