import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

export async function query(text, params) {
    const client = await pool.connect();
    try {
        return await client.query(text, params);
    } finally {
        client.release();
    }
}

export async function queryWithTimeout(text, timeoutMs = 5000, params) {
    const client = await pool.connect();
    try {
        await client.query(`SET statement_timeout = ${timeoutMs}`);
        const result = await client.query(text, params);
        await client.query("SET statement_timeout = 0");
        return result;
    } finally {
        client.release();
    }
}

export default pool;
