import { mysqlTable, varchar, int, timestamp, unique, decimal, date, mysqlEnum } from "drizzle-orm/mysql-core";
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

// Define car status values (MySQL doesn't support direct enums like PostgreSQL)
export const carStatusValues = ['in_stock', 'out_of_stock', 'reserved', 'sold'] as const;
export type CarStatus = typeof carStatusValues[number];

// Define order status values
export const orderStatusValues = ['pending', 'confirmed', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof orderStatusValues[number];

// Define users table
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  dealerId: int("dealer_id"),
  profilePicture: varchar("profile_picture", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: unique("email_idx").on(table.email),
    usernameIdx: unique("username_idx").on(table.username),
  };
});

// Define customers table
export const customers = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: varchar("address", { length: 255 }),
  notes: varchar("notes", { length: 1000 }),
  salesPersonId: int("sales_person_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    customerEmailIdx: unique("customer_email_idx").on(table.email),
  };
});

// Define cars table
export const cars = mysqlTable("cars", {
  id: int("id").primaryKey().autoincrement(),
  make: varchar("make", { length: 255 }).notNull(),
  model: varchar("model", { length: 255 }).notNull(),
  year: int("year").notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  vin: varchar("vin", { length: 50 }).notNull(),
  status: mysqlEnum("status", carStatusValues).default('in_stock').notNull(),
  features: varchar("features", { length: 1000 }),
  imageUrl: varchar("image_url", { length: 255 }),
  restockDate: date("restock_date"),
  quantity: int("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define orders table
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull().references(() => customers.id),
  carId: int("car_id").notNull().references(() => cars.id),
  salesPersonId: int("sales_person_id").notNull().references(() => users.id),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  status: mysqlEnum("status", orderStatusValues).default('pending').notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define sales targets table
export const salesTargets = mysqlTable("sales_targets", {
  id: int("id").primaryKey().autoincrement(),
  salesPersonId: int("sales_person_id").notNull().references(() => users.id),
  targetMonth: date("target_month").notNull(),
  revenueTarget: decimal("revenue_target", { precision: 10, scale: 2 }).notNull(),
  unitsTarget: int("units_target").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define table relationships
export const customersRelations = relations(customers, ({ one, many }) => ({
  salesPerson: one(users, {
    fields: [customers.salesPersonId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const carsRelations = relations(cars, ({ many }) => ({
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  car: one(cars, {
    fields: [orders.carId],
    references: [cars.id],
  }),
  salesPerson: one(users, {
    fields: [orders.salesPersonId],
    references: [users.id],
  }),
}));

export const salesTargetsRelations = relations(salesTargets, ({ one }) => ({
  salesPerson: one(users, {
    fields: [salesTargets.salesPersonId],
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
    restockDate: z.union([
      z.string().transform((val) => val ? new Date(val) : undefined),
      z.date(),
      z.undefined()
    ]).optional(),
    quantity: z.number().int().min(0, "Quantity must be a positive integer").default(1),
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

// Order schema
export const insertOrderSchema = createInsertSchema(orders)
  .extend({
    customerId: z.number().positive("Customer ID is required"),
    carId: z.number().positive("Car ID is required"),
    salesPersonId: z.number().positive("Sales person ID is required"),
    status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']).optional(),
    totalAmount: z.number().positive("Total amount must be positive"),
    notes: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    orderDate: true,
  });

export const selectOrderSchema = createSelectSchema(orders);
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Sales target schema
export const insertSalesTargetSchema = createInsertSchema(salesTargets)
  .extend({
    salesPersonId: z.number().positive("Sales person ID is required"),
    targetMonth: z.date(),
    revenueTarget: z.number().positive("Revenue target must be positive"),
    unitsTarget: z.number().positive("Units target must be positive"),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const selectSalesTargetSchema = createSelectSchema(salesTargets);
export type SalesTarget = z.infer<typeof selectSalesTargetSchema>;
export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
