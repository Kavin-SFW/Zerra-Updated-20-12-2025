const { Client } = require('pg');
const mysql = require('mysql2/promise');
const sql = require('mssql');

// --- DATA TO INSERT ---
const createTablesSql = {
    postgres: [
        `CREATE TABLE IF NOT EXISTS products (id SERIAL PRIMARY KEY, name VARCHAR(100), category VARCHAR(50), price DECIMAL(10, 2))`,
        `CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), region VARCHAR(50))`,
        `CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, customer_id INTEGER, product_id INTEGER, quantity INTEGER, total_amount DECIMAL(10, 2), order_date DATE, status VARCHAR(20))`
    ],
    mysql: [
        `CREATE TABLE IF NOT EXISTS products (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), category VARCHAR(50), price DECIMAL(10, 2))`,
        `CREATE TABLE IF NOT EXISTS customers (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), region VARCHAR(50))`,
        `CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, customer_id INTEGER, product_id INTEGER, quantity INTEGER, total_amount DECIMAL(10, 2), order_date DATE, status VARCHAR(20))`
    ],
    mssql: [
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='products' AND xtype='U') CREATE TABLE products (id INT IDENTITY(1,1) PRIMARY KEY, name VARCHAR(100), category VARCHAR(50), price DECIMAL(10, 2))`,
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='customers' AND xtype='U') CREATE TABLE customers (id INT IDENTITY(1,1) PRIMARY KEY, name VARCHAR(100), email VARCHAR(100), region VARCHAR(50))`,
        `IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='orders' AND xtype='U') CREATE TABLE orders (id INT IDENTITY(1,1) PRIMARY KEY, customer_id INTEGER, product_id INTEGER, quantity INTEGER, total_amount DECIMAL(10, 2), order_date DATE, status VARCHAR(20))`
    ]
};

const insertDataSql = {
    postgres: [
        `INSERT INTO products (name, category, price) VALUES ('Laptop Pro', 'Electronics', 1200.00), ('Wireless Mouse', 'Electronics', 25.50), ('Office Chair', 'Furniture', 150.00)`,
        `INSERT INTO customers (name, email, region) VALUES ('Alice Johnson', 'alice@example.com', 'North America'), ('Bob Smith', 'bob@example.com', 'Europe')`,
        `INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status) VALUES (1, 1, 1, 1200.00, '2023-10-01', 'Completed'), (2, 3, 1, 150.00, '2023-10-10', 'Pending')`
    ],
    mysql: [
        `INSERT INTO products (name, category, price) VALUES ('Laptop Pro', 'Electronics', 1200.00), ('Wireless Mouse', 'Electronics', 25.50), ('Office Chair', 'Furniture', 150.00)`,
        `INSERT INTO customers (name, email, region) VALUES ('Alice Johnson', 'alice@example.com', 'North America'), ('Bob Smith', 'bob@example.com', 'Europe')`,
        `INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status) VALUES (1, 1, 1, 1200.00, '2023-10-01', 'Completed'), (2, 3, 1, 150.00, '2023-10-10', 'Pending')`
    ],
    mssql: [
        `INSERT INTO products (name, category, price) VALUES ('Laptop Pro', 'Electronics', 1200.00), ('Wireless Mouse', 'Electronics', 25.50), ('Office Chair', 'Furniture', 150.00)`,
        `INSERT INTO customers (name, email, region) VALUES ('Alice Johnson', 'alice@example.com', 'North America'), ('Bob Smith', 'bob@example.com', 'Europe')`,
        `INSERT INTO orders (customer_id, product_id, quantity, total_amount, order_date, status) VALUES (1, 1, 1, 1200.00, '2023-10-01', 'Completed'), (2, 3, 1, 150.00, '2023-10-10', 'Pending')`
    ]
};

async function seedPostgres() {
    console.log('--- Seeding PostgreSQL ---');
    const client = new Client({ host: 'localhost', port: 5432, user: 'postgres', password: 'password123', database: 'zerra_analytics' });
    try {
        await client.connect();
        for (const sql of createTablesSql.postgres) await client.query(sql);
        for (const sql of insertDataSql.postgres) await client.query(sql);
        console.log('PostgreSQL seeded successfully.');
    } catch (e) { console.error('PostgreSQL Error:', e.message); }
    finally { await client.end(); }
}

async function seedMysql() {
    console.log('--- Seeding MySQL ---');
    try {
        const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'admin', password: 'password123', database: 'zerra_analytics' });
        for (const sql of createTablesSql.mysql) await conn.execute(sql);
        // Clean up previous data to avoid duplicates on re-run
        await conn.execute('TRUNCATE TABLE products');
        await conn.execute('TRUNCATE TABLE customers');
        await conn.execute('TRUNCATE TABLE orders');
        for (const sql of insertDataSql.mysql) await conn.execute(sql);
        console.log('MySQL seeded successfully.');
        await conn.end();
    } catch (e) { console.error('MySQL Error:', e.message); }
}

async function seedMssql() {
    console.log('--- Seeding SQL Server ---');
    const config = { user: 'sa', password: 'Password123!', server: 'localhost', port: 1433, database: 'master', options: { encrypt: false, trustServerCertificate: true } };
    try {
        const pool = await sql.connect(config);
        
        // Ensure Database Exists (System DB 'master' context)
        // Note: Creating DB in MSSQL requires special handling, skipping if exists
        try { await pool.request().query("CREATE DATABASE zerra_analytics"); } catch (e) {}

        // Switch to DB
        await pool.query("USE zerra_analytics");

        for (const q of createTablesSql.mssql) await pool.request().query(q);
        for (const q of insertDataSql.mssql) await pool.request().query(q);
        
        console.log('SQL Server seeded successfully.');
        await pool.close();
    } catch (e) { console.error('SQL Server Error:', e.message); }
}

async function main() {
    await seedPostgres();
    await seedMysql();
    await seedMssql();
}

main();
