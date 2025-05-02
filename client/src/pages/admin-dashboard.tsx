import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound, ShieldAlert, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    activeSessions: number;
    systemAlerts: number;
  };
  message: string;
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery<AdminDashboardData>({
    queryKey: ["/api/admin/dashboard"],
  });

  if (error) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          Error loading dashboard data: {error.message}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isLoading ? (
              <Skeleton className="h-7 w-96" />
            ) : (
              data?.message || "Welcome to the Admin Dashboard"
            )}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <StatCard
            title="Total Users"
            value={data?.stats.totalUsers}
            icon={<UserRound className="h-6 w-6" />}
            color="bg-blue-500"
            isLoading={isLoading}
          />
          <StatCard
            title="Active Sessions"
            value={data?.stats.activeSessions}
            icon={<ShieldAlert className="h-6 w-6" />}
            color="bg-green-500"
            isLoading={isLoading}
          />
          <StatCard
            title="System Alerts"
            value={data?.stats.systemAlerts}
            icon={<Bell className="h-6 w-6" />}
            color="bg-red-500"
            isLoading={isLoading}
          />
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Administrative Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              As an administrator, you have access to manage users, view system logs, and configure security settings.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-gray-500">Manage user accounts and permissions</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Security Settings</h3>
                  <p className="text-sm text-gray-500">Configure authentication and security options</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">System Logs</h3>
                  <p className="text-sm text-gray-500">View authentication and system activity logs</p>
                </CardContent>
              </Card>
              <Card className="hover:bg-gray-50 cursor-pointer transition-colors">
                <CardContent className="p-4">
                  <h3 className="font-medium">Role Configuration</h3>
                  <p className="text-sm text-gray-500">Manage role-based access control settings</p>
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
  icon: React.ReactNode;
  color: string;
  isLoading: boolean;
}

function StatCard({ title, value, icon, color, isLoading }: StatCardProps) {
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
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
