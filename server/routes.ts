import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";
import { 
  customers, 
  cars, 
  orders, 
  salesTargets, 
  insertCustomerSchema, 
  insertCarSchema, 
  insertOrderSchema,
  insertSalesTargetSchema
} from "../shared/schema";
import { eq, desc, like, and, or, sql } from "drizzle-orm";

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
  
  app.get("/api/dealer/dashboard", isAuthenticated, hasRole("dealer"), (req, res) => {
    res.json({
      stats: {
        inventory: 157,
        pendingOrders: 24,
        monthlyRevenue: "$126,350"
      },
      message: "Welcome to the Dealer Dashboard"
    });
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
      
      const ordersList = await db.execute(
        `SELECT o.*, 
          c.first_name as customer_first_name, 
          c.last_name as customer_last_name,
          cars.make, cars.model, cars.year
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         JOIN cars ON o.car_id = cars.id
         WHERE o.sales_person_id = $1
         ORDER BY o.created_at DESC`,
        [req.user!.id]
      );
      
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
      
      const orderResult = await db.execute(
        `SELECT o.*, 
          c.first_name as customer_first_name, 
          c.last_name as customer_last_name,
          cars.make, cars.model, cars.year, cars.color, cars.vin
         FROM orders o
         JOIN customers c ON o.customer_id = c.id
         JOIN cars ON o.car_id = cars.id
         WHERE o.id = $1 AND o.sales_person_id = $2`,
        [orderId, req.user!.id]
      );
      
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
      const { customerId, carId, totalAmount, notes } = req.body;
      
      // Validate customer exists and belongs to this sales person
      const customer = await db.execute(
        `SELECT * FROM customers WHERE id = $1 AND sales_person_id = $2`,
        [customerId, req.user!.id]
      );
      
      if (customer.rows.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Validate car exists and is in stock
      const car = await db.execute(
        `SELECT * FROM cars WHERE id = $1 AND status = 'in_stock'`,
        [carId]
      );
      
      if (car.rows.length === 0) {
        return res.status(400).json({ message: "Car not available for purchase" });
      }
      
      // Create the order
      const newOrder = await db.execute(
        `INSERT INTO orders 
         (customer_id, car_id, sales_person_id, total_amount, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [customerId, carId, req.user!.id, totalAmount, notes]
      );
      
      // Update car status to sold
      await db.execute(
        `UPDATE cars SET status = 'sold' WHERE id = $1`,
        [carId]
      );
      
      res.status(201).json(newOrder.rows[0]);
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
      const existingOrder = await db.execute(
        `SELECT * FROM orders WHERE id = $1 AND sales_person_id = $2`,
        [orderId, req.user!.id]
      );
      
      if (existingOrder.rows.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update the order
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;
      
      if (status) {
        updateFields.push(`status = $${valueIndex}`);
        updateValues.push(status);
        valueIndex++;
      }
      
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex}`);
        updateValues.push(notes);
        valueIndex++;
      }
      
      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);
      
      // Add order ID and sales person ID to values array
      updateValues.push(orderId);
      updateValues.push(req.user!.id);
      
      const updatedOrder = await db.execute(
        `UPDATE orders 
         SET ${updateFields.join(', ')} 
         WHERE id = $${valueIndex} AND sales_person_id = $${valueIndex + 1}
         RETURNING *`,
        updateValues
      );
      
      res.json(updatedOrder.rows[0]);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(400).json({ 
        message: "Error updating order", 
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
      
      // Insert the car
      const [newCar] = await db.insert(cars).values(carData).returning();
      
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
      
      // Update the car
      const [updatedCar] = await db.update(cars)
        .set({
          make: req.body.make,
          model: req.body.model,
          year: req.body.year,
          color: req.body.color,
          price: req.body.price,
          vin: req.body.vin,
          status: req.body.status,
          features: req.body.features,
          imageUrl: req.body.imageUrl,
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
