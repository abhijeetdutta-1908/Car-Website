import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";
import { 
  customers, 
  cars, 
  orders, 
  salesTargets,
  carStatusEnum
} from "../shared/schema";
import { desc, eq, and, count, sum, gt, gte, lte, inArray } from "drizzle-orm";

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
      // Get user ID from authenticated request
      const userId = req.user?.id;
      
      // Get basic dashboard stats
      const dailySales = await db.query.orders.count({
        where: and(
          eq(orders.salesPersonId, userId),
          gte(orders.orderDate, new Date(new Date().setHours(0, 0, 0, 0)))
        )
      });
      
      const totalCustomers = await db.query.customers.count({
        where: eq(customers.salesPersonId, userId)
      });
      
      const totalRevenue = await db.select({ 
        sum: sum(orders.totalAmount).mapWith(Number) 
      }).from(orders)
        .where(eq(orders.salesPersonId, userId));

      // Calculate conversion rate (mock data for now)
      const conversionRate = "21.5%";
      
      res.json({
        stats: {
          dailySales: dailySales || 0,
          leadsGenerated: totalCustomers || 0,
          conversionRate
        },
        message: `Welcome back, ${req.user?.username}! Here's your sales dashboard.`
      });
    } catch (error) {
      console.error("Error fetching sales dashboard data:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  // === SALES DASHBOARD API ENDPOINTS ===
  
  // Get customers for logged-in sales person
  app.get("/api/sales/customers", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const customers = await db.query.customers.findMany({
        where: eq(customers.salesPersonId, req.user?.id),
        orderBy: desc(customers.createdAt),
        limit: 100
      });
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Error fetching customers" });
    }
  });
  
  // Get customer details
  app.get("/api/sales/customers/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const customerId = parseInt(req.params.id);
      
      const customer = await db.query.customers.findFirst({
        where: and(
          eq(customers.id, customerId),
          eq(customers.salesPersonId, req.user?.id)
        ),
        with: {
          orders: {
            with: {
              car: true
            }
          }
        }
      });
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customer);
    } catch (error) {
      console.error("Error fetching customer details:", error);
      res.status(500).json({ message: "Error fetching customer details" });
    }
  });
  
  // Create new customer
  app.post("/api/sales/customers", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const newCustomer = {
        ...req.body,
        salesPersonId: req.user?.id
      };
      
      const [customer] = await db.insert(customers).values(newCustomer).returning();
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Error creating customer" });
    }
  });
  
  // Get available cars for sales
  app.get("/api/sales/cars", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      // Filter by status if provided
      const status = req.query.status as string;
      
      let query = db.select().from(cars);
      
      if (status && status !== 'all') {
        query = query.where(eq(cars.status, status as any));
      } else {
        // By default, only show cars that are in_stock or reserved
        query = query.where(inArray(cars.status, ['in_stock', 'reserved']));
      }
      
      const availableCars = await query.limit(100);
      
      res.json(availableCars);
    } catch (error) {
      console.error("Error fetching available cars:", error);
      res.status(500).json({ message: "Error fetching available cars" });
    }
  });
  
  // Get car details
  app.get("/api/sales/cars/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const carId = parseInt(req.params.id);
      
      const car = await db.query.cars.findFirst({
        where: eq(cars.id, carId),
        with: {
          dealer: true
        }
      });
      
      if (!car) {
        return res.status(404).json({ message: "Car not found" });
      }
      
      res.json(car);
    } catch (error) {
      console.error("Error fetching car details:", error);
      res.status(500).json({ message: "Error fetching car details" });
    }
  });
  
  // Get sales person's orders
  app.get("/api/sales/orders", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const status = req.query.status as string;
      
      let query = db.query.orders;
      
      const orders = await query.findMany({
        where: and(
          eq(orders.salesPersonId, req.user?.id),
          status ? eq(orders.status, status as any) : undefined
        ),
        with: {
          customer: true,
          car: true
        },
        orderBy: desc(orders.orderDate),
        limit: 100
      });
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders" });
    }
  });
  
  // Create new order
  app.post("/api/sales/orders", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const { carId, customerId, totalAmount, paymentMethod, notes } = req.body;
      
      // Check if car is available
      const car = await db.query.cars.findFirst({
        where: eq(cars.id, carId)
      });
      
      if (!car || car.status !== 'in_stock') {
        return res.status(400).json({ message: "Car is not available for purchase" });
      }
      
      // Create new order
      const [newOrder] = await db.insert(orders).values({
        carId,
        customerId,
        salesPersonId: req.user?.id,
        totalAmount,
        paymentMethod,
        notes,
        status: 'pending'
      }).returning();
      
      // Update car status to reserved
      await db.update(cars)
        .set({ status: 'reserved' })
        .where(eq(cars.id, carId));
      
      // Return the new order with related data
      const orderWithDetails = await db.query.orders.findFirst({
        where: eq(orders.id, newOrder.id),
        with: {
          customer: true,
          car: true
        }
      });
      
      res.status(201).json(orderWithDetails);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Error creating order" });
    }
  });
  
  // Update order status
  app.patch("/api/sales/orders/:id", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      
      // Find the order first
      const existingOrder = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, orderId),
          eq(orders.salesPersonId, req.user?.id)
        ),
        with: {
          car: true
        }
      });
      
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update the order status
      const [updatedOrder] = await db.update(orders)
        .set({ status })
        .where(eq(orders.id, orderId))
        .returning();
      
      // If order is delivered or cancelled, update car status accordingly
      if (status === 'delivered') {
        await db.update(cars)
          .set({ status: 'sold' })
          .where(eq(cars.id, existingOrder.carId));
      } else if (status === 'cancelled') {
        await db.update(cars)
          .set({ status: 'in_stock' })
          .where(eq(cars.id, existingOrder.carId));
      }
      
      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Error updating order" });
    }
  });
  
  // Get sales targets for the logged-in sales person
  app.get("/api/sales/targets", isAuthenticated, hasRole("sales"), async (req, res) => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const currentYear = currentDate.getFullYear();
      
      const targets = await db.query.salesTargets.findMany({
        where: and(
          eq(salesTargets.salesPersonId, req.user?.id),
          eq(salesTargets.targetMonth, currentMonth),
          eq(salesTargets.targetYear, currentYear)
        )
      });
      
      // If no targets are found, return default ones
      if (targets.length === 0) {
        return res.json({
          targetAmount: 100000,
          targetUnits: 10,
          currentAmount: 0,
          currentUnits: 0
        });
      }
      
      // Calculate current progress
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0);
      
      const salesThisMonth = await db.query.orders.findMany({
        where: and(
          eq(orders.salesPersonId, req.user?.id),
          gte(orders.orderDate, monthStart),
          lte(orders.orderDate, monthEnd),
          eq(orders.status, 'delivered')
        )
      });
      
      const currentAmount = salesThisMonth.reduce((sum, order) => 
        sum + Number(order.totalAmount), 0);
      const currentUnits = salesThisMonth.length;
      
      res.json({
        ...targets[0],
        currentAmount,
        currentUnits
      });
    } catch (error) {
      console.error("Error fetching sales targets:", error);
      res.status(500).json({ message: "Error fetching sales targets" });
    }
  });

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
