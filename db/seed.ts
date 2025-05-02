import { db } from "./index";
import { 
  users, 
  dealers, 
  cars, 
  customers, 
  orders,
  salesTargets
} from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seeding...");
    
    // Check if there are any dealers in the database
    const existingDealers = await db.select().from(dealers);
    
    let dealerId: number;
    // Seed dealers if none exist
    if (existingDealers.length === 0) {
      console.log("Seeding dealers...");
      
      // Create a dealer
      const [dealerResult] = await db.insert(dealers).values({
        name: "Premier Motors",
        location: "123 Main Street, Anytown, USA",
        contactEmail: "contact@premiermotors.com",
        contactPhone: "555-123-4567",
        active: true,
      }).returning();
      
      dealerId = dealerResult.id;
      console.log(`Created dealer with ID: ${dealerId}`);
    } else {
      dealerId = existingDealers[0].id;
      console.log(`Using existing dealer with ID: ${dealerId}`);
    }
    
    // Check if there are any users in the database
    const existingUsers = await db.select().from(users);
    
    let adminId: number;
    let salesId: number;
    
    // Only seed if there are no users
    if (existingUsers.length === 0) {
      console.log("Seeding users...");
      
      // Create admin user
      const [adminResult] = await db.insert(users).values({
        username: "admin",
        email: "admin@example.com",
        password: await hashPassword("password123"),
        role: "admin",
      }).returning();
      
      adminId = adminResult.id;
      
      // Create dealer user
      await db.insert(users).values({
        username: "dealer",
        email: "dealer@example.com",
        password: await hashPassword("password123"),
        role: "dealer",
        dealerId: dealerId,
      });
      
      // Create sales user
      const [salesResult] = await db.insert(users).values({
        username: "sales",
        email: "sales@example.com",
        password: await hashPassword("password123"),
        role: "sales",
        dealerId: dealerId,
        phoneNumber: "555-987-6543",
      }).returning();
      
      salesId = salesResult.id;
      console.log(`Created users with IDs: Admin=${adminId}, Sales=${salesId}`);
    } else {
      // Use existing user IDs
      const adminUser = existingUsers.find(user => user.role === "admin");
      const salesUser = existingUsers.find(user => user.role === "sales");
      
      adminId = adminUser?.id || 0;
      salesId = salesUser?.id || 0;
      
      // Update dealer ID if needed
      if (salesUser && !salesUser.dealerId) {
        await db.update(users)
          .set({ dealerId })
          .where(eq(users.id, salesUser.id));
        console.log(`Updated sales user with dealer ID: ${dealerId}`);
      }
    }
    
    // Check for existing cars
    const existingCars = await db.select().from(cars);
    
    let carIds: number[] = [];
    
    // Seed cars if none exist
    if (existingCars.length === 0) {
      console.log("Seeding cars...");
      
      const carsToInsert = [
        {
          model: "Civic",
          make: "Honda",
          year: 2023,
          color: "Blue",
          price: 25999.99,
          vin: "1HGCM82633A123456",
          status: "in_stock",
          features: "Bluetooth, Backup Camera, Cruise Control",
          dealerId,
        },
        {
          model: "Accord",
          make: "Honda",
          year: 2022,
          color: "Black",
          price: 31500.50,
          vin: "1HGCR2F58NA123457",
          status: "in_stock",
          features: "Leather Seats, Sunroof, Navigation",
          dealerId,
        },
        {
          model: "Camry",
          make: "Toyota",
          year: 2023,
          color: "Silver",
          price: 27999.99,
          vin: "4T1BF1FK5DU123458",
          status: "in_stock",
          features: "Android Auto, Apple CarPlay, Heated Seats",
          dealerId,
        },
        {
          model: "Model 3",
          make: "Tesla",
          year: 2023,
          color: "White",
          price: 45990.00,
          vin: "5YJ3E1EA4KF123459",
          status: "in_stock",
          features: "Autopilot, Glass Roof, Premium Sound",
          dealerId,
        },
        {
          model: "F-150",
          make: "Ford",
          year: 2022,
          color: "Red",
          price: 42750.00,
          vin: "1FTEW1EP5MFA12345",
          status: "in_stock",
          features: "Tow Package, Backup Assist, 4x4",
          dealerId,
        },
      ];
      
      for (const car of carsToInsert) {
        const [carResult] = await db.insert(cars).values(car).returning();
        carIds.push(carResult.id);
      }
      
      console.log(`Created ${carIds.length} cars`);
    } else {
      carIds = existingCars.map(car => car.id);
      console.log(`Using ${carIds.length} existing cars`);
    }
    
    // Check for existing customers
    const existingCustomers = await db.select().from(customers);
    
    let customerIds: number[] = [];
    
    // Seed customers if none exist
    if (existingCustomers.length === 0 && salesId) {
      console.log("Seeding customers...");
      
      const customersToInsert = [
        {
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          phone: "555-111-2222",
          address: "456 Oak St, Anytown, USA",
          salesPersonId: salesId,
          notes: "Interested in sedans",
        },
        {
          firstName: "Emily",
          lastName: "Johnson",
          email: "emily.johnson@example.com",
          phone: "555-333-4444",
          address: "789 Pine Ave, Anytown, USA",
          salesPersonId: salesId,
          notes: "Looking for family SUV",
        },
        {
          firstName: "Michael",
          lastName: "Brown",
          email: "michael.brown@example.com",
          phone: "555-555-6666",
          address: "101 Maple Blvd, Anytown, USA",
          salesPersonId: salesId,
          notes: "Prefers luxury vehicles",
        },
      ];
      
      for (const customer of customersToInsert) {
        const [customerResult] = await db.insert(customers).values(customer).returning();
        customerIds.push(customerResult.id);
      }
      
      console.log(`Created ${customerIds.length} customers`);
    } else {
      customerIds = existingCustomers.map(customer => customer.id);
      console.log(`Using ${customerIds.length} existing customers`);
    }
    
    // Check for existing orders
    const existingOrders = await db.select().from(orders);
    
    // Seed orders if none exist and we have customers and cars
    if (existingOrders.length === 0 && customerIds.length > 0 && carIds.length > 0 && salesId) {
      console.log("Seeding orders...");
      
      // Only use the first two cars for orders
      const orderCars = carIds.slice(0, 2);
      
      const ordersToInsert = [
        {
          customerId: customerIds[0],
          carId: orderCars[0],
          salesPersonId: salesId,
          status: "delivered",
          totalAmount: 26999.99,
          paymentMethod: "Financing",
          notes: "60-month financing at 3.9% APR",
          orderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          deliveryDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 days ago
        },
        {
          customerId: customerIds[1],
          carId: orderCars[1],
          salesPersonId: salesId,
          status: "pending",
          totalAmount: 32500.50,
          paymentMethod: "Cash",
          notes: "Waiting for financing approval",
        },
      ];
      
      for (const order of ordersToInsert) {
        await db.insert(orders).values(order).returning();
        
        // Update car status based on order status
        const status = order.status === "delivered" ? "sold" : "reserved";
        await db.update(cars)
          .set({ status })
          .where(eq(cars.id, order.carId));
      }
      
      console.log(`Created ${ordersToInsert.length} orders`);
    } else {
      console.log(`Using ${existingOrders.length} existing orders`);
    }
    
    // Check for existing sales targets
    const existingTargets = await db.select().from(salesTargets);
    
    // Seed sales targets if none exist
    if (existingTargets.length === 0 && salesId) {
      console.log("Seeding sales targets...");
      
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      await db.insert(salesTargets).values({
        salesPersonId: salesId,
        targetMonth: currentMonth,
        targetYear: currentYear,
        targetAmount: 150000.00,
        targetUnits: 5,
      });
      
      console.log("Created sales target for current month");
    } else {
      console.log(`Using ${existingTargets.length} existing sales targets`);
    }
    
    console.log("Seeding completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
