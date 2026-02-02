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
exports.MongoDbAdapter = void 0;
let MongoClient;
try {
    MongoClient = require('mongodb').MongoClient;
}
catch (e) {
    console.warn("mongodb module not found. Please run 'npm install mongodb'");
}
class MongoDbAdapter {
    constructor(config) {
        this.client = null;
        this.db = null;
        this.config = config;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!MongoClient)
                throw new Error("MongoDB driver is not installed.");
            const url = `mongodb://${this.config.username && this.config.password ? `${this.config.username}:${this.config.password}@` : ''}${this.config.host}:${this.config.port}`;
            this.client = new MongoClient(url);
            yield this.client.connect();
            this.db = this.client.db(this.config.database);
        });
    }
    disconnect() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.client) {
                yield this.client.close();
                this.client = null;
                this.db = null;
            }
        });
    }
    testConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            yield this.db.command({ ping: 1 });
            yield this.disconnect();
        });
    }
    getTables() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            try {
                const collections = yield this.db.listCollections().toArray();
                return collections.map((c) => ({ name: c.name, rows: 0 }));
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
                // Very basic SQL-to-Mongo translation for the specific use case of this app
                // Expected input: "SELECT * FROM collectionName LIMIT 1000"
                let collectionName = '';
                let limit = 1000;
                const match = sql.match(/FROM\s+([^\s]+)/i);
                if (match && match[1]) {
                    collectionName = match[1].replace(/["`]/g, ''); // remove quotes
                }
                else {
                    throw new Error("Could not parse collection name from SQL query");
                }
                const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
                if (limitMatch && limitMatch[1]) {
                    limit = parseInt(limitMatch[1]);
                }
                const docs = yield this.db.collection(collectionName).find({}).limit(limit).toArray();
                // Flatten _id to string if needed, or keeping as is since frontend handles JSON
                const rows = docs.map((doc) => {
                    if (doc._id)
                        doc._id = doc._id.toString();
                    return doc;
                });
                // Extract fields from the first document (NoSQL schema inference)
                const fields = rows.length > 0 ? Object.keys(rows[0]).map(k => ({ name: k })) : [];
                return {
                    rows,
                    fields
                };
            }
            finally {
                yield this.disconnect();
            }
        });
    }
}
exports.MongoDbAdapter = MongoDbAdapter;
