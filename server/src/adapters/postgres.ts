import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
import { Client } from 'pg';

export class PostgresAdapter implements IDatabaseAdapter {
    private client: Client;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
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
        await this.client.connect();
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
            const res = await this.client.query(`
                SELECT schemaname || '.' || tablename as name
                FROM pg_catalog.pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            `);
            return res.rows.map(row => ({ name: row.name, rows: 0 }));
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
