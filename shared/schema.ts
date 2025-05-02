import { pgTable, text, serial, timestamp, uniqueIndex, integer, decimal, boolean, foreignKey, varchar, pgEnum } from "drizzle-orm/pg-core";
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

// Define order status enum
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'delivered', 'cancelled']);

// Define dealers table
export const dealers = pgTable("dealers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define users table with reference to dealers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<UserRole>(),
  dealerId: integer("dealer_id").references(() => dealers.id),
  profilePicture: text("profile_picture"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("email_idx").on(table.email),
    usernameIdx: uniqueIndex("username_idx").on(table.username),
  };
});

// Define cars table
export const cars = pgTable("cars", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  make: text("make").notNull(),
  year: integer("year").notNull(),
  color: text("color").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  vin: text("vin").notNull(),
  status: carStatusEnum("status").default('in_stock').notNull(),
  features: text("features"),
  imageUrl: text("image_url"),
  dealerId: integer("dealer_id").references(() => dealers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  dateOfBirth: timestamp("date_of_birth"),
  salesPersonId: integer("sales_person_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    customerEmailIdx: uniqueIndex("customer_email_idx").on(table.email),
  };
});

// Define orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  carId: integer("car_id").references(() => cars.id).notNull(),
  salesPersonId: integer("sales_person_id").references(() => users.id).notNull(),
  orderDate: timestamp("order_date").defaultNow().notNull(),
  deliveryDate: timestamp("delivery_date"),
  status: orderStatusEnum("status").default('pending').notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define sales targets table
export const salesTargets = pgTable("sales_targets", {
  id: serial("id").primaryKey(),
  salesPersonId: integer("sales_person_id").references(() => users.id).notNull(),
  targetMonth: integer("target_month").notNull(),
  targetYear: integer("target_year").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  targetUnits: integer("target_units").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueMonthlyTarget: uniqueIndex("unique_monthly_target").on(
      table.salesPersonId,
      table.targetMonth,
      table.targetYear
    ),
  };
});

// Define table relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [users.dealerId],
    references: [dealers.id],
  }),
  customers: many(customers),
  orders: many(orders),
  salesTargets: many(salesTargets),
}));

export const dealersRelations = relations(dealers, ({ many }) => ({
  users: many(users),
  cars: many(cars),
}));

export const carsRelations = relations(cars, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [cars.dealerId],
    references: [dealers.id],
  }),
  orders: many(orders),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  salesPerson: one(users, {
    fields: [customers.salesPersonId],
    references: [users.id],
  }),
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

export const insertDealerSchema = createInsertSchema(dealers)
  .extend({
    name: z.string().min(3, "Dealer name must be at least 3 characters"),
    location: z.string().min(5, "Location must be at least 5 characters"),
    contactEmail: z.string().email("Must provide a valid email"),
    contactPhone: z.string().optional(),
    active: z.boolean().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertCarSchema = createInsertSchema(cars)
  .extend({
    model: z.string().min(2, "Model must be at least 2 characters"),
    make: z.string().min(2, "Make must be at least 2 characters"),
    year: z.number().min(1900, "Year must be at least 1900").max(2100, "Year must be less than 2100"),
    color: z.string().min(2, "Color must be at least 2 characters"),
    price: z.number().positive("Price must be positive"),
    vin: z.string().min(17, "VIN must be at least 17 characters"),
    status: z.enum(['in_stock', 'out_of_stock', 'reserved', 'sold']).optional(),
    features: z.string().optional(),
    imageUrl: z.string().optional(),
    dealerId: z.number(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertCustomerSchema = createInsertSchema(customers)
  .extend({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Must provide a valid email"),
    phone: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional().transform(val => val ? new Date(val) : undefined),
    salesPersonId: z.number().optional(),
    notes: z.string().optional(),
  })
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertOrderSchema = createInsertSchema(orders)
  .extend({
    customerId: z.number(),
    carId: z.number(),
    salesPersonId: z.number(),
    deliveryDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']).optional(),
    totalAmount: z.number().positive("Total amount must be positive"),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
  })
  .omit({
    id: true,
    orderDate: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertSalesTargetSchema = createInsertSchema(salesTargets)
  .extend({
    salesPersonId: z.number(),
    targetMonth: z.number().min(1, "Month must be between 1 and 12").max(12, "Month must be between 1 and 12"),
    targetYear: z.number().min(2000, "Year must be at least 2000").max(2100, "Year must be less than 2100"),
    targetAmount: z.number().positive("Target amount must be positive"),
    targetUnits: z.number().positive("Target units must be positive"),
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

export type InsertDealer = z.infer<typeof insertDealerSchema>;
export const selectDealerSchema = createSelectSchema(dealers);
export type Dealer = z.infer<typeof selectDealerSchema>;

export type InsertCar = z.infer<typeof insertCarSchema>;
export const selectCarSchema = createSelectSchema(cars);
export type Car = z.infer<typeof selectCarSchema>;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export const selectCustomerSchema = createSelectSchema(customers);
export type Customer = z.infer<typeof selectCustomerSchema>;

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export const selectOrderSchema = createSelectSchema(orders);
export type Order = z.infer<typeof selectOrderSchema>;

export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;
export const selectSalesTargetSchema = createSelectSchema(salesTargets);
export type SalesTarget = z.infer<typeof selectSalesTargetSchema>;
