import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

/**
 * Load .env file from the resources directory
 */
function loadEnvFromResources(): void {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const envPath = join(__dirname, ".env");
    
    try {
        const envFile = readFileSync(envPath, "utf-8");
        for (const line of envFile.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...valueParts] = trimmed.split("=");
                if (key && valueParts.length > 0) {
                    const value = valueParts.join("=").trim();
                    if (!process.env[key]) {
                        process.env[key] = value;
                    }
                }
            }
        }
    } catch (error) {
        // .env file doesn't exist, that's okay - will use process.env or throw later
    }
}

// Load .env from resources directory
loadEnvFromResources();

const dbUrl = process.env.BLNK_DB_URL;

if (!dbUrl) {
    throw new Error(
        "BLNK_DB_URL environment variable is required. " +
        "Please create a .env file in the resources directory with your database connection string. " +
        "See resources/.env.example for the required format."
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
