import express from 'express';
import cors from 'cors';
import { DatabaseConfig, IDatabaseAdapter } from './types';
import { PostgresAdapter } from './adapters/postgres';
import { MysqlAdapter } from './adapters/mysql';
import { MssqlAdapter } from './adapters/mssql';
import { OracleAdapter } from './adapters/oracle';
import { MongoDbAdapter } from './adapters/mongodb';

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

// Helper to get adapter
function getAdapter(config: DatabaseConfig): IDatabaseAdapter {
    // Force IPv4 for local docker
    if (config.host === 'localhost') config.host = '127.0.0.1';

    switch (config.type) {
        case 'postgres': return new PostgresAdapter(config);
        case 'mysql': return new MysqlAdapter(config);
        case 'mssql': return new MssqlAdapter(config);
        case 'oracle': return new OracleAdapter(config);
        case 'mongodb': return new MongoDbAdapter(config);
        default: throw new Error(`Unsupported database type: ${config.type}`);
    }
}

app.post('/api/connect', async (req, res) => {
    try {
        const config: DatabaseConfig = req.body;
        const adapter = getAdapter(config);
        await adapter.testConnection();
        res.json({ success: true, message: 'Connection successful' });
    } catch (error: any) {
        console.error('Connection failed:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/tables', async (req, res) => {
    try {
        const config: DatabaseConfig = req.body;
        const adapter = getAdapter(config);
        const tables = await adapter.getTables();
        res.json({ success: true, tables });
    } catch (error: any) {
        console.error('Fetch tables failed:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/query', async (req, res) => {
    try {
        const { config, query } = req.body;
        if (!query) throw new Error('Query is required');
        
        const adapter = getAdapter(config);
        const result = await adapter.query(query);
        res.json({ success: true, data: result.rows });
    } catch (error: any) {
        console.error('Query failed:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Zerra Backend running on http://localhost:${port}`);
});
