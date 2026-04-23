-- 1. Aseguramos extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Divisas y Tasas (Se mantienen igual)
CREATE TABLE IF NOT EXISTS exchange_rates (
    currency_code CHAR(3) PRIMARY KEY,
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Reglas Fiscales (Se mantienen igual)
CREATE TABLE IF NOT EXISTS tax_rules (
    country_code CHAR(2) PRIMARY KEY,
    vat_rate DECIMAL(5, 2) NOT NULL,
    ioss_enabled BOOLEAN DEFAULT TRUE,
    currency_code CHAR(3) REFERENCES exchange_rates(currency_code)
);

-- 4. Productos e Inteligencia (EVOLUCIONADA)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aliexpress_id VARCHAR(100) UNIQUE NOT NULL,
    sku VARCHAR(50),
    title_original TEXT,
    
    -- Métricas de Selección (Filtros RapidAPI)
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0,
    shipping_time_days INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    rating DECIMAL(3, 2),
    sales_count INTEGER,
    
    -- Análisis de Arbitraje (Calculado por Gemini/Serper)
    competitor_data JSONB, -- Resultados crudos de Serper
    suggested_price_local DECIMAL(12, 2), -- Precio venta en país destino
    net_margin_usd DECIMAL(12, 2),        -- (P. Venta / IVA) - Costos - Fees
    roi_percent DECIMAL(8, 2),            -- Porcentaje de retorno
    
    -- Estado del Workflow
    status VARCHAR(20) DEFAULT 'CANDIDATE', -- CANDIDATE, WINNER, PUBLISHED, REJECTED
    target_country CHAR(2) REFERENCES tax_rules(country_code),
    
    -- Marketing Localizado (Generado por Gemini)
    marketing_copy JSONB, -- { "headline": "", "description": "", "features": [] }
    ai_verdict TEXT,      -- Explicación del porqué es Winner
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Órdenes (Actualizada para vincular con el producto)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    external_id VARCHAR(100), -- ID de Stripe/Checkout
    customer_email VARCHAR(255),
    country_code CHAR(2) REFERENCES tax_rules(country_code),
    total_local DECIMAL(12, 2),
    vat_amount_local DECIMAL(12, 2),
    net_amount_usd DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'paid', -- paid, ordered_on_ali, shipped, delivered
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- RE-CARGA DE DATOS MAESTROS
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('EUR', 1.08), ('GBP', 1.26), ('USD', 1.00)
ON CONFLICT (currency_code) DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd;

INSERT INTO tax_rules (country_code, vat_rate, ioss_enabled, currency_code) VALUES 
('DE', 19.00, TRUE, 'EUR'), ('ES', 21.00, TRUE, 'EUR'), 
('IT', 22.00, TRUE, 'EUR'), ('NL', 21.00, TRUE, 'EUR'), 
('GB', 20.00, FALSE, 'GBP')
ON CONFLICT (country_code) DO NOTHING;

-- Agregar Peso Chileno y Regla Fiscal
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES ('CLP', 950.00) -- Valor aprox
ON CONFLICT (currency_code) DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd;

INSERT INTO tax_rules (country_code, vat_rate, ioss_enabled, currency_code) VALUES 
('CL', 19.00, FALSE, 'CLP') -- Chile: IVA 19%, sin IOSS (Uso de Adunas locales)
ON CONFLICT (country_code) DO NOTHING;