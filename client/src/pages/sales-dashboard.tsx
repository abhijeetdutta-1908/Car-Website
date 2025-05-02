import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, UserRound, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesDashboardData {
  stats: {
    dailySales: number;
    leadsGenerated: number;
    conversionRate: string;
  };
  message: string;
}

export default function SalesDashboard() {
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
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isLoading ? (
              <Skeleton className="h-7 w-96" />
            ) : (
              data?.message || "Welcome to the Sales Dashboard"
            )}
          </h2>
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sales Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              As a sales person, you can track your sales performance, manage leads, and access product information.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Lead Management</h3>
                  <p className="text-sm text-gray-500">View and manage customer leads</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Sales Performance</h3>
                  <p className="text-sm text-gray-500">Track your sales metrics and goals</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Product Catalog</h3>
                  <p className="text-sm text-gray-500">Browse available products and pricing</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Customer Follow-ups</h3>
                  <p className="text-sm text-gray-500">Schedule and manage customer follow-ups</p>
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
