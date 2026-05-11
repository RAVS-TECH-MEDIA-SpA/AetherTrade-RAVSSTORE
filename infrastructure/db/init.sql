-- apps/infrastructure/db/init.sql
-- PROYECTO: AETHER TRADE 2026
-- REVISIÓN: 7.0 (Master Integrated - V7.0 Ready)
-- UBICACIÓN: Cabrero, Chile

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LIMPIEZA TOTAL (Para un inicio limpio de la ráfaga de nichos)
DROP TABLE IF EXISTS order_coupons CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS marketing_events CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS discovery_pool CASCADE;
DROP TABLE IF EXISTS search_batches CASCADE;
DROP TABLE IF EXISTS niche_stats CASCADE;
DROP TABLE IF EXISTS niche_cache CASCADE;
DROP TABLE IF EXISTS tax_rules CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. INFRAESTRUCTURA FINANCIERA
CREATE TABLE exchange_rates (
    currency_code CHAR(3) PRIMARY KEY,
    rate_to_usd DECIMAL(12, 6) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tax_rules (
    country_code CHAR(2) PRIMARY KEY,
    country_name VARCHAR(50) NOT NULL,
    vat_rate DECIMAL(5, 2) NOT NULL,
    gateway_fee_percent DECIMAL(5, 2) DEFAULT 5.00,
    currency_code CHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_tax_currency FOREIGN KEY (currency_code) REFERENCES exchange_rates(currency_code)
);

-- 3. TAXONOMÍA Y LOGÍSTICA
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    ali_category_id VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aliexpress_store_id VARCHAR(100) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    store_url TEXT,
    rating DECIMAL(3, 2),
    reliability_score INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. MOTOR DE MARKETING Y EVENTOS
CREATE TABLE marketing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    country_code CHAR(2) REFERENCES tax_rules(country_code),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES marketing_events(id) ON DELETE SET NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(12, 2) NOT NULL,
    min_purchase_amount DECIMAL(12, 2) DEFAULT 0,
    max_discount_amount DECIMAL(12, 2),
    usage_limit INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORQUESTACIÓN DE BATCHES (Harvest Global)
CREATE TABLE search_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) DEFAULT 'DISCOVERING',
    target_country CHAR(2) REFERENCES tax_rules(country_code),
    total_niches_requested INTEGER NOT NULL,
    completed_niches INTEGER DEFAULT 0,
    target_elite_count INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CACHE Y DISCOVERY POOL
CREATE TABLE niche_cache (
    id SERIAL PRIMARY KEY,
    country_code CHAR(2) NOT NULL,
    niche_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_niche_country UNIQUE (country_code, niche_text)
);

CREATE TABLE discovery_pool (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES search_batches(id) ON DELETE CASCADE,
    niche_id INTEGER REFERENCES niche_cache(id) ON DELETE SET NULL,
    aliexpress_id VARCHAR(100) NOT NULL,
    title_raw TEXT,
    price_est_usd DECIMAL(12, 2),
    sales_est INTEGER DEFAULT 0,
    rating_est DECIMAL(3, 2) DEFAULT 0,
    discovery_score DECIMAL(10, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MAESTRO DE PRODUCTOS (v7.0 - Atómico y Logístico)
-- NOTA: aliexpress_id es VARCHAR para evitar conflictos con UUID en el Gateway.
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES search_batches(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    aliexpress_id VARCHAR(100) NOT NULL,
    title_original TEXT NOT NULL,
    image_url TEXT,
    video_url TEXT,
    local_images JSONB DEFAULT '[]',
    base_cost_usd DECIMAL(12, 2) NOT NULL,
    shipping_cost_usd DECIMAL(12, 2) DEFAULT 0,
    weight_kg DECIMAL(10, 3) DEFAULT 0.500,
    suggested_price_local DECIMAL(12, 2),
    suggested_price DECIMAL(12, 2),
    roi_percent DECIMAL(10, 2) DEFAULT 0,
    net_margin_usd DECIMAL(12, 2) DEFAULT 0,
    vat_rate DECIMAL(5, 2),
    rate_to_usd DECIMAL(12, 6),
    target_country CHAR(2) NOT NULL REFERENCES tax_rules(country_code),
    status VARCHAR(20) DEFAULT 'PENDING',
    marketing_copy JSONB DEFAULT '{}', -- Aquí Gemini guarda copy y beneficios
    ai_verdict TEXT,
    raw_details JSONB DEFAULT '{}', -- Almacena el JSON completo de AliExpress (V6.0 Ready)
    total_stock INTEGER DEFAULT 0,
    source TEXT DEFAULT 'AliExpress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_market UNIQUE (aliexpress_id, target_country)
);

-- 8. VARIANTES (Tallas, Colores, SKU AliExpress - Sincronizado v7.0)
-- ⚡ AJUSTE CRÍTICO: Constraint UNIQUE en ali_sku_id para el Upsert del Worker.
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    ali_sku_id VARCHAR(100) NOT NULL UNIQUE, -- Ancla de sincronización global
    color VARCHAR(100),
    size VARCHAR(50),
    material VARCHAR(100),
    additional_cost_usd DECIMAL(12, 2) DEFAULT 0,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CRM Y ÓRDENES
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(150) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    password_hash TEXT,
    is_guest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    street TEXT NOT NULL,
    number VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country_code CHAR(2) REFERENCES tax_rules(country_code),
    is_default BOOLEAN DEFAULT FALSE
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    address_id UUID REFERENCES customer_addresses(id),
    status VARCHAR(30) DEFAULT 'PENDING_PAYMENT',
    tracking_number VARCHAR(100),
    total_amount_local DECIMAL(12, 2) NOT NULL,
    total_amount_usd DECIMAL(12, 2) NOT NULL,
    ali_order_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_local DECIMAL(12, 2) NOT NULL,
    unit_cost_usd DECIMAL(12, 2) NOT NULL
);

CREATE TABLE order_coupons (
    order_id UUID REFERENCES orders(id),
    coupon_id UUID REFERENCES coupons(id),
    discount_applied_local DECIMAL(12, 2) NOT NULL,
    PRIMARY KEY (order_id, coupon_id)
);

-- 10. USUARIOS SISTEMA Y SEEDS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'EDITOR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SEEDS FINANCIEROS Y DE ACCESO (Ajustados 2026)
INSERT INTO exchange_rates (currency_code, rate_to_usd) VALUES 
('USD', 1.000000), 
('CLP', 940.000000), 
('MXN', 17.500000), 
('BRL', 5.300000), 
('EUR', 0.930000);

INSERT INTO tax_rules (country_code, country_name, vat_rate, currency_code) VALUES 
('CL', 'Chile', 19.00, 'CLP'), 
('MX', 'México', 16.00, 'MXN');

INSERT INTO users (email, password_hash, role) 
VALUES ('admin@aether.trade', 'rodrigo_hash_secure_2026', 'ADMIN');

-- ÍNDICES ESTRATÉGICOS PARA RENDIMIENTO (Optimización de búsquedas Gateway/Worker)
CREATE INDEX idx_products_batch ON products(batch_id);
CREATE INDEX idx_products_ali_id ON products(aliexpress_id);
CREATE INDEX idx_products_market_status ON products(target_country, status);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_ali_sku ON product_variants(ali_sku_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_discovery_batch ON discovery_pool(batch_id);
CREATE INDEX idx_discovery_niche ON discovery_pool(niche_id);
CREATE INDEX idx_coupons_code ON coupons(code) WHERE is_active = TRUE;