# Zerra Backend API

This is the backend service for Zerra Analytics. It handles secure connections to SQL databases (PostgreSQL, MySQL, SQL Server) which cannot be accessed directly from the browser.

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start the Server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:3001`.

## API Endpoints

*   `POST /api/connect`: Test a database connection.
*   `POST /api/tables`: List available tables.
*   `POST /api/query`: Execute a SQL query.

## Supported Databases
*   PostgreSQL
*   MySQL
*   Microsoft SQL Server
