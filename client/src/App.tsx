import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin-dashboard";
import DealerDashboard from "@/pages/dealer-dashboard";
import SalesDashboard from "@/pages/sales-dashboard-new";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider, useAuth } from "./hooks/use-auth";

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }
  
  if (user) {
    return <Redirect to={`/${user.role}`} />;
  }
  
  return <Redirect to="/auth" />;
}

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
      <Route path="/" component={HomeRedirect} />
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
