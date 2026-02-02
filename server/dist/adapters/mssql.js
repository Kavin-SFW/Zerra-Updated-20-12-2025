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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MssqlAdapter = void 0;
const mssql_1 = __importDefault(require("mssql"));
class MssqlAdapter {
    constructor(config) {
        this.pool = null;
        this.config = config;
    }
    getConfig() {
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
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.pool = yield mssql_1.default.connect(this.getConfig());
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pool) {
                yield this.pool.close();
                this.pool = null;
            }
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            yield this.disconnect();
        });
    }
    getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            try {
                // 1. Get List
                const listResult = yield this.pool.request().query(`
                SELECT TABLE_SCHEMA, TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE = 'BASE TABLE'
            `);
                const result = [];
                // 2. Dedicated Counting
                for (const row of listResult.recordset) {
                    const schema = row.TABLE_SCHEMA;
                    const table = row.TABLE_NAME;
                    const fullName = `${schema}.${table}`;
                    const safeName = `[${schema}].[${table}]`;
                    try {
                        const countRes = yield this.pool.request().query(`SELECT COUNT(*) as c FROM ${safeName}`);
                        result.push({
                            name: fullName,
                            rows: countRes.recordset[0].c
                        });
                    }
                    catch (e) {
                        result.push({ name: fullName, rows: 0 });
                    }
                }
                return result;
            }
            finally {
                yield this.disconnect();
            }
        });
    }
    query(q) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            try {
                const result = yield this.pool.request().query(q);
                return {
                    rows: result.recordset,
                    fields: [] // MSSQL driver doesn't return fields in the same simple way, but rows are keyed
                };
            }
            finally {
                yield this.disconnect();
            }
        });
    }
}
exports.MssqlAdapter = MssqlAdapter;
