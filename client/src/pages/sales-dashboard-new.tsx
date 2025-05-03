import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, UserRound, Car, ShoppingCart, ChevronRight, PlusCircle, BarChart3, CalendarClock, DollarSign, Users, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SalesDashboardData {
  stats: {
    dailySales: number;
    leadsGenerated: number;
    conversionRate: string;
  };
  message: string;
}

// Customer form validation schema
const customerFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Must provide a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery<SalesDashboardData>({
    queryKey: ["/api/sales/dashboard"],
  });

  if (error) {
    return (
      <DashboardLayout title="Sales Dashboard">
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          Error loading dashboard data: {error.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sales Dashboard">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {isLoading ? (
                <Skeleton className="h-7 w-96" />
              ) : (
                data?.message || `Welcome back, ${user?.username || "Sales Agent"}!`
              )}
            </h2>
            <p className="text-muted-foreground">Your sales dashboard and management tools</p>
          </div>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            title="Daily Sales"
            value={data?.stats.dailySales}
            icon={<LineChart className="h-6 w-6" />}
            color="bg-blue-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Leads Generated"
            value={data?.stats.leadsGenerated}
            icon={<UserRound className="h-6 w-6" />}
            color="bg-orange-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Conversion Rate"
            valueText={data?.stats.conversionRate}
            icon={<TrendingUp className="h-6 w-6" />}
            color="bg-green-500"
            isLoading={isLoading}
          />
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="bg-card border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="inventory">Car Inventory</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <QuickLinksCard />
              <RecentActivitiesCard />
            </div>
            <MonthlyTargetsCard />
          </TabsContent>
          
          <TabsContent value="customers" className="space-y-4">
            <CustomersTab />
          </TabsContent>
          
          <TabsContent value="inventory" className="space-y-4">
            <InventoryTab />
          </TabsContent>
          
          <TabsContent value="orders" className="space-y-4">
            <OrdersTab />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <PerformanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function QuickLinksCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Common tasks and operations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={<UserRound />} label="Add Customer" />
          <ActionButton icon={<ShoppingCart />} label="New Order" />
          <ActionButton icon={<Car />} label="View Inventory" />
          <ActionButton icon={<CalendarClock />} label="Schedule Follow-up" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <Button variant="outline" className="h-auto flex items-center justify-start py-3 px-4 space-x-2 w-full">
      <div className="flex-shrink-0">{icon}</div>
      <span>{label}</span>
    </Button>
  );
}

// Define the Activity type
interface Activity {
  id: string;
  type: 'Order' | 'Customer';
  description: string;
  time: string;
  date: Date;
}

function RecentActivitiesCard() {
  // Fetch orders for recent activities
  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch customers for recent activities
  const { data: customers, isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Format date to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  // Create activities array from orders and customers
  const getActivities = (): Activity[] => {
    const activities: Activity[] = [];
    
    // Add recent orders
    if (orders && Array.isArray(orders)) {
      orders.slice(0, 5).forEach(order => {
        activities.push({
          id: `order-${order.id}`,
          type: "Order",
          description: `New order created for ${order.customer_first_name} ${order.customer_last_name} - ${order.make} ${order.model}`,
          time: formatRelativeTime(order.created_at),
          date: new Date(order.created_at)
        });
      });
    }

    // Add recent customers
    if (customers && Array.isArray(customers)) {
      customers.slice(0, 5).forEach(customer => {
        activities.push({
          id: `customer-${customer.id}`,
          type: "Customer",
          description: `Added ${customer.firstName} ${customer.lastName} as a new customer`,
          time: formatRelativeTime(customer.createdAt),
          date: new Date(customer.createdAt)
        });
      });
    }
    
    // Sort by date, newest first
    return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  };

  const activities = getActivities();
  const isLoading = ordersLoading || customersLoading;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>
          Your latest actions and events
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-[220px]">
          {isLoading ? (
            <div className="space-y-4 px-6">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex justify-between items-start px-6 py-3 border-b last:border-0">
                <div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{activity.type}</Badge>
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                  <p className="mt-1">{activity.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground mt-1" />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
              <p className="mb-2">No recent activity to display</p>
              <p className="text-sm">Activities will appear here as you work with customers and create orders.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MonthlyTargetsCard() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/sales/dashboard"],
  });
  
  // Extract the values from the dashboard data
  const monthlyRevenue = data?.stats?.monthlyRevenue || 0;
  const revenueTarget = data?.stats?.revenueTarget || 100000;
  const monthlyCarsSold = data?.stats?.monthlyCarsSold || 0;
  const unitsTarget = data?.stats?.unitsTarget || 10;
  
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Monthly Sales Targets</CardTitle>
        <CardDescription>
          Your progress towards this month's goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <TargetProgress 
              label="Revenue Target" 
              current={monthlyRevenue} 
              target={revenueTarget} 
              prefix="$" 
            />
            <TargetProgress 
              label="Units Sold" 
              current={monthlyCarsSold} 
              target={unitsTarget} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TargetProgress({ 
  label, 
  current, 
  target, 
  prefix = "" 
}: { 
  label: string; 
  current: number; 
  target: number; 
  prefix?: string 
}) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {prefix}{current.toLocaleString()} / {prefix}{target.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full">
        <div 
          className="h-full bg-green-500 rounded-full" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-right text-sm text-muted-foreground">{percentage}% Complete</div>
    </div>
  );
}

function CustomersTab() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const queryClientInstance = useQueryClient();
  
  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });
  
  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClientInstance.invalidateQueries({ queryKey: ["/api/sales/dashboard"] });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
    },
  });
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Customer Management</CardTitle>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
          <CardDescription>
            Manage your customer database and leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : customers && Array.isArray(customers) && customers.length > 0 ? (
            <div className="divide-y">
              {customers.map((customer: any) => (
                <div key={customer.id} className="py-3 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{customer.firstName} {customer.lastName}</h4>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <UserRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Your Customer List</h3>
              <p className="max-w-md mx-auto mb-6">
                Track and manage all your customers from one central location. Add new customers, view their details, and monitor their purchase history.
              </p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                Add Your First Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddCustomerDialog 
        isOpen={isAddDialogOpen} 
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={(data) => createCustomerMutation.mutate(data)}
        isSubmitting={createCustomerMutation.isPending}
      />
    </>
  );
}

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormValues) => void;
  isSubmitting: boolean;
}

