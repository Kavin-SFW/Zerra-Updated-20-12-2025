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
            // 1. Get Table List
            const [rows] = await this.connection!.execute('SHOW TABLES');
            const tablesList = (rows as any[]).map(row => Object.values(row)[0] as string);
            
            const result: TableSchema[] = [];

            // 2. Dedicated Counting
            for (const tableName of tablesList) {
                try {
                    // Use execute for safety, though table names from SHOW TABLES are generally safe
                    // Note: You can't parameterize table names in standard SQL, so we construct the string
                    const [countRows] = await this.connection!.execute(`SELECT COUNT(*) as c FROM 
${tableName}
`);
                    const count = (countRows as any[])[0].c;
                    result.push({ name: tableName, rows: Number(count) });
                } catch (e) {
                     result.push({ name: tableName, rows: 0 });
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