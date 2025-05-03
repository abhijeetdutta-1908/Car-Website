import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, DollarSign, Users, Plus, Edit, Trash2, LogOut, Calendar, BarChart, Car, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DealerDashboardData {
  stats: {
    inventory: number;
    pendingOrders: number;
    monthlyRevenue: string;
    salesStaffCount: number;
    maxSalesStaff: number;
  };
  message: string;
}

interface SalesStaff {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
  phoneNumber?: string;
  createdAt: string;
}

interface CarData {
  id: number;
  make: string;
  model: string;
  year: number;
  color: string;
  price: number;
  vin: string;
  status: string;
  features?: string;
  imageUrl?: string;
  quantity: number;
  restockDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface SalesPerformance {
  id: number;
  name: string;
  totalSales: number;
  totalRevenue: number;
  monthlySales: number;
  monthlyRevenue: number;
  target: {
    revenueTarget: number;
    unitsTarget: number;
    id: number;
  } | null;
}

const salesPersonSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  profilePicture: z.string().optional(),
});

const salesTargetSchema = z.object({
  salesPersonId: z.number({
    required_error: "Please select a sales person",
  }),
  targetMonth: z.date({
    required_error: "Target month is required",
  }),
  revenueTarget: z.number().min(1, "Revenue target must be greater than 0"),
  unitsTarget: z.number().int().min(1, "Units target must be at least 1"),
});

const carSchema = z.object({
  make: z.string().min(2, "Make must be at least 2 characters"),
  model: z.string().min(2, "Model must be at least 2 characters"),
  year: z.number().min(1900, "Year must be at least 1900").max(2100, "Year must be less than 2100"),
  color: z.string().min(2, "Color must be at least 2 characters"),
  price: z.number().positive("Price must be positive"),
  vin: z.string().min(17, "VIN must be at least 17 characters").max(17, "VIN cannot exceed 17 characters"),
  status: z.enum(['in_stock', 'out_of_stock', 'reserved', 'sold']),
  features: z.string().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  restockDate: z.date().optional(),
});

