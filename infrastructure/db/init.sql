-- 1. Aseguramos extensiones para IDs robustos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Divisas y Tasas
CREATE TABLE IF NOT EXISTS exchange_rates (
    currency_code CHAR(3) PRIMARY KEY,
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Reglas Fiscales por País
CREATE TABLE IF NOT EXISTS tax_rules (
    country_code CHAR(2) PRIMARY KEY,
    vat_rate DECIMAL(5, 2) NOT NULL,
    ioss_enabled BOOLEAN DEFAULT TRUE,
    currency_code CHAR(3) REFERENCES exchange_rates(currency_code)
);

-- 4. CACHE DE NICHOS (Tu escudo contra el gasto de Gemini)
CREATE TABLE IF NOT EXISTS niche_cache (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) REFERENCES tax_rules(country_code),
    niche_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Productos e Inteligencia
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aliexpress_id VARCHAR(100) UNIQUE NOT NULL,
    sku VARCHAR(50),
    title_original TEXT,
    
    -- Métricas de Selección
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0,
    shipping_time_days INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    rating DECIMAL(3, 2),
    sales_count INTEGER,
    
    -- Análisis de Arbitraje
    competitor_data JSONB, 
    suggested_price_local DECIMAL(12, 2), 
    net_margin_usd DECIMAL(12, 2),        
    roi_percent DECIMAL(8, 2),            
    
    -- Estado del Workflow
    status VARCHAR(20) DEFAULT 'CANDIDATE', -- CANDIDATE, WINNER, REJECTED
    target_country CHAR(2) REFERENCES tax_rules(country_code),
    
    -- Marketing Localizado
    marketing_copy JSONB, 
    ai_verdict TEXT,      
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RE-CARGA DE DATOS MAESTROS
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('EUR', 1.08), ('GBP', 1.26), ('USD', 1.00), ('CLP', 950.00)
ON CONFLICT (currency_code) DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd;

INSERT INTO tax_rules (country_code, vat_rate, ioss_enabled, currency_code) VALUES 
('DE', 19.00, TRUE, 'EUR'), ('ES', 21.00, TRUE, 'EUR'), 
('IT', 22.00, TRUE, 'EUR'), ('GB', 20.00, FALSE, 'GBP'),
('CL', 19.00, FALSE, 'CLP')
ON CONFLICT (country_code) DO NOTHING;