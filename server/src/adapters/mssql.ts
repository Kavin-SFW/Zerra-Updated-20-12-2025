import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
import sql from 'mssql';

export class MssqlAdapter implements IDatabaseAdapter {
    private pool: sql.ConnectionPool | null = null;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    private getConfig(): sql.config {
        return {
            user: this.config.username,
            password: this.config.password,
            server: this.config.host,
            port: this.config.port,
            database: this.config.database || 'master',
            options: {
                encrypt: false, // For Docker/Local development mostly
                trustServerCertificate: true, // Important for self-signed certs (common in Docker)
                connectTimeout: 30000 // Increase timeout to 30s
            }
        };
    }

    async connect(): Promise<void> {
        this.pool = await sql.connect(this.getConfig());
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
    }

    async testConnection(): Promise<void> {
        await this.connect();
        await this.disconnect();
    }

    async getTables(): Promise<TableSchema[]> {
        await this.connect();
        try {
            // 1. Get List
            const listResult = await this.pool!.request().query(`
                SELECT TABLE_SCHEMA, TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
            `);
            
            const result: TableSchema[] = [];

            // 2. Dedicated Counting
            for (const row of listResult.recordset) {
                const schema = row.TABLE_SCHEMA;
                const table = row.TABLE_NAME;
                const fullName = `${schema}.${table}`;
                const safeName = `[${schema}].[${table}]`;

                try {
                    const countRes = await this.pool!.request().query(`SELECT COUNT(*) as c FROM ${safeName}`);
                    result.push({ 
                        name: fullName, 
                        rows: countRes.recordset[0].c 
                    });
                } catch (e) {
                    result.push({ name: fullName, rows: 0 });
                }
            }
            return result;
        } finally {
            await this.disconnect();
        }
    }

    async query(q: string): Promise<QueryResult> {
        await this.connect();
        try {
            const result = await this.pool!.request().query(q);
            return {
                rows: result.recordset,
                fields: [] // MSSQL driver doesn't return fields in the same simple way, but rows are keyed
            };
        } finally {
            await this.disconnect();
        }
    }
}