import { IDatabaseAdapter, DatabaseConfig, TableSchema, QueryResult } from '../types';

let MongoClient: any;
try {
    MongoClient = require('mongodb').MongoClient;
} catch (e) {
    console.warn("mongodb module not found. Please run 'npm install mongodb'");
}

export class MongoDbAdapter implements IDatabaseAdapter {
    private client: any = null;
    private db: any = null;
    private config: DatabaseConfig;

    constructor(config: DatabaseConfig) {
        this.config = config;
    }

    async connect(): Promise<void> {
        if (!MongoClient) throw new Error("MongoDB driver is not installed.");
        
        const url = `mongodb://${this.config.username && this.config.password ? `${this.config.username}:${this.config.password}@` : ''}${this.config.host}:${this.config.port}`;
        this.client = new MongoClient(url);
        await this.client.connect();
        this.db = this.client.db(this.config.database);
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }

    async testConnection(): Promise<void> {
        await this.connect();
        await this.db.command({ ping: 1 });
        await this.disconnect();
    }

    async getTables(): Promise<TableSchema[]> {
        await this.connect();
        try {
            const collections = await this.db.listCollections().toArray();
            return collections.map((c: any) => ({ name: c.name, rows: 0 }));
        } finally {
            await this.disconnect();
        }
    }

    async query(sql: string): Promise<QueryResult> {
        await this.connect();
        try {
            // Very basic SQL-to-Mongo translation for the specific use case of this app
            // Expected input: "SELECT * FROM collectionName LIMIT 1000"
            
            let collectionName = '';
            let limit = 1000;

            const match = sql.match(/FROM\s+([^\s]+)/i);
            if (match && match[1]) {
                collectionName = match[1].replace(/["`]/g, ''); // remove quotes
            } else {
                throw new Error("Could not parse collection name from SQL query");
            }

            const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
            if (limitMatch && limitMatch[1]) {
                limit = parseInt(limitMatch[1]);
            }

            const docs = await this.db.collection(collectionName).find({}).limit(limit).toArray();

            // Flatten _id to string if needed, or keeping as is since frontend handles JSON
            const rows = docs.map((doc: any) => {
                if (doc._id) doc._id = doc._id.toString();
                return doc;
            });

            // Extract fields from the first document (NoSQL schema inference)
            const fields = rows.length > 0 ? Object.keys(rows[0]).map(k => ({ name: k })) : [];

            return {
                rows,
                fields
            };
        } finally {
            await this.disconnect();
        }
    }
}
