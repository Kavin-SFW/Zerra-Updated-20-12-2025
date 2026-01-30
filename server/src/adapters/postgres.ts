import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
import { Client } from 'pg';

export class PostgresAdapter implements IDatabaseAdapter {
    private client: Client;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
        console.log(`[PostgresAdapter] Initializing with: host=${config.host}, port=${config.port}, database=${config.database}, user=${config.username}, ssl=${!!config.ssl}`);
        this.client = new Client({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database || 'postgres',
            ssl: config.ssl ? { rejectUnauthorized: false } : false
        });
    }

    async connect(): Promise<void> {
        console.log(`[PostgresAdapter] Attempting connection to ${this.config.host}...`);
        try {
            await this.client.connect();
            console.log(`[PostgresAdapter] ✅ Connection successful to ${this.config.host}`);
        } catch (err: any) {
            console.error(`[PostgresAdapter] ❌ Connection failed to ${this.config.host}:`, err.message);
            throw err;
        }
    }

    async disconnect(): Promise<void> {
        await this.client.end();
    }

    async testConnection(): Promise<void> {
        await this.connect();
        await this.client.query('SELECT 1');
        await this.disconnect();
    }

    async getTables(): Promise<TableSchema[]> {
        await this.connect();
        try {
            // 1. Get List of Tables
            const res = await this.client.query(`
                SELECT schemaname, tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            `);
            
            const tables = res.rows;
            const result: TableSchema[] = [];

            // 2. Dedicated Counting Functionality
            // We loop through each table to get the EXACT count
            for (const t of tables) {
                const fullTableName = `"${t.schemaname}"."${t.tablename}"`;
                const displayName = `${t.schemaname}.${t.tablename}`;
                try {
                    const countRes = await this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                    result.push({ 
                        name: displayName, 
                        rows: parseInt(countRes.rows[0].c) 
                    });
                } catch (e) {
                    // Fallback or error handling for individual tables
                    console.warn(`Failed to count rows for ${displayName}`, e);
                    result.push({ name: displayName, rows: 0 });
                }
            }
            return result;
        } finally {
            await this.disconnect();
        }
    }

    async query(sql: string): Promise<QueryResult> {
        await this.connect();
        try {
            const res = await this.client.query(sql);
            return {
                rows: res.rows,
                fields: res.fields
            };
        } finally {
            await this.disconnect();
        }
    }
}