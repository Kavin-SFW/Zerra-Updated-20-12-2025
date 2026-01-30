require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/zerra_analytics',
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
});

async function seed() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL...');

    // 1. Create Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        category VARCHAR(50),
        price DECIMAL(10, 2)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        region VARCHAR(50)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        total_amount DECIMAL(10, 2),
        order_date DATE,
        status VARCHAR(20)
      );
    `);
    console.log('Tables created.');

    // 2. Insert Mock Data (Products)
    await client.query(`
      INSERT INTO products (name, category, price) VALUES
      ('Laptop Pro', 'Electronics', 1200.00),
      ('Wireless Mouse', 'Electronics', 25.50),
      ('Office Chair', 'Furniture', 150.00),
      ('Desk Lamp', 'Furniture', 45.00),
      ('Monitor 4K', 'Electronics', 400.00);
    `);

    // 3. Insert Mock Data (Customers)
    await client.query(`
      INSERT INTO customers (name, email, region) VALUES
      ('Alice Johnson', 'alice@example.com', 'North America'),
      ('Bob Smith', 'bob@example.com', 'Europe'),
      ('Charlie Brown', 'charlie@example.com', 'Asia Pacific');
    `);

    // 4. Insert Mock Data (Orders)
    await client.query(`
      INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status) VALUES
      (1, 1, 1, 1200.00, '2023-10-01', 'Completed'),
      (1, 2, 2, 51.00, '2023-10-05', 'Completed'),
      (2, 3, 1, 150.00, '2023-10-10', 'Pending'),
      (3, 5, 2, 800.00, '2023-10-12', 'Shipped'),
      (2, 4, 1, 45.00, '2023-10-15', 'Completed');
    `);
    
    console.log('Data inserted successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await client.end();
  }
}

seed();