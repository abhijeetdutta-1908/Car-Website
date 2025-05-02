import { pgTable, text, serial, timestamp, uniqueIndex, integer, decimal, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define role enum
export const UserRole = {
  ADMIN: "admin",
  DEALER: "dealer",
  SALES: "sales",
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Define car status enum
export const carStatusEnum = pgEnum('car_status', ['in_stock', 'out_of_stock', 'reserved', 'sold']);

// Define users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  dealerId: integer("dealer_id"),
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("email_idx").on(table.email),
    usernameIdx: uniqueIndex("username_idx").on(table.username),
  };
});

// Define customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  salesPersonId: integer("sales_person_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    customerEmailIdx: uniqueIndex("customer_email_idx").on(table.email),
  };
});

// Define cars table
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  color: text("color").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  vin: text("vin").notNull(),
  status: text("status").default('in_stock').notNull(),
  features: text("features"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define table relationships
export const customersRelations = relations(customers, ({ one }) => ({
  salesPerson: one(users, {
    fields: [customers.salesPersonId],
    references: [users.id],
  }),
}));

// Define validation schemas
export const insertUserSchema = createInsertSchema(users)
  .extend({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Must provide a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum([UserRole.ADMIN, UserRole.DEALER, UserRole.SALES]),
    dealerId: z.number().optional(),
    profilePicture: z.string().optional(),
    phoneNumber: z.string().optional(),
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

// Customer schema
export const insertCustomerSchema = createInsertSchema(customers)
  .extend({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Must provide a valid email"),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    salesPersonId: z.number(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Car schema
export const insertCarSchema = createInsertSchema(cars)
  .extend({
    make: z.string().min(2, "Make must be at least 2 characters"),
    model: z.string().min(2, "Model must be at least 2 characters"),
    year: z.number().min(1900, "Year must be at least 1900").max(2100, "Year must be less than 2100"),
    color: z.string().min(2, "Color must be at least 2 characters"),
    price: z.number().positive("Price must be positive"),
    vin: z.string().min(17, "VIN must be at least 17 characters").max(17, "VIN cannot exceed 17 characters"),
    status: z.enum(['in_stock', 'out_of_stock', 'reserved', 'sold']).optional(),
    features: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Define export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export const selectCustomerSchema = createSelectSchema(customers);
export type Customer = z.infer<typeof selectCustomerSchema>;

export type InsertCar = z.infer<typeof insertCarSchema>;
export const selectCarSchema = createSelectSchema(cars);
export type Car = z.infer<typeof selectCarSchema>;
