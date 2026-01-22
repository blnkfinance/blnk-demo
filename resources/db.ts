import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

// Bun automatically loads .env from the project root
const dbUrl = process.env.BLNK_DB_URL;

if (!dbUrl) {
    throw new Error(
        "BLNK_DB_URL environment variable is required. " +
        "Please create a .env file in the project root with your database connection string. " +
        "See .env.example for the required format."
    );
}

// Initialize Postgres connection pool
export const db: Pool = new Pool({
    connectionString: dbUrl,
});

// Helper function to execute queries
export async function query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
): Promise<QueryResult<T>> {
    return db.query<T>(text, params);
}

// Helper function to get a client from the pool (for transactions)
export async function getClient(): Promise<PoolClient> {
    return db.connect();
}