function AddCustomerDialog({ isOpen, onClose, onSubmit, isSubmitting }: AddCustomerDialogProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });
  
  function handleSubmit(data: CustomerFormValues) {
    onSubmit(data);
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the customer's information below to add them to your database.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="john.doe@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(123) 456-7890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St, City, State, Zip" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Any additional information about the customer..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InventoryTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [makeFilter, setMakeFilter] = useState<string>("all");
  
  // Fetch all cars
  const { data: cars, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cars", { status: statusFilter, make: makeFilter }],
  });
  
  // Extract unique makes for filter dropdown
  const uniqueMakes = cars ? 
    Array.from(new Set(cars.map(car => car.make)))
      .sort((a, b) => a.localeCompare(b)) : 
    [];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Car Inventory</CardTitle>
          <div className="flex items-center space-x-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={makeFilter}
              onValueChange={(value) => setMakeFilter(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Make" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Makes</SelectItem>
                {uniqueMakes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <CardDescription>
          Browse available vehicles in inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : cars && cars.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Restock Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div className="font-medium">{car.make} {car.model}</div>
                      <div className="text-sm text-muted-foreground">{car.color}</div>
                    </TableCell>
                    <TableCell>{car.year}</TableCell>
                    <TableCell>${car.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={car.status === 'in_stock' ? 'default' : 
                        car.status === 'reserved' ? 'outline' : 
                        car.status === 'out_of_stock' ? 'secondary' : 'destructive'}>
                        {car.status === 'in_stock' ? 'In Stock' : 
                         car.status === 'out_of_stock' ? 'Out of Stock' : 
                         car.status === 'reserved' ? 'Reserved' : 'Sold'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {car.status === 'out_of_stock' ? 'Unknown' : '—'}
                    </TableCell>
                    <TableCell>
                      {car.status === 'in_stock' && (
                        <Button size="sm" variant="outline">Select</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Vehicles Found</h3>
            <p className="max-w-md mx-auto mb-6">
              {statusFilter !== 'all' || makeFilter !== 'all' 
                ? "No cars match your current filters. Try changing your search criteria."
                : "There are no cars in the inventory yet. Cars will appear here once they've been added to the system."}
            </p>
            <Button variant="outline" onClick={() => {
              setStatusFilter('all');
              setMakeFilter('all');
            }}>
              Reset Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OrdersTab() {
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [orderStep, setOrderStep] = useState<'customer' | 'car' | 'review'>('customer');
  const queryClientInstance = useQueryClient();

  // Fetch orders
  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders"],
  });

  // Fetch customers for selection
  const { data: customers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch in-stock cars for selection
  const { data: cars } = useQuery<any[]>({
    queryKey: ["/api/cars", { status: "in_stock" }],
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/orders", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClientInstance.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClientInstance.invalidateQueries({ queryKey: ["/api/sales/dashboard"] });
      setIsCreateOrderOpen(false);
      resetOrderForm();
    },
    onError: (error) => {
      console.error("Error creating order:", error);
    },
  });

  const resetOrderForm = () => {
    setSelectedCustomerId(null);
    setSelectedCarId(null);
    setOrderStep('customer');
  };

  const handleCreateOrder = () => {
    if (!selectedCustomerId || !selectedCarId) return;
    
    const selectedCar = cars?.find(car => car.id === selectedCarId);
    
    createOrderMutation.mutate({
      customerId: selectedCustomerId,
      carId: selectedCarId,
      totalAmount: selectedCar?.price || 0,
      notes: "",
    });
  };

  // Format the status display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline">Confirmed</Badge>;
      case 'delivered':
        return <Badge variant="default">Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Order Management</CardTitle>
          <Button size="sm" onClick={() => setIsCreateOrderOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
        <CardDescription>
          Track and manage customer orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>#{order.id}</TableCell>
                    <TableCell>
                      {order.customer_first_name} {order.customer_last_name}
                    </TableCell>
                    <TableCell>{order.make} {order.model} ({order.year})</TableCell>
                    <TableCell>${Number(order.total_amount).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Orders Yet</h3>
            <p className="max-w-md mx-auto mb-6">
              Create new orders, track existing ones, and manage the entire sales process from initial inquiry to final delivery.
            </p>
            <Button variant="outline" onClick={() => setIsCreateOrderOpen(true)}>
              Create Your First Order
            </Button>
          </div>
        )}
      </CardContent>

      {/* Create Order Dialog */}
      <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
            <DialogDescription>
              {orderStep === 'customer' && "Select a customer for this order."}
              {orderStep === 'car' && "Choose a vehicle from available inventory."}
              {orderStep === 'review' && "Review and confirm order details."}
            </DialogDescription>
          </DialogHeader>

          {orderStep === 'customer' && (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {customers && customers.length > 0 ? (
                  <div className="divide-y">
                    {customers.map((customer) => (
                      <div 
                        key={customer.id} 
                        className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedCustomerId === customer.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedCustomerId(customer.id)}
                      >
                        <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                        <div className="text-sm text-muted-foreground">{customer.email} • {customer.phone || 'No phone'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No customers found. Please add a customer first.
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => setOrderStep('car')} 
                  disabled={selectedCustomerId === null}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {orderStep === 'car' && (
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {cars && cars.length > 0 ? (
                  <div className="divide-y">
                    {cars.map((car) => (
                      <div 
                        key={car.id} 
                        className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedCarId === car.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedCarId(car.id)}
                      >
                        <div className="font-medium">{car.make} {car.model} ({car.year})</div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{car.color} • VIN: {car.vin}</span>
                          <span className="font-medium">${Number(car.price).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No cars available in inventory.
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOrderStep('customer')}>
                  Back
                </Button>
                <Button 
                  onClick={() => setOrderStep('review')} 
                  disabled={selectedCarId === null}
                >
                  Continue
                </Button>
              </DialogFooter>
            </div>
          )}

          {orderStep === 'review' && (
            <div className="space-y-4">
              {selectedCustomerId && selectedCarId && (
                <div className="border rounded-md p-4 space-y-3">
                  <div>
                    <h3 className="font-medium">Customer</h3>
                    <p className="text-sm">
                      {customers?.find(c => c.id === selectedCustomerId)?.firstName || ''} {' '}
                      {customers?.find(c => c.id === selectedCustomerId)?.lastName || ''}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Vehicle</h3>
                    <p className="text-sm">
                      {cars?.find(c => c.id === selectedCarId)?.make || ''} {' '}
                      {cars?.find(c => c.id === selectedCarId)?.model || ''} {' '}
                      ({cars?.find(c => c.id === selectedCarId)?.year || ''})
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Total Amount</h3>
                    <p className="text-lg font-bold">
                      ${Number(cars?.find(c => c.id === selectedCarId)?.price || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOrderStep('car')}>
                  Back
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PerformanceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>
          Track your sales performance and achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Sales Analytics</h3>
          <p className="max-w-md mx-auto mb-6">
            View detailed statistics about your sales performance, including monthly targets, conversion rates, and historical trends.
          </p>
          <Button variant="outline">View Full Report</Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value?: number;
  valueText?: string;
  icon: React.ReactNode;
  color: string;
  isLoading: boolean;
}

function StatCard({ title, value, valueText, icon, color, isLoading }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-full ${color} text-white`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{valueText || value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}