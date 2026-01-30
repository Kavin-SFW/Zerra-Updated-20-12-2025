const { Client } = require('pg');

async function testConnection() {
    const config = {
        connectionString: "postgresql://railway:dlypfIeHIoRxWVDCBllIUnGRfTeDOUCB@shortline.proxy.rlwy.net:54357/railway",
        ssl: {
            rejectUnauthorized: false
        }
    };

    console.log("Testing direct connection to Railway PostgreSQL...");
    console.log(`Host: shortline.proxy.rlwy.net`);
    console.log(`Port: 54357`);

    const client = new Client(config);

    try {
        await client.connect();
        console.log("✅ Successfully connected to Railway DB!");
        
        const res = await client.query('SELECT NOW() as now');
        console.log("Query Result:", res.rows[0]);
        
        await client.end();
        console.log("Connection closed.");
    } catch (err) {
        console.error("❌ Connection Failed:", err);
        console.log("Error Code:", err.code);
        console.log("Error Syscall:", err.syscall);
        console.log("Error Address:", err.address);
    }
}

testConnection();