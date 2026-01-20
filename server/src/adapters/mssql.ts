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
                trustServerCertificate: true // Important for self-signed certs (common in Docker)
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
            const result = await this.pool!.request().query(`
                SELECT TABLE_SCHEMA + '.' + TABLE_NAME as name
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
            `);
            return result.recordset.map(row => ({ name: row.name, rows: 0 }));
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
