import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Store,
  TrendingUp,
  User,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Define navigation items based on role
  const getNavItems = () => {
    const baseItems = [
      {
        label: "Dashboard",
        href: `/${user?.role}`,
        icon: <LayoutDashboard className="mr-2 h-5 w-5" />,
      },
    ];
    
    return baseItems;
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case "admin":
        return <ShieldCheck className="h-6 w-6 text-primary" />;
      case "dealer":
        return <Store className="h-6 w-6 text-primary" />;
      case "sales":
        return <TrendingUp className="h-6 w-6 text-primary" />;
      default:
        return <User className="h-6 w-6 text-primary" />;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="bg-white shadow-md w-64 min-h-screen flex flex-col border-r">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="flex-shrink-0">
            <img src="/moto-verse-icon.svg" alt="Moto Verse Logo" className="h-10 w-10" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-primary-800 capitalize">
              {user?.role} Portal
            </h1>
            <p className="text-sm text-gray-500">Moto Verse</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>
                  <a
                    className={`flex items-center px-4 py-2 rounded-md ${
                      location === item.href
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gray-200 h-10 w-10 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-sm">{user?.username}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b p-4">
          <h1 className="text-xl font-bold">{title}</h1>
        </header>
        
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
        
        <footer className="bg-white p-4 border-t text-center text-sm text-gray-500">
          &copy; 2025 Moto Verse. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
