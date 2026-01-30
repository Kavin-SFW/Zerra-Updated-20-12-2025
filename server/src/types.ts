export interface DatabaseConfig {
    type: 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'mongodb' | 'odoo';
    host: string;
    port: number;
    database?: string;
    username: string;
    password?: string;
    ssl?: boolean;
}

export interface TableSchema {
    name: string;
    rows?: number; // Estimated
}

export interface QueryResult {
    rows: any[];
    fields: any[];
}

export interface IDatabaseAdapter {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    testConnection(): Promise<void>;
    getTables(): Promise<TableSchema[]>;
    query(sql: string): Promise<QueryResult>;
}