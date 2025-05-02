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
import { LineChart, UserRound, Percent, Car, ShoppingCart, ChevronRight, PlusCircle, BarChart3, CalendarClock } from "lucide-react";
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
            icon={<Percent className="h-6 w-6" />}
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

function RecentActivitiesCard() {
  const activities = [
    { id: 1, type: "Order", description: "New order created for John Smith", time: "2 hours ago" },
    { id: 2, type: "Customer", description: "Added Emily Johnson as a new customer", time: "4 hours ago" },
    { id: 3, type: "Follow-up", description: "Scheduled call with Michael Brown", time: "Yesterday" },
    { id: 4, type: "Sale", description: "Completed sale of Honda Civic", time: "2 days ago" },
  ];

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
          {activities.map((activity) => (
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
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MonthlyTargetsCard() {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Monthly Sales Targets</CardTitle>
        <CardDescription>
          Your progress towards this month's goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <TargetProgress label="Revenue Target" current={78500} target={100000} prefix="$" />
          <TargetProgress label="Units Sold" current={6} target={10} />
        </div>
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Car Inventory</CardTitle>
        <CardDescription>
          Browse available vehicles in stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          <Car className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Explore Available Vehicles</h3>
          <p className="max-w-md mx-auto mb-6">
            Browse our entire inventory of vehicles. Filter by make, model, year, and price range to find the perfect car for your customers.
          </p>
          <Button variant="outline">View Inventory</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Order Management</CardTitle>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>
        <CardDescription>
          Track and manage customer orders
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-10 text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Your Order Dashboard</h3>
          <p className="max-w-md mx-auto mb-6">
            Create new orders, track existing ones, and manage the entire sales process from initial inquiry to final delivery.
          </p>
          <Button variant="outline">View All Orders</Button>
        </div>
      </CardContent>
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