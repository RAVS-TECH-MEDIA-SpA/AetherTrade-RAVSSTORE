-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de Divisas
CREATE TABLE exchange_rates (
    currency_code CHAR(3) PRIMARY KEY,
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reglas Fiscales por País
CREATE TABLE tax_rules (
    country_code CHAR(2) PRIMARY KEY,
    vat_rate DECIMAL(5, 2) NOT NULL,
    ioss_enabled BOOLEAN DEFAULT TRUE,
    currency_code CHAR(3) REFERENCES exchange_rates(currency_code)
);

-- Productos e Inteligencia
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(50) UNIQUE NOT NULL,
    aliexpress_id VARCHAR(100),
    base_cost_usd DECIMAL(12, 2),
    competitor_data JSONB,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Órdenes
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100),
    customer_email VARCHAR(255),
    country_code CHAR(2) REFERENCES tax_rules(country_code),
    total_local DECIMAL(12, 2),
    vat_amount_local DECIMAL(12, 2),
    net_amount_usd DECIMAL(12, 2),
    status VARCHAR(50) DEFAULT 'paid',
    raw_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Carga inicial de divisas (Valores base para inicialización)
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('EUR', 1.08),
('GBP', 1.26),
('USD', 1.00)
ON CONFLICT (currency_code) DO UPDATE SET rate_to_usd = EXCLUDED.rate_to_usd;

-- Reglas fiscales para mercados de altos ingresos en Europa
INSERT INTO tax_rules (country_code, vat_rate, ioss_enabled, currency_code) VALUES 
('DE', 19.00, TRUE, 'EUR'), -- Alemania
('ES', 21.00, TRUE, 'EUR'), -- España
('IT', 22.00, TRUE, 'EUR'), -- Italia
('NL', 21.00, TRUE, 'EUR'), -- Países Bajos
('GB', 20.00, FALSE, 'GBP') -- Reino Unido (Requiere manejo aduanero post-Brexit)
ON CONFLICT (country_code) DO NOTHING;