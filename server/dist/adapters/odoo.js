"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdooAdapter = void 0;
const pg_1 = require("pg");
class OdooAdapter {
    constructor(config) {
        this.config = config;
        console.log(`[OdooAdapter] Initializing SQL Adapter with: host=${config.host}, port=${config.port}, database=${config.database}, user=${config.username}, ssl=${!!config.ssl}`);
        this.client = new pg_1.Client({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database || 'postgres',
            ssl: config.ssl ? { rejectUnauthorized: false } : false
        });
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[OdooAdapter] Attempting connection to ${this.config.host}...`);
            try {
                yield this.client.connect();
                console.log(`[OdooAdapter] ✅ Connection successful to ${this.config.host}`);
            }
            catch (err) {
                console.error(`[OdooAdapter] ❌ Connection failed to ${this.config.host}:`, err.message);
                // Helpful error mapping for common Odoo connection issues
                if (err.code === 'ECONNREFUSED') {
                    throw new Error(`Connection Refused. Ensure you are connecting to the Postgres Database port (usually 5432), NOT the Odoo Web port (8069).`);
                }
                throw err;
            }
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.end();
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            yield this.client.query('SELECT 1');
            yield this.disconnect();
        });
    }
    getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            try {
                // Get List of Tables - Odoo stores data in public schema usually
                const res = yield this.client.query(`
                SELECT schemaname, tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY tablename ASC
            `);
                const tables = res.rows;
                const result = [];
                // Prioritize common Odoo Business Objects for better UX, but show all
                const priorityTables = ['res_partner', 'sale_order', 'crm_lead', 'account_move', 'product_template'];
                // Move priority tables to top
                tables.sort((a, b) => {
                    const aPrio = priorityTables.indexOf(a.tablename) !== -1;
                    const bPrio = priorityTables.indexOf(b.tablename) !== -1;
                    if (aPrio && !bPrio)
                        return -1;
                    if (!aPrio && bPrio)
                        return 1;
                    return a.tablename.localeCompare(b.tablename);
                });
                // Loop through each table to get the EXACT count (limit to first 200 to avoid timeouts on huge DBs if necessary, but Odoo users want everything)
                // We'll process all but maybe handle errors gracefully
                for (const t of tables) {
                    const fullTableName = `"${t.schemaname}"."${t.tablename}"`;
                    const displayName = `${t.schemaname}.${t.tablename}`;
                    try {
                        // Fast estimation for Postgres to avoid slow COUNT(*) on huge tables
                        const countRes = yield this.client.query(`
                        SELECT reltuples::bigint AS estimate 
                        FROM pg_class 
                        WHERE relname = $1
                    `, [t.tablename]);
                        let count = 0;
                        if (countRes.rows.length > 0) {
                            count = parseInt(countRes.rows[0].estimate);
                            // If estimate is small or 0, do real count to be sure, otherwise trust estimate for speed
                            if (count < 1000) {
                                const realCount = yield this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                                count = parseInt(realCount.rows[0].c);
                            }
                        }
                        else {
                            // Fallback
                            const realCount = yield this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                            count = parseInt(realCount.rows[0].c);
                        }
                        result.push({
                            name: displayName,
                            rows: count
                        });
                    }
                    catch (e) {
                        // Ignore empty or inaccessible tables
                        // console.warn(`Skipping ${displayName}`, e);
                    }
                }
                return result;
            }
            finally {
                yield this.disconnect();
            }
        });
    }
    query(sql) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            try {
                const res = yield this.client.query(sql);
                // Odoo Specific: Pass raw rows. 
                // The frontend or analytical engine might handle field formatting if needed.
                // But since we want "GCC behavior", raw is correct.
                return {
                    rows: res.rows,
                    fields: res.fields
                };
            }
            finally {
                yield this.disconnect();
            }
        });
    }
}
exports.OdooAdapter = OdooAdapter;
