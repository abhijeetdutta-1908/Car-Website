import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import DealerDashboard from "@/pages/dealer-dashboard";
import SalesDashboard from "@/pages/sales-dashboard";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <ProtectedRoute 
        path="/admin" 
        component={AdminDashboard} 
        allowedRoles={["admin"]} 
      />
      <ProtectedRoute 
        path="/dealer" 
        component={DealerDashboard} 
        allowedRoles={["dealer"]} 
      />
      <ProtectedRoute 
        path="/sales" 
        component={SalesDashboard} 
        allowedRoles={["sales"]} 
      />
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={() => {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting to dashboard...</p>
          </div>
        );
      }} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
