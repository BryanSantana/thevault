import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const {Pool} = pg;

console.log('Creating pool with:', process.env.DATABASE_URL);

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function assertDbConnection() {
  try {
    await db.query('SELECT 1');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}