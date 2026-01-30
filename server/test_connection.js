const fetch = require('node-fetch');

async function testConnection() {
    try {
        console.log('Testing connection to backend at http://localhost:3005/api/connect...');
        const response = await fetch('http://localhost:3005/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'odoo',
                host: 'demo.odoo.com',
                database: 'demo',
                username: 'admin',
                password: 'password'
            })
        });

        console.log(`Status Code: ${response.status}`);
        const text = await response.text();
        console.log(`Response Body: ${text}`);
    } catch (error) {
        console.error('Error connecting to backend:', error.message);
        console.log('Hint: Make sure the backend server is running (npm run dev in zerra-frontend/server)');
    }
}

testConnection();