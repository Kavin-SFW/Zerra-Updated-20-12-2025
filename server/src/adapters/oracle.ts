import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
// Note: User must run 'npm install oracledb'
let oracledb: any;
try {
    oracledb = require('oracledb');
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;
} catch (e) {
    console.warn("oracledb module not found. Please run 'npm install oracledb'");
}

export class OracleAdapter implements IDatabaseAdapter {
    private connection: any = null;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        if (!oracledb) throw new Error("Oracle driver (oracledb) is not installed.");
        
        this.connection = await oracledb.getConnection({
            user: this.config.username,
            password: this.config.password,
            connectString: `${this.config.host}:${this.config.port}/${this.config.database || 'XE'}`
        });
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
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
            // Oracle query to get user tables
            const result = await this.connection.execute(
                `SELECT table_name FROM user_tables ORDER BY table_name`
            );
            return result.rows.map((row: any) => ({ 
                name: row.TABLE_NAME, 
                rows: 0 
            }));
        } finally {
            await this.disconnect();
        }
    }

    async query(sql: string): Promise<QueryResult> {
        await this.connect();
        try {
            // Oracle doesn't support LIMIT in older versions, but 12c+ supports OFFSET/FETCH
            // For safety in this demo, we assume the query passed has generic SQL.
            // If it contains "LIMIT", we might need to rewrite it for Oracle 11g (ROWNUM).
            // But let's assume 12c+ syntax or user provides valid Oracle SQL.
            
            // Simple replace for common "LIMIT 1000" pattern if needed, 
            // but ideally we should construct query properly.
            // For now, pass through.
            
            let finalSql = sql;
            if (sql.includes('LIMIT')) {
                 // specific quick fix for the simple "SELECT * FROM table LIMIT x" used in import
                 const parts = sql.split('LIMIT');
                 finalSql = `SELECT * FROM (${parts[0]}) WHERE ROWNUM <= ${parts[1]}`;
            }

            const result = await this.connection.execute(finalSql);
            return {
                rows: result.rows, // object array because OUT_FORMAT_OBJECT
                fields: result.metaData ? result.metaData.map((m: any) => ({ name: m.name })) : []
            };
        } finally {
            await this.disconnect();
        }
    }
}
