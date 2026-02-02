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
exports.OracleAdapter = void 0;
// Note: User must run 'npm install oracledb'
let oracledb;
try {
    oracledb = require('oracledb');
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;
}
catch (e) {
    console.warn("oracledb module not found. Please run 'npm install oracledb'");
}
class OracleAdapter {
    constructor(config) {
        this.connection = null;
        this.config = config;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!oracledb)
                throw new Error("Oracle driver (oracledb) is not installed.");
            this.connection = yield oracledb.getConnection({
                user: this.config.username,
                password: this.config.password,
                connectString: `${this.config.host}:${this.config.port}/${this.config.database || 'XE'}`
            });
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connection) {
                yield this.connection.close();
                this.connection = null;
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
                // Oracle query to get user tables
                const result = yield this.connection.execute(`SELECT table_name FROM user_tables ORDER BY table_name`);
                return result.rows.map((row) => ({
                    name: row.TABLE_NAME,
                    rows: 0
                }));
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
                const result = yield this.connection.execute(finalSql);
                return {
                    rows: result.rows, // object array because OUT_FORMAT_OBJECT
                    fields: result.metaData ? result.metaData.map((m) => ({ name: m.name })) : []
                };
            }
            finally {
                yield this.disconnect();
            }
        });
    }
}
exports.OracleAdapter = OracleAdapter;
