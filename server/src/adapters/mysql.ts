import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
import mysql from 'mysql2/promise';

export class MysqlAdapter implements IDatabaseAdapter {
    private connection: mysql.Connection | null = null;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        this.connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database
        });
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    async testConnection(): Promise<void> {
        await this.connect();
        await this.disconnect();
    }

    async getTables(): Promise<TableSchema[]> {
        await this.connect();
        try {
            const [rows] = await this.connection!.execute('SHOW TABLES');
            // rows is an array of objects like { "Tables_in_dbname": "tablename" }
            // We need to extract the values
            const tables = (rows as any[]).map(row => {
                const key = Object.keys(row)[0];
                return { name: row[key], rows: 0 };
            });
            return tables;
        } finally {
            await this.disconnect();
        }
    }

    async query(sql: string): Promise<QueryResult> {
        await this.connect();
        try {
            const [rows, fields] = await this.connection!.execute(sql);
            return {
                rows: rows as any[],
                fields: fields as any[]
            };
        } finally {
            await this.disconnect();
        }
    }
}
