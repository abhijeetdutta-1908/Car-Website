import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "../db";

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
      // For now, return static data since we don't have the tables yet
      res.json({
        stats: {
          dailySales: 24,
          leadsGenerated: 78,
          conversionRate: "18.5%"
        },
        message: `Welcome back, ${req.user?.username}! Here's your sales dashboard.`
      });
    } catch (error) {
      console.error("Error fetching sales dashboard data:", error);
      res.status(500).json({ message: "Error fetching dashboard data" });
    }
  });

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
