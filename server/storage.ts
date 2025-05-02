import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { InsertUser, User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db/index";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  createUser: (user: InsertUser) => Promise<User>;
  getUserByEmail: (email: string) => Promise<User | undefined>;
  getUserByUsername: (username: string) => Promise<User | undefined>;
  getUser: (id: number) => Promise<User | undefined>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users)
      .values(userData)
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, email));
    
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.username, username));
    
    return result[0];
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));
    
    return result[0];
  }
}

export const storage = new DatabaseStorage();
