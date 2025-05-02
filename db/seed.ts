import { db } from "./index";
import { users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    // Check if there are any users in the database
    const existingUsers = await db.select().from(users);
    
    // Only seed if there are no users
    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      // Create admin user
      await db.insert(users).values({
        username: "admin",
        email: "admin@example.com",
        password: await hashPassword("password123"),
        role: "admin",
      });
      
      // Create dealer user
      await db.insert(users).values({
        username: "dealer",
        email: "dealer@example.com",
        password: await hashPassword("password123"),
        role: "dealer",
      });
      
      // Create sales user
      await db.insert(users).values({
        username: "sales",
        email: "sales@example.com",
        password: await hashPassword("password123"),
        role: "sales",
      });
      
      console.log("Seeding completed successfully");
    } else {
      console.log("Database already has users, skipping seed");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
