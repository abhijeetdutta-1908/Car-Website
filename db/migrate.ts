import { db } from "./index";
import { sql } from "drizzle-orm";

async function runMigrations() {
  console.log("Running migrations...");
  
  try {
    // Create customers table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        sales_person_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT customer_email_idx UNIQUE(email)
      )
    `);
    
    // Create cars table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER NOT NULL,
        color TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        vin TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_stock',
        features TEXT,
        image_url TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();