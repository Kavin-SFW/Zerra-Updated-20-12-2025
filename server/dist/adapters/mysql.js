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
exports.MysqlAdapter = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
class MysqlAdapter {
    constructor(config) {
        this.connection = null;
        this.config = config;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.connection = yield promise_1.default.createConnection({
                host: this.config.host,
                port: this.config.port,
                user: this.config.username,
                password: this.config.password,
                database: this.config.database
            });
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.connection) {
                yield this.connection.end();
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
                // 1. Get Table List
                const [rows] = yield this.connection.execute('SHOW TABLES');
                const tablesList = rows.map(row => Object.values(row)[0]);
                const result = [];
                // 2. Dedicated Counting
                for (const tableName of tablesList) {
                    try {
                        // Use execute for safety, though table names from SHOW TABLES are generally safe
                        // Note: You can't parameterize table names in standard SQL, so we construct the string
                        const [countRows] = yield this.connection.execute(`SELECT COUNT(*) as c FROM \`${tableName}\``);
                        const count = countRows[0].c;
                        result.push({ name: tableName, rows: Number(count) });
                    }
                    catch (e) {
                        result.push({ name: tableName, rows: 0 });
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
                const [rows, fields] = yield this.connection.execute(sql);
                return {
                    rows: rows,
                    fields: fields
                };
            }
            finally {
                yield this.disconnect();
            }
        });
    }
}
exports.MysqlAdapter = MysqlAdapter;
