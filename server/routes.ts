import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";
import { 
  customers, 
  cars, 
  orders, 
  salesTargets, 
  users,
  insertCustomerSchema, 
  insertCarSchema, 
  insertOrderSchema,
  insertSalesTargetSchema,
  insertUserSchema
} from "../shared/schema";
import { eq, desc, like, and, or, sql, gte, lte, inArray } from "drizzle-orm";

// Middleware to check authentication
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// Middleware to check role
const hasRole = (role: string) => (req: Request, res: Response, next: Function) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes
  setupAuth(app);
  
  // Define API endpoints here
  app.get("/api/admin/dashboard", isAuthenticated, hasRole("admin"), (req, res) => {
    res.json({
      stats: {
        totalUsers: 245,
        activeSessions: 32,
        systemAlerts: 3
      },
      message: "Welcome to the Admin Dashboard"
    });
  });
  
  app.get("/api/dealer/dashboard", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const dealerId = req.user.id;
      
      // Get inventory count
      const carsResult = await db.select({ count: sql<number>`count(*)` })
        .from(cars);
      const inventory = carsResult[0].count || 0;
      
      // Get pending orders count
      const ordersResult = await db.select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.status, 'pending'));
      const pendingOrders = ordersResult[0].count || 0;
      
      // Get monthly revenue from sales staff
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      // Get all sales staff for this dealer
      const salesStaff = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.role, "sales"),
          eq(users.dealerId, dealerId)
        ));
      
      const salesStaffIds = salesStaff.map(staff => staff.id);
      
      let monthlyRevenue = 0;
      if (salesStaffIds.length > 0) {
        const revenueResult = await db.select({
          totalRevenue: sql<string>`sum(${orders.totalAmount})`
        })
        .from(orders)
        .where(and(
          inArray(orders.salesPersonId, salesStaffIds),
          gte(orders.orderDate, firstDayOfMonth),
          lte(orders.orderDate, lastDayOfMonth)
        ));
        
        monthlyRevenue = parseFloat(revenueResult[0].totalRevenue || '0');
      }
      
      // Count sales staff
      const salesStaffCount = salesStaff.length;
      
      res.json({
        stats: {
          inventory,
          pendingOrders,
          monthlyRevenue: `$${monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          salesStaffCount,
          maxSalesStaff: 5
        },
        message: `Welcome back, ${req.user.username}! Here's your dealer dashboard.`
      });
    } catch (error) {
      console.error("Error fetching dealer dashboard data:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  app.get("/api/sales/dashboard", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      // Ensure user is authenticated and has a valid ID
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const salesPersonId = req.user.id;

      // Get current date info for monthly calculations
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Get current day start and end for daily calculations - fix date handling
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      // Create orders table if it doesn't exist
      await db.execute(
        `CREATE TABLE IF NOT EXISTS "orders" (
          "id" serial PRIMARY KEY NOT NULL,
          "customer_id" integer NOT NULL REFERENCES "customers"("id"),
          "car_id" integer NOT NULL REFERENCES "cars"("id"),
          "sales_person_id" integer NOT NULL REFERENCES "users"("id"),
          "order_date" timestamp DEFAULT now() NOT NULL,
          "status" text DEFAULT 'pending' NOT NULL,
          "total_amount" numeric(10, 2) NOT NULL,
          "notes" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )`
      );

      // Calculate daily sales (total sales for today)
      const dailySalesResult = await db.execute(sql`
        SELECT COUNT(*) FROM orders 
        WHERE sales_person_id = ${salesPersonId} 
        AND order_date >= ${startOfToday} 
        AND order_date <= ${endOfToday}
      `);
      const dailySales = parseInt(dailySalesResult.rows[0]?.count || '0', 10);

      // Calculate monthly sales for target progress
      const monthlyCarsSoldResult = await db.execute(sql`
        SELECT COUNT(*) FROM orders 
        WHERE sales_person_id = ${salesPersonId} 
        AND order_date >= ${firstDayOfMonth} 
        AND order_date <= ${lastDayOfMonth}
      `);
      const monthlyCarsSold = parseInt(monthlyCarsSoldResult.rows[0]?.count || '0', 10);

      // Get total revenue for the month
      const monthlyRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM orders 
        WHERE sales_person_id = ${salesPersonId} 
        AND order_date >= ${firstDayOfMonth} 
        AND order_date <= ${lastDayOfMonth}
      `);
      const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0]?.total || '0');

      // Count new leads (customers created this month)
      const leadsResult = await db.execute(sql`
        SELECT COUNT(*) FROM customers 
        WHERE sales_person_id = ${salesPersonId} 
        AND created_at >= ${firstDayOfMonth} 
        AND created_at <= ${lastDayOfMonth}
      `);
      const leadsGenerated = parseInt(leadsResult.rows[0]?.count || '0', 10);

      // Calculate conversion rate (orders / leads)
      let conversionRate = "0%";
      if (leadsGenerated > 0) {
        const rate = (monthlyCarsSold / leadsGenerated) * 100;
        conversionRate = `${Math.round(rate)}%`;
      }

      // Create sales_targets table if it doesn't exist
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "sales_targets" (
            "id" serial PRIMARY KEY NOT NULL,
            "sales_person_id" integer NOT NULL REFERENCES "users"("id"),
            "target_month" date NOT NULL,
            "revenue_target" numeric(10, 2) NOT NULL,
            "units_target" integer NOT NULL,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
          )
        `);
      } catch (err) {
        console.log("Sales targets table may already exist:", err);
        // Continue execution
      }

      // Get or create sales target for the month
      const targetMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const targetResult = await db.execute(sql`
        SELECT * FROM sales_targets 
        WHERE sales_person_id = ${salesPersonId} 
        AND target_month = ${targetMonth}
      `);
      
      let revenueTarget = 100000;
      let unitsTarget = 10;
      
      if (targetResult.rows.length === 0) {
        // Create default sales target if none exists
        await db.execute(sql`
          INSERT INTO sales_targets 
          (sales_person_id, target_month, revenue_target, units_target) 
          VALUES (${salesPersonId}, ${targetMonth}, ${revenueTarget}, ${unitsTarget})
        `);
      } else {
        // Use existing target
        revenueTarget = parseFloat(targetResult.rows[0].revenue_target);
        unitsTarget = parseInt(targetResult.rows[0].units_target, 10);
      }

      res.json({
        stats: {
          dailySales,
          leadsGenerated,
          conversionRate,
          monthlyCarsSold,
          monthlyRevenue,
          revenueTarget,
          unitsTarget
        },
        message: `Welcome back, ${req.user?.username}! Here's your sales dashboard.`
      });
    } catch (error) {
      console.error("Error fetching sales dashboard data:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });
  
  // Get sales performance data (for the detailed performance tab)
  app.get("/api/sales/performance", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const salesId = req.user!.id;
      
      // Get current date info for monthly calculations
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Get total sales count and revenue
      const totalSalesResult = await db.execute(sql`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE sales_person_id = ${salesId}
      `);
      
      const totalSales = parseInt(totalSalesResult.rows[0]?.count || '0', 10);
      const totalRevenue = parseFloat(totalSalesResult.rows[0]?.revenue || '0');
      
      // Get monthly sales count and revenue
      const monthlySalesResult = await db.execute(sql`
        SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as revenue
        FROM orders 
        WHERE sales_person_id = ${salesId}
        AND order_date >= ${firstDayOfMonth} 
        AND order_date <= ${lastDayOfMonth}
      `);
      
      const monthlySales = parseInt(monthlySalesResult.rows[0]?.count || '0', 10);
      const monthlyRevenue = parseFloat(monthlySalesResult.rows[0]?.revenue || '0');
      
      // Get current month target
      const targetMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const targetResult = await db.execute(sql`
        SELECT * FROM sales_targets 
        WHERE sales_person_id = ${salesId} 
        AND target_month = ${targetMonth}
      `);
      
      let target = null;
      if (targetResult.rows.length > 0) {
        target = {
          id: targetResult.rows[0].id,
          revenueTarget: parseFloat(targetResult.rows[0].revenue_target),
          unitsTarget: parseInt(targetResult.rows[0].units_target, 10)
        };
      }
      
      // Get recent sales with more details
      const recentSalesResult = await db.execute(sql`
        SELECT o.id, o.order_date, o.total_amount as amount,
               CONCAT(c.first_name, ' ', c.last_name) as customer_name,
               CONCAT(ca.make, ' ', ca.model, ' (', ca.year, ')') as car_details
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN cars ca ON o.car_id = ca.id
        WHERE o.sales_person_id = ${salesId}
        ORDER BY o.order_date DESC
        LIMIT 5
      `);
      
      // Response with performance data
      res.json({
        totalSales,
        totalRevenue,
        monthlySales,
        monthlyRevenue,
        target,
        recentSales: recentSalesResult.rows
      });
    } catch (error) {
      console.error("Error fetching sales performance data:", error);
      res.status(500).json({ message: "Error fetching performance data" });
    }
  });

  // === CUSTOMER API ENDPOINTS ===
  
  // Get all customers for the logged-in sales person
  app.get("/api/customers", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;
      
      let query = db.select().from(customers)
        .where(eq(customers.salesPersonId, req.user!.id));
      
      // Add search filter if provided
      if (searchTerm && searchTerm.length > 0) {
        query = query.where(
          or(
            like(customers.firstName, `%${searchTerm}%`),
            like(customers.lastName, `%${searchTerm}%`),
            like(customers.email, `%${searchTerm}%`)
          )
        );
      }
      
      const customerList = await query.orderBy(desc(customers.createdAt));
      
      res.json(customerList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Error fetching customers" });
    }
  });
  
  // Get a specific customer
  app.get("/api/customers/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      
      const customer = await db.select().from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.salesPersonId, req.user!.id)
          )
        )
        .limit(1);
      
      if (customer.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer[0]);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Error fetching customer" });
    }
  });
  
  // Create a new customer
  app.post("/api/customers", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      // Validate request body
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        salesPersonId: req.user!.id
      });
      
      // Insert the customer
      const [newCustomer] = await db.insert(customers).values(customerData).returning();
      
      res.status(201).json(newCustomer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(400).json({ 
        message: "Error creating customer", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Update a customer
  app.put("/api/customers/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      
      // Verify the customer belongs to this sales person
      const existingCustomer = await db.select().from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.salesPersonId, req.user!.id)
          )
        )
        .limit(1);
      
      if (existingCustomer.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Update the customer
      const [updatedCustomer] = await db.update(customers)
        .set({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          email: req.body.email,
          phone: req.body.phone,
          address: req.body.address,
          notes: req.body.notes,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(400).json({ 
        message: "Error updating customer", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Delete a customer
  app.delete("/api/customers/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      
      // Verify the customer belongs to this sales person
      const existingCustomer = await db.select().from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.salesPersonId, req.user!.id)
          )
        )
        .limit(1);
      
      if (existingCustomer.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Delete the customer
      await db.delete(customers).where(eq(customers.id, customerId));
      
      res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Error deleting customer" });
    }
  });
  
  // === ORDERS API ENDPOINTS ===
  
  // Get all orders for the logged-in sales person
  app.get("/api/orders", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      // Create orders table if it doesn't exist
      await db.execute(
        `CREATE TABLE IF NOT EXISTS "orders" (
          "id" serial PRIMARY KEY NOT NULL,
          "customer_id" integer NOT NULL REFERENCES "customers"("id"),
          "car_id" integer NOT NULL REFERENCES "cars"("id"),
          "sales_person_id" integer NOT NULL REFERENCES "users"("id"),
          "order_date" timestamp DEFAULT now() NOT NULL,
          "status" text DEFAULT 'pending' NOT NULL,
          "total_amount" numeric(10, 2) NOT NULL,
          "notes" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )`
      );
      
      const ordersList = await db.execute(sql`
        SELECT o.*, 
          c.first_name as customer_first_name, 
          c.last_name as customer_last_name,
          cars.make, cars.model, cars.year
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         JOIN cars ON o.car_id = cars.id
         WHERE o.sales_person_id = ${req.user!.id}
         ORDER BY o.created_at DESC
      `);
      
      res.json(ordersList.rows);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });
  
  // Get specific order
  app.get("/api/orders/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      const orderResult = await db.execute(sql`
        SELECT o.*, 
          c.first_name as customer_first_name, 
          c.last_name as customer_last_name,
          cars.make, cars.model, cars.year, cars.color, cars.vin
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         JOIN cars ON o.car_id = cars.id
         WHERE o.id = ${orderId} AND o.sales_person_id = ${req.user!.id}
      `);
      
      if (orderResult.rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      res.json(orderResult.rows[0]);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Error fetching order" });
    }
  });
  
  // Create a new order
  app.post("/api/orders", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      // Validate with Zod schema
      const orderData = insertOrderSchema.parse(req.body);
      
      // Validate customer exists and belongs to this sales person
      const customer = await db.select()
        .from(customers)
        .where(and(
          eq(customers.id, orderData.customerId),
          eq(customers.salesPersonId, req.user!.id)
        ))
        .limit(1);
      
      if (customer.length === 0) {
        return res.status(404).json({ message: "Customer not found or doesn't belong to you" });
      }
      
      // Validate car exists and is in stock
      const car = await db.select()
        .from(cars)
        .where(and(
          eq(cars.id, orderData.carId),
          eq(cars.status, "in_stock")
        ))
        .limit(1);
      
      if (car.length === 0) {
        return res.status(400).json({ message: "Car not available for purchase" });
      }
      
      // Create the order using Drizzle ORM
      const [newOrder] = await db.insert(orders)
        .values({
          customerId: orderData.customerId,
          carId: orderData.carId,
          salesPersonId: req.user!.id,
          totalAmount: orderData.totalAmount.toString(),
          notes: orderData.notes,
          status: 'pending',
          orderDate: new Date()
        })
        .returning();
      
      // Update car status to reserved
      await db.update(cars)
        .set({
          status: 'reserved',
          updatedAt: new Date()
        })
        .where(eq(cars.id, orderData.carId));
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ 
        message: "Error creating order", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Update order status
  app.patch("/api/orders/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      // Verify order exists and belongs to this sales person
      const existingOrders = await db.select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.salesPersonId, req.user!.id)
        ))
        .limit(1);
      
      if (existingOrders.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const existingOrder = existingOrders[0];
      
      // Prepare update data
      const updateData: any = {
        updatedAt: new Date()
      };
      
      if (status) {
        updateData.status = status;
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      // Update the order
      const [updatedOrder] = await db.update(orders)
        .set(updateData)
        .where(and(
          eq(orders.id, orderId),
          eq(orders.salesPersonId, req.user!.id)
        ))
        .returning();
      
      // If order is confirmed, update car status to sold
      if (status === 'confirmed' && existingOrder.status !== 'confirmed') {
        await db.update(cars)
          .set({
            status: 'sold',
            updatedAt: new Date()
          })
          .where(eq(cars.id, existingOrder.carId));
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(400).json({ 
        message: "Error updating order", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // === DEALER API ENDPOINTS ===
  
  // Get all sales staff for a dealer
  app.get("/api/dealer/sales-staff", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      const dealerId = req.user!.id;
      
      const salesStaff = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        profilePicture: users.profilePicture,
        phoneNumber: users.phoneNumber,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(
        eq(users.role, "sales"),
        eq(users.dealerId, dealerId)
      ))
      .orderBy(desc(users.createdAt));
      
      res.json(salesStaff);
    } catch (error) {
      console.error("Error fetching sales staff:", error);
      res.status(500).json({ message: "Error fetching sales staff" });
    }
  });
  
  // Add a sales person to a dealer
  app.post("/api/dealer/sales-staff", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      const dealerId = req.user!.id;
      
      // Check if dealer already has 5 sales persons
      const existingSalesStaff = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          eq(users.role, "sales"),
          eq(users.dealerId, dealerId)
        ));
      
      if (existingSalesStaff[0].count >= 5) {
        return res.status(400).json({ 
          message: "Cannot add more sales staff. Maximum of 5 sales persons per dealer allowed." 
        });
      }
      
      // Validate the request body
      const userData = insertUserSchema.parse({
        ...req.body,
        role: "sales",
        dealerId: dealerId
      });
      
      // Hash the password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(userData.password);
      
      // Create the user with hashed password
      const [newUser] = await db.insert(users).values({
        ...userData,
        password: hashedPassword
      }).returning({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error adding sales person:", error);
      res.status(400).json({ 
        message: "Error adding sales person", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Remove a sales person
  app.delete("/api/dealer/sales-staff/:id", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      const salesPersonId = parseInt(req.params.id);
      const dealerId = req.user!.id;
      
      // Check if the sales person exists and belongs to this dealer
      const salesPerson = await db.select()
        .from(users)
        .where(and(
          eq(users.id, salesPersonId),
          eq(users.role, "sales"),
          eq(users.dealerId, dealerId)
        ))
        .limit(1);
      
      if (salesPerson.length === 0) {
        return res.status(404).json({ message: "Sales person not found" });
      }
      
      // Delete the sales person
      await db.delete(users)
        .where(eq(users.id, salesPersonId));
      
      res.status(200).json({ message: "Sales person removed successfully" });
    } catch (error) {
      console.error("Error removing sales person:", error);
      res.status(500).json({ message: "Error removing sales person" });
    }
  });
  
  // Get sales performance data
  app.get("/api/dealer/performance", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      const dealerId = req.user!.id;
      
      // Get all sales staff for this dealer
      const salesStaff = await db.select({
        id: users.id,
        username: users.username
      })
      .from(users)
      .where(and(
        eq(users.role, "sales"),
        eq(users.dealerId, dealerId)
      ));
      
      const staffIds = salesStaff.map(s => s.id);
      
      // Get sales data for each staff member
      const salesData = await Promise.all(staffIds.map(async (id) => {
        // Get total sales
        const totalSales = await db.select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(${orders.totalAmount})`,
        })
        .from(orders)
        .where(eq(orders.salesPersonId, id));
        
        // Get current month targets
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const targets = await db.select()
          .from(salesTargets)
          .where(and(
            eq(salesTargets.salesPersonId, id),
            gte(salesTargets.targetMonth, firstDayOfMonth),
            lte(salesTargets.targetMonth, lastDayOfMonth)
          ));
        
        // Get current month sales
        const monthlySales = await db.select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`sum(${orders.totalAmount})`,
        })
        .from(orders)
        .where(and(
          eq(orders.salesPersonId, id),
          gte(orders.orderDate, firstDayOfMonth),
          lte(orders.orderDate, lastDayOfMonth)
        ));
        
        // Find the staff member
        const staff = salesStaff.find(s => s.id === id);
        
        return {
          id,
          name: staff?.username || 'Unknown',
          totalSales: totalSales[0].count || 0,
          totalRevenue: Number(totalSales[0].revenue) || 0,
          monthlySales: monthlySales[0].count || 0,
          monthlyRevenue: Number(monthlySales[0].revenue) || 0,
          target: targets.length > 0 ? {
            revenueTarget: Number(targets[0].revenueTarget),
            unitsTarget: targets[0].unitsTarget,
            id: targets[0].id
          } : null
        };
      }));
      
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching dealer performance:", error);
      res.status(500).json({ message: "Error fetching dealer performance" });
    }
  });
  
  // Set sales target for a sales person
  app.post("/api/dealer/sales-targets", isAuthenticated, hasRole("dealer"), async (req, res) => {
    try {
      const dealerId = req.user!.id;
      
      // Parse the target data with custom transformation
      let targetData = req.body;
      
      // Make sure targetMonth is properly formatted as a date
      if (targetData.targetMonth && !(targetData.targetMonth instanceof Date)) {
        try {
          // If targetMonth is a string in ISO format (from client)
          targetData.targetMonth = new Date(targetData.targetMonth);
        } catch (e) {
          return res.status(400).json({ 
            message: "Invalid date format for target month",
            error: "Please provide a valid date" 
          });
        }
      }
      
      // Validate the data using our schema
      targetData = insertSalesTargetSchema.parse(targetData);
      
      // Check if salesperson belongs to this dealer
      const salesPerson = await db.select()
        .from(users)
        .where(and(
          eq(users.id, targetData.salesPersonId),
          eq(users.role, "sales"),
          eq(users.dealerId, dealerId)
        ))
        .limit(1);
      
      if (salesPerson.length === 0) {
        return res.status(403).json({ message: "The sales person doesn't belong to your dealership" });
      }
      
      // Format date correctly for PostgreSQL
      const formattedDate = targetData.targetMonth.toISOString().split('T')[0];
      
      // Insert sales target
      const [newTarget] = await db.insert(salesTargets).values({
        salesPersonId: targetData.salesPersonId,
        targetMonth: formattedDate,
        revenueTarget: targetData.revenueTarget,
        unitsTarget: targetData.unitsTarget
      }).returning();
      
      res.status(201).json(newTarget);
    } catch (error) {
      console.error("Error creating sales target:", error);
      res.status(400).json({ 
        message: "Error creating sales target", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // === CAR INVENTORY API ENDPOINTS ===
  
  // Get all cars
  app.get("/api/cars", isAuthenticated, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const make = req.query.make as string | undefined;
      
      let query = db.select().from(cars);
      
      // Filter by status if provided
      if (status && status !== 'all') {
        query = query.where(eq(cars.status, status));
      }
      
      // Filter by make if provided
      if (make && make !== 'all') {
        query = query.where(eq(cars.make, make));
      }
      
      const carsList = await query.orderBy(desc(cars.createdAt));
      
      res.json(carsList);
    } catch (error) {
      console.error("Error fetching cars:", error);
      res.status(500).json({ message: "Error fetching cars" });
    }
  });
  
  // Get a specific car
  app.get("/api/cars/:id", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      
      const car = await db.select().from(cars)
        .where(eq(cars.id, carId))
        .limit(1);
      
      if (car.length === 0) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      res.json(car[0]);
    } catch (error) {
      console.error("Error fetching car:", error);
      res.status(500).json({ message: "Error fetching car" });
    }
  });
  
  // Create a new car (admin/dealer only)
  app.post("/api/cars", isAuthenticated, (req, res, next) => {
    if (req.user?.role !== "admin" && req.user?.role !== "dealer") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  }, async (req, res) => {
    try {
      // Validate request body
      const carData = insertCarSchema.parse(req.body);
      
      // The carData.restockDate is already processed by the schema validation
      // No additional date conversion needed
      const dataToInsert = carData;
      
      // Insert the car
      const [newCar] = await db.insert(cars).values(dataToInsert).returning();
      
      res.status(201).json(newCar);
    } catch (error) {
      console.error("Error creating car:", error);
      res.status(400).json({ 
        message: "Error creating car", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Update a car (admin/dealer only)
  app.put("/api/cars/:id", isAuthenticated, (req, res, next) => {
    if (req.user?.role !== "admin" && req.user?.role !== "dealer") {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  }, async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      
      // Verify the car exists
      const existingCar = await db.select().from(cars)
        .where(eq(cars.id, carId))
        .limit(1);
      
      if (existingCar.length === 0) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      // Validate request body
      const carData = insertCarSchema.parse(req.body);
      
      // Update the car
      const [updatedCar] = await db.update(cars)
        .set({
          make: carData.make,
          model: carData.model,
          year: carData.year,
          color: carData.color,
          price: carData.price,
          vin: carData.vin,
          status: carData.status,
          features: carData.features,
          imageUrl: carData.imageUrl,
          quantity: carData.quantity,
          restockDate: carData.restockDate,
          updatedAt: new Date()
        })
        .where(eq(cars.id, carId))
        .returning();
      
      res.json(updatedCar);
    } catch (error) {
      console.error("Error updating car:", error);
      res.status(400).json({ 
        message: "Error updating car", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Update car status (sales can update status)
  app.patch("/api/cars/:id/status", isAuthenticated, async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['in_stock', 'out_of_stock', 'reserved', 'sold'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Verify the car exists
      const existingCar = await db.select().from(cars)
        .where(eq(cars.id, carId))
        .limit(1);
      
      if (existingCar.length === 0) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      // Update just the status
      const [updatedCar] = await db.update(cars)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(cars.id, carId))
        .returning();
      
      res.json(updatedCar);
    } catch (error) {
      console.error("Error updating car status:", error);
      res.status(500).json({ message: "Error updating car status" });
    }
  });

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
