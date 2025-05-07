import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

// Default MySQL configuration for XAMPP
const CONNECTION_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'motoverse',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
};

// Create MySQL connection pool
export const pool = mysql.createPool(CONNECTION_CONFIG);

// Initialize Drizzle ORM with MySQL connection
export const db = drizzle(pool, { schema, mode: 'default' });