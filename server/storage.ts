import { db } from "@db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { InsertUser, User } from "@shared/schema";
import session from "express-session";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import MySQLStore from "express-mysql-session";

// Create AuthUser type that includes the password field
const authUserSchema = createSelectSchema(users);
type AuthUser = z.infer<typeof authUserSchema>;

const MySQLSessionStore = MySQLStore(session);

export interface IStorage {
  createUser: (user: InsertUser) => Promise<AuthUser>;
  getUserByEmail: (email: string) => Promise<AuthUser | undefined>;
  getUserByUsername: (username: string) => Promise<AuthUser | undefined>;
  getUser: (id: number) => Promise<User | undefined>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // MySQL session store options
    const sessionStoreOptions = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'motoverse',
      createDatabaseTable: true,
      schema: {
        tableName: 'sessions',
        columnNames: {
          session_id: 'session_id',
          expires: 'expires',
          data: 'data'
        }
      }
    };
    
    this.sessionStore = new MySQLSessionStore(sessionStoreOptions);
  }

  async createUser(userData: InsertUser): Promise<AuthUser> {
    const [user] = await db.insert(users)
      .values(userData)
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        dealerId: users.dealerId,
        profilePicture: users.profilePicture,
        phoneNumber: users.phoneNumber, 
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });
    
    return user as AuthUser;
  }

  async getUserByEmail(email: string): Promise<AuthUser | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      dealerId: users.dealerId,
      profilePicture: users.profilePicture,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.email, email));
    
    return result[0] as AuthUser | undefined;
  }

  async getUserByUsername(username: string): Promise<AuthUser | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      password: users.password,
      role: users.role,
      dealerId: users.dealerId,
      profilePicture: users.profilePicture,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.username, username));
    
    return result[0] as AuthUser | undefined;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      dealerId: users.dealerId,
      profilePicture: users.profilePicture,
      phoneNumber: users.phoneNumber,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id));
    
    return result[0];
  }
}

export const storage = new DatabaseStorage();
