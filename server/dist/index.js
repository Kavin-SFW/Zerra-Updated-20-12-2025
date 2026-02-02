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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const postgres_1 = require("./adapters/postgres");
const mysql_1 = require("./adapters/mysql");
const mssql_1 = require("./adapters/mssql");
const oracle_1 = require("./adapters/oracle");
const mongodb_1 = require("./adapters/mongodb");
const odoo_1 = require("./adapters/odoo");
const app = (0, express_1.default)();
const port = 3005;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
function getAdapter(config) {
    // Force IPv4 for local docker
    if (config.host === 'localhost')
        config.host = '127.0.0.1';
    switch (config.type) {
        case 'postgres': return new postgres_1.PostgresAdapter(config);
        case 'mysql': return new mysql_1.MysqlAdapter(config);
        case 'mssql': return new mssql_1.MssqlAdapter(config);
        case 'oracle': return new oracle_1.OracleAdapter(config);
        case 'mongodb': return new mongodb_1.MongoDbAdapter(config);
        case 'odoo': return new odoo_1.OdooAdapter(config);
        default: throw new Error(`Unsupported database type: ${config.type}`);
    }
}
app.post('/api/connect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/connect', JSON.stringify(req.body, (k, v) => k === 'password' ? '***' : v));
    try {
        const config = req.body;
        if (!config || !config.type)
            throw new Error('Invalid database configuration: missing type');
        const adapter = getAdapter(config);
        yield adapter.testConnection();
        res.json({ success: true, message: 'Connection successful' });
    }
    catch (error) {
        console.error('[API] Connection failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
}));
app.post('/api/tables', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/tables', JSON.stringify(req.body, (k, v) => k === 'password' ? '***' : v));
    try {
        const config = req.body;
        if (!config || !config.type)
            throw new Error('Invalid database configuration: missing type');
        const adapter = getAdapter(config);
        const tables = yield adapter.getTables();
        res.json({ success: true, tables });
    }
    catch (error) {
        console.error('[API] Fetch tables failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
}));
app.post('/api/query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('[API] POST /api/query', {
        config: JSON.stringify(req.body.config, (k, v) => k === 'password' ? '***' : v),
        query: req.body.query
    });
    try {
        const { config, query } = req.body;
        if (!config || !config.type)
            throw new Error('Invalid database configuration: missing type');
        if (!query)
            throw new Error('Query is required');
        const adapter = getAdapter(config);
        const result = yield adapter.query(query);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('[API] Query failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
}));
// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});
app.listen(port, () => {
    console.log(`Zerra Backend running on http://localhost:${port}`);
});
