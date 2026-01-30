import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';
import { Client } from 'pg';

export class OdooAdapter implements IDatabaseAdapter {
    private client: Client;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
        console.log(`[OdooAdapter] Initializing SQL Adapter with: host=${config.host}, port=${config.port}, database=${config.database}, user=${config.username}, ssl=${!!config.ssl}`);
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
        console.log(`[OdooAdapter] Attempting connection to ${this.config.host}...`);
        try {
            await this.client.connect();
            console.log(`[OdooAdapter] ✅ Connection successful to ${this.config.host}`);
        } catch (err: any) {
            console.error(`[OdooAdapter] ❌ Connection failed to ${this.config.host}:`, err.message);
            
            // Helpful error mapping for common Odoo connection issues
            if (err.code === 'ECONNREFUSED') {
                throw new Error(`Connection Refused. Ensure you are connecting to the Postgres Database port (usually 5432), NOT the Odoo Web port (8069).`);
            }
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
            // Get List of Tables - Odoo stores data in public schema usually
            const res = await this.client.query(`
                SELECT schemaname, tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY tablename ASC
            `);
            
            const tables = res.rows;
            const result: TableSchema[] = [];

            // Prioritize common Odoo Business Objects for better UX, but show all
            const priorityTables = ['res_partner', 'sale_order', 'crm_lead', 'account_move', 'product_template'];
            
            // Move priority tables to top
            tables.sort((a, b) => {
                const aPrio = priorityTables.indexOf(a.tablename) !== -1;
                const bPrio = priorityTables.indexOf(b.tablename) !== -1;
                if (aPrio && !bPrio) return -1;
                if (!aPrio && bPrio) return 1;
                return a.tablename.localeCompare(b.tablename);
            });

            // Loop through each table to get the EXACT count (limit to first 200 to avoid timeouts on huge DBs if necessary, but Odoo users want everything)
            // We'll process all but maybe handle errors gracefully
            for (const t of tables) {
                const fullTableName = `"${t.schemaname}"."${t.tablename}"`;
                const displayName = `${t.schemaname}.${t.tablename}`;
                
                try {
                    // Fast estimation for Postgres to avoid slow COUNT(*) on huge tables
                    const countRes = await this.client.query(`
                        SELECT reltuples::bigint AS estimate 
                        FROM pg_class 
                        WHERE relname = $1
                    `, [t.tablename]);
                    
                    let count = 0;
                    if (countRes.rows.length > 0) {
                         count = parseInt(countRes.rows[0].estimate);
                         // If estimate is small or 0, do real count to be sure, otherwise trust estimate for speed
                         if (count < 1000) {
                             const realCount = await this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                             count = parseInt(realCount.rows[0].c);
                         }
                    } else {
                         // Fallback
                         const realCount = await this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                         count = parseInt(realCount.rows[0].c);
                    }

                    result.push({ 
                        name: displayName, 
                        rows: count 
                    });
                } catch (e) {
                    // Ignore empty or inaccessible tables
                    // console.warn(`Skipping ${displayName}`, e);
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
            
            // Odoo Specific: Pass raw rows. 
            // The frontend or analytical engine might handle field formatting if needed.
            // But since we want "GCC behavior", raw is correct.
            
            return {
                rows: res.rows,
                fields: res.fields
            };
        } finally {
            await this.disconnect();
        }
    }
}