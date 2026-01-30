import express from 'express';
import cors from 'cors';
import { DatabaseConfig, IDatabaseAdapter } from './types';
import { PostgresAdapter } from './adapters/postgres';
import { MysqlAdapter } from './adapters/mysql';
import { MssqlAdapter } from './adapters/mssql';
import { OracleAdapter } from './adapters/oracle';
import { MongoDbAdapter } from './adapters/mongodb';
import { OdooAdapter } from './adapters/odoo';

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Root Route for Browser Check
app.get('/', (req, res) => {
    res.send('Zerra Backend is Running! You can close this tab.');
});

function getAdapter(config: DatabaseConfig): IDatabaseAdapter {
    // Force IPv4 for local docker
    if (config.host === 'localhost') config.host = '127.0.0.1';

    switch (config.type) {
        case 'postgres': return new PostgresAdapter(config);
        case 'mysql': return new MysqlAdapter(config);
        case 'mssql': return new MssqlAdapter(config);
        case 'oracle': return new OracleAdapter(config);
        case 'mongodb': return new MongoDbAdapter(config);
        case 'odoo': return new OdooAdapter(config);
        default: throw new Error(`Unsupported database type: ${config.type}`);
    }
}

app.post('/api/connect', async (req, res) => {
    console.log('[API] POST /api/connect', JSON.stringify(req.body, (k, v) => k === 'password' ? '***' : v));
    try {
        const config: DatabaseConfig = req.body;
        if (!config || !config.type) throw new Error('Invalid database configuration: missing type');
        
        const adapter = getAdapter(config);
        await adapter.testConnection();
        res.json({ success: true, message: 'Connection successful' });
    } catch (error: any) {
        console.error('[API] Connection failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/tables', async (req, res) => {
    console.log('[API] POST /api/tables', JSON.stringify(req.body, (k, v) => k === 'password' ? '***' : v));
    try {
        const config: DatabaseConfig = req.body;
        if (!config || !config.type) throw new Error('Invalid database configuration: missing type');
        
        const adapter = getAdapter(config);
        const tables = await adapter.getTables();
        res.json({ success: true, tables });
    } catch (error: any) {
        console.error('[API] Fetch tables failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/query', async (req, res) => {
    console.log('[API] POST /api/query', { 
        config: JSON.stringify(req.body.config, (k, v) => k === 'password' ? '***' : v),
        query: req.body.query 
    });
    try {
        const { config, query } = req.body;
        if (!config || !config.type) throw new Error('Invalid database configuration: missing type');
        if (!query) throw new Error('Query is required');
        
        const adapter = getAdapter(config);
        const result = await adapter.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('[API] Query failed:', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
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