import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";
import { customers, cars, insertCustomerSchema, insertCarSchema } from "../shared/schema";
import { eq, desc, like, and, or } from "drizzle-orm";

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
      // Get counts from the database - use a simpler query approach
      const result = await db.execute(sql`
        SELECT COUNT(*) FROM customers WHERE sales_person_id = ${req.user!.id}
      `);
      
      const customerCount = parseInt(result.rows[0]?.count || '0', 10);
      
      // For now, return some static data along with real customer count
      res.json({
        stats: {
          dailySales: 0,
          leadsGenerated: customerCount,
          conversionRate: "0%"
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
