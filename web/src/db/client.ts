import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Prevent hot-reload connection leaks in dev
const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
};

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/voltaic';

const client = globalForDb.conn ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== 'production') globalForDb.conn = client;

export const db = drizzle(client, { schema });