export default function DealerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, isLoading, error } = useQuery<DealerDashboardData>({
    queryKey: ["/api/dealer/dashboard"],
  });
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleSignOut = async () => {
    await logoutMutation.mutateAsync();
    navigate("/auth");
  };

  if (error) {
    return (
      <DashboardLayout title="Dealer Dashboard">
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          Error loading dashboard data: {error.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dealer Dashboard">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {isLoading ? (
            <Skeleton className="h-7 w-96" />
          ) : (
            data?.message || "Welcome to the Dealer Dashboard"
          )}
        </h2>
        <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <StatCard
          title="Inventory Items"
          value={data?.stats.inventory}
          icon={<Package className="h-6 w-6" />}
          color="bg-purple-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Orders"
          value={data?.stats.pendingOrders}
          icon={<Clock className="h-6 w-6" />}
          color="bg-yellow-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Monthly Revenue"
          valueText={data?.stats.monthlyRevenue}
          icon={<DollarSign className="h-6 w-6" />}
          color="bg-green-500"
          isLoading={isLoading}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales-staff">Sales Staff</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab salesStaffCount={data?.stats.salesStaffCount} maxSalesStaff={data?.stats.maxSalesStaff} isLoading={isLoading} />
        </TabsContent>
        
        <TabsContent value="sales-staff" className="space-y-4">
          <SalesStaffTab />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab />
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-4">
          <InventoryTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

function OverviewTab({ salesStaffCount = 0, maxSalesStaff = 5, isLoading = false }) {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sales Team Status</CardTitle>
          <CardDescription>Currently managing {isLoading ? "..." : `${salesStaffCount} out of ${maxSalesStaff}`} sales staff</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sales Staff Capacity</span>
              <span>{isLoading ? "..." : `${salesStaffCount}/${maxSalesStaff}`}</span>
            </div>
            <Progress value={isLoading ? 0 : (salesStaffCount / maxSalesStaff) * 100} />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => document.getElementById('sales-staff-tab')?.click()}>
            Manage Sales Staff
          </Button>
        </CardFooter>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Dealer Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => document.getElementById('inventory-tab')?.click()}>
              <CardContent className="p-4 flex items-start space-x-3">
                <Car className="h-5 w-5 mt-0.5 text-blue-500" />
                <div>
                  <h3 className="font-medium">Inventory Management</h3>
                  <p className="text-sm text-gray-500">Add, edit, or remove cars from inventory</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => document.getElementById('performance-tab')?.click()}>
              <CardContent className="p-4 flex items-start space-x-3">
                <Target className="h-5 w-5 mt-0.5 text-red-500" />
                <div>
                  <h3 className="font-medium">Set Sales Targets</h3>
                  <p className="text-sm text-gray-500">Set monthly targets for your sales team</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => document.getElementById('performance-tab')?.click()}>
              <CardContent className="p-4 flex items-start space-x-3">
                <BarChart className="h-5 w-5 mt-0.5 text-green-500" />
                <div>
                  <h3 className="font-medium">Sales Reports</h3>
                  <p className="text-sm text-gray-500">View detailed sales and revenue analytics</p>
                </div>
              </CardContent>
            </Card>
            <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => document.getElementById('sales-staff-tab')?.click()}>
              <CardContent className="p-4 flex items-start space-x-3">
                <Users className="h-5 w-5 mt-0.5 text-purple-500" />
                <div>
                  <h3 className="font-medium">Sales Staff</h3>
                  <p className="text-sm text-gray-500">Manage your sales team members</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesStaffTab() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: salesStaff, isLoading } = useQuery<SalesStaff[]>({
    queryKey: ["/api/dealer/sales-staff"],
  });

  const addSalesPersonMutation = useMutation({
    mutationFn: async (data: z.infer<typeof salesPersonSchema>) => {
      const res = await apiRequest("POST", "/api/dealer/sales-staff", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/sales-staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/dashboard"] });
      toast({
        title: "Success",
        description: "Sales person added successfully.",
      });
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add sales person",
        variant: "destructive",
      });
    },
  });

  const removeSalesPersonMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/dealer/sales-staff/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/sales-staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/dashboard"] });
      toast({
        title: "Success",
        description: "Sales person removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove sales person",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof salesPersonSchema>>({
    resolver: zodResolver(salesPersonSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      phoneNumber: "",
      profilePicture: "",
    },
  });

  function onSubmit(values: z.infer<typeof salesPersonSchema>) {
    addSalesPersonMutation.mutate(values);
  }

  const handleRemove = (id: number) => {
    if (window.confirm("Are you sure you want to remove this sales person?")) {
      removeSalesPersonMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Sales Staff Management</CardTitle>
            <CardDescription>Manage your sales team (maximum 5 members)</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Sales Person
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Sales Person</DialogTitle>
                <DialogDescription>
                  Create a new sales staff account. They'll receive credentials to log in.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addSalesPersonMutation.isPending}
                    >
                      {addSalesPersonMutation.isPending ? "Adding..." : "Add Sales Person"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                  <Skeleton className="h-8 w-52" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : salesStaff?.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No sales staff found</p>
              <p className="text-sm">Add sales staff to your team to start managing them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {salesStaff?.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {staff.profilePicture ? (
                        <img src={staff.profilePicture} alt={staff.username} className="w-10 h-10 rounded-full" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{staff.username}</div>
                      <div className="text-sm text-gray-500">{staff.email}</div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemove(staff.id)}
                    disabled={removeSalesPersonMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PerformanceTab() {
  const { toast } = useToast();
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const { data: salesStaff, isLoading: staffLoading } = useQuery<SalesStaff[]>({
    queryKey: ["/api/dealer/sales-staff"],
  });
  
  const { data: performanceData, isLoading: performanceLoading } = useQuery<SalesPerformance[]>({
    queryKey: ["/api/dealer/performance"],
  });

  const form = useForm<z.infer<typeof salesTargetSchema>>({
    resolver: zodResolver(salesTargetSchema),
    defaultValues: {
      targetMonth: new Date(),
      revenueTarget: 100000,
      unitsTarget: 10,
    },
  });

  const addTargetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof salesTargetSchema>) => {
      const res = await apiRequest("POST", "/api/dealer/sales-targets", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/performance"] });
      toast({
        title: "Success",
        description: "Sales target set successfully.",
      });
      setIsTargetDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set sales target",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof salesTargetSchema>) {
    addTargetMutation.mutate(values);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Sales Team Performance</CardTitle>
            <CardDescription>View performance metrics and set sales targets</CardDescription>
          </div>
          <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Set Target
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set Sales Target</DialogTitle>
                <DialogDescription>
                  Define sales goals for a team member for the current month.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="salesPersonId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Person</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select sales person" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {staffLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : salesStaff?.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id.toString()}>
                                {staff.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Month</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="revenueTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Revenue Target ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitsTarget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units Target</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addTargetMutation.isPending}
                    >
                      {addTargetMutation.isPending ? "Setting..." : "Set Target"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {performanceLoading || staffLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="mb-4">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : performanceData?.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <BarChart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No performance data available</p>
              <p className="text-sm">Add sales staff to view their performance metrics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {performanceData?.map((person) => (
                <Card key={person.id} className="mb-4">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>{person.name}</CardTitle>
                      {!person.target && (
                        <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">
                          No target set
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Monthly Sales</div>
                        <div className="flex justify-between">
                          <span className="text-xl font-bold">{person.monthlySales}</span>
                          {person.target && (
                            <span className="text-sm text-gray-500">
                              of {person.target.unitsTarget} target
                            </span>
                          )}
                        </div>
                        {person.target && (
                          <Progress 
                            className="mt-1" 
                            value={calculateProgress(person.monthlySales, person.target.unitsTarget)} 
                          />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Monthly Revenue</div>
                        <div className="flex justify-between">
                          <span className="text-xl font-bold">{formatCurrency(person.monthlyRevenue)}</span>
                          {person.target && (
                            <span className="text-sm text-gray-500">
                              of {formatCurrency(person.target.revenueTarget)}
                            </span>
                          )}
                        </div>
                        {person.target && (
                          <Progress 
                            className="mt-1" 
                            value={calculateProgress(person.monthlyRevenue, person.target.revenueTarget)} 
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 pt-2 border-t">
                      <span>Total Sales: {person.totalSales}</span>
                      <span>Total Revenue: {formatCurrency(person.totalRevenue)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryTab() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: cars, isLoading } = useQuery<CarData[]>({
    queryKey: ["/api/cars"],
  });

  const form = useForm<z.infer<typeof carSchema>>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      price: 0,
      vin: "",
      status: "in_stock",
      features: "",
      imageUrl: "",
      quantity: 1,
    },
  });

  const addCarMutation = useMutation({
    mutationFn: async (data: z.infer<typeof carSchema>) => {
      const res = await apiRequest("POST", "/api/cars", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/dashboard"] });
      toast({
        title: "Success",
        description: "Car added to inventory successfully.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add car to inventory",
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: z.infer<typeof carSchema>) {
    // Clone the values and process the restockDate
    const dataToSubmit = {
      ...values,
      // Only include restockDate if specified and the status is out_of_stock
      restockDate: values.status === 'out_of_stock' && values.restockDate 
        ? values.restockDate 
        : undefined
    };
    
    addCarMutation.mutate(dataToSubmit);
  }

  const statusColors = {
    'in_stock': 'bg-green-100 text-green-800',
    'out_of_stock': 'bg-red-100 text-red-800',
    'reserved': 'bg-yellow-100 text-yellow-800',
    'sold': 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Car Inventory</CardTitle>
            <CardDescription>Manage your dealership's car inventory</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
                <DialogDescription>
                  Add a new car to your dealership's inventory.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="Camry" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input placeholder="Silver" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VIN</FormLabel>
                          <FormControl>
                            <Input placeholder="1HGCM82633A123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="in_stock">In Stock</SelectItem>
                              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="sold">Sold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features</FormLabel>
                        <FormControl>
                          <Input placeholder="Leather seats, sunroof, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/car-image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("status") === "out_of_stock" && (
                    <FormField
                      control={form.control}
                      name="restockDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restock Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={addCarMutation.isPending}
                    >
                      {addCarMutation.isPending ? "Adding..." : "Add Vehicle"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border rounded-md">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </div>
              ))}
            </div>
          ) : cars?.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Car className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No vehicles in inventory</p>
              <p className="text-sm">Add vehicles to start managing your inventory</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cars?.map((car) => (
                <Card key={car.id} className="overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/4 bg-gray-100 flex items-center justify-center p-4">
                      {car.imageUrl ? (
                        <img 
                          src={car.imageUrl} 
                          alt={`${car.make} ${car.model}`} 
                          className="max-h-28 object-contain"
                        />
                      ) : (
                        <Car className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <div className="p-4 md:w-3/4">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-lg">
                          {car.year} {car.make} {car.model}
                        </h3>
                        <div className={`text-sm px-2 py-1 rounded ${statusColors[car.status as keyof typeof statusColors]}`}>
                          {car.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 mt-2">
                        <div>
                          <span className="text-gray-500 text-sm">Color:</span> {car.color}
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Price:</span> ${car.price.toLocaleString()}
                        </div>
                        <div>
                          <span className="text-gray-500 text-sm">Quantity:</span> {car.quantity}
                        </div>
                        <div className="md:col-span-3">
                          <span className="text-gray-500 text-sm">Features:</span> {car.features || 'None listed'}
                        </div>
                        {car.status === 'out_of_stock' && car.restockDate && (
                          <div className="md:col-span-3">
                            <span className="text-gray-500 text-sm">Expected restock:</span> {new Date(car.restockDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
