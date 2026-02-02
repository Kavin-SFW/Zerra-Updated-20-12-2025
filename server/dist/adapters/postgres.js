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
exports.PostgresAdapter = void 0;
const pg_1 = require("pg");
class PostgresAdapter {
    constructor(config) {
        this.config = config;
        console.log(`[PostgresAdapter] Initializing with: host=${config.host}, port=${config.port}, database=${config.database}, user=${config.username}, ssl=${!!config.ssl}`);
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
            console.log(`[PostgresAdapter] Attempting connection to ${this.config.host}...`);
            try {
                yield this.client.connect();
                console.log(`[PostgresAdapter] ✅ Connection successful to ${this.config.host}`);
            }
            catch (err) {
                console.error(`[PostgresAdapter] ❌ Connection failed to ${this.config.host}:`, err.message);
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
                // 1. Get List of Tables
                const res = yield this.client.query(`
                SELECT schemaname, tablename
                FROM pg_catalog.pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
            `);
                const tables = res.rows;
                const result = [];
                // 2. Dedicated Counting Functionality
                // We loop through each table to get the EXACT count
                for (const t of tables) {
                    const fullTableName = `"${t.schemaname}"."${t.tablename}"`;
                    const displayName = `${t.schemaname}.${t.tablename}`;
                    try {
                        const countRes = yield this.client.query(`SELECT COUNT(*) as c FROM ${fullTableName}`);
                        result.push({
                            name: displayName,
                            rows: parseInt(countRes.rows[0].c)
                        });
                    }
                    catch (e) {
                        // Fallback or error handling for individual tables
                        console.warn(`Failed to count rows for ${displayName}`, e);
                        result.push({ name: displayName, rows: 0 });
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
exports.PostgresAdapter = PostgresAdapter;
