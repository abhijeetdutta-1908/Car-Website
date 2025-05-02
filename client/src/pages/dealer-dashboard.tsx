import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Clock, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DealerDashboardData {
  stats: {
    inventory: number;
    pendingOrders: number;
    monthlyRevenue: string;
  };
  message: string;
}

export default function DealerDashboard() {
  const { data, isLoading, error } = useQuery<DealerDashboardData>({
    queryKey: ["/api/dealer/dashboard"],
  });

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
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isLoading ? (
              <Skeleton className="h-7 w-96" />
            ) : (
              data?.message || "Welcome to the Dealer Dashboard"
            )}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Dealer Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              As a dealer, you can manage inventory, process orders, and track your revenue and performance.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Inventory Management</h3>
                  <p className="text-sm text-gray-500">Add, edit, or remove products from inventory</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Order Processing</h3>
                  <p className="text-sm text-gray-500">View and manage customer orders</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Sales Reports</h3>
                  <p className="text-sm text-gray-500">View detailed sales and revenue analytics</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Customer Management</h3>
                  <p className="text-sm text-gray-500">View and manage customer information</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
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
