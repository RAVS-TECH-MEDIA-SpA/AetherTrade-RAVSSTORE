-- TABLA DE ÓRDENES (Cabecera)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    mp_preference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING',
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_rut VARCHAR(50),
    customer_phone VARCHAR(50),
    shipping_address TEXT,
    shipping_city VARCHAR(100),
    shipping_region VARCHAR(100),
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA DE ITEMS DE LA ORDEN (Detalle)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    variant_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL
);
