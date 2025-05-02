import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define role enum
export const UserRole = {
  ADMIN: "admin",
  DEALER: "dealer",
  SALES: "sales",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Define users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("email_idx").on(table.email),
    usernameIdx: uniqueIndex("username_idx").on(table.username),
  };
});

// Define validation schemas
export const insertUserSchema = createInsertSchema(users)
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Must provide a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum([UserRole.ADMIN, UserRole.DEALER, UserRole.SALES]),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const loginUserSchema = z.object({
  email: z.string().email("Must provide a valid email"),
  password: z.string().min(1, "Password is required"),
  role: z.enum([UserRole.ADMIN, UserRole.DEALER, UserRole.SALES]),
});

export const selectUserSchema = createSelectSchema(users).omit({ password: true });

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = z.infer<typeof selectUserSchema>;
