import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RoleSelector } from "@/components/ui/role-selector";
import { Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InsertUser, UserRole } from "@shared/schema";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  role: z.enum([UserRole.ADMIN, UserRole.DEALER, UserRole.SALES]),
});
type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  role: z.enum([UserRole.ADMIN, UserRole.DEALER, UserRole.SALES]),
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  // Setup login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      role: UserRole.ADMIN,
    },
  });

  // Setup registration form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: UserRole.ADMIN,
      terms: false,
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  // Handle registration form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    const { confirmPassword, terms, ...userData } = data;
    registerMutation.mutate(userData as InsertUser);
  };

  return (
    <div className="bg-gray-50 font-sans text-gray-800 min-h-screen flex items-center justify-center p-4">
      <main className="w-full max-w-md">
        {/* App Logo/Branding */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-primary-600 flex items-center justify-center">
            <Shield className="mr-2 h-6 w-6" />
            SecureAuth
          </h1>
          <p className="text-gray-600 mt-2">Role-based authentication system</p>
        </div>

        {/* Login Form */}
        <Card className={`mb-4 ${activeTab === "login" ? "" : "hidden"}`}>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

            {/* Success/Error Messages */}
            {loginMutation.isError && (
              <div className="mb-4 text-red-600 text-center font-medium">
                {loginMutation.error.message}
              </div>
            )}

            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              {/* Email Input */}
              <div>
                <Label htmlFor="loginEmail">Email Address</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  placeholder="youremail@example.com"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-600 text-xs mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="loginPassword">Password</Label>
                  <a href="#" className="text-xs text-primary-600 hover:text-primary-500">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder="••••••••"
                  {...loginForm.register("password")}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-red-600 text-xs mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <RoleSelector
                name="login"
                selectedRole={loginForm.watch("role")}
                onChange={(role) => loginForm.setValue("role", role as UserRole)}
                error={loginForm.formState.errors.role?.message}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>

              {/* Register Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account?</span>
                <Button
                  variant="link"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                  onClick={() => setActiveTab("register")}
                >
                  Create account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className={`mb-4 ${activeTab === "register" ? "" : "hidden"}`}>
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>

            {/* Success/Error Messages */}
            {registerMutation.isError && (
              <div className="mb-4 text-red-600 text-center font-medium">
                {registerMutation.error.message}
              </div>
            )}

            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              {/* Username Input */}
              <div>
                <Label htmlFor="registerUsername">Username</Label>
                <Input
                  id="registerUsername"
                  type="text"
                  placeholder="johndoe"
                  {...registerForm.register("username")}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-red-600 text-xs mt-1">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Email Input */}
              <div>
                <Label htmlFor="registerEmail">Email Address</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  placeholder="youremail@example.com"
                  {...registerForm.register("email")}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-red-600 text-xs mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <Label htmlFor="registerPassword">Password</Label>
                <Input
                  id="registerPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerForm.register("password")}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-red-600 text-xs mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Password must be at least 8 characters long
                </p>
              </div>

              {/* Confirm Password Input */}
              <div>
                <Label htmlFor="registerConfirmPassword">Confirm Password</Label>
                <Input
                  id="registerConfirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...registerForm.register("confirmPassword")}
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-red-600 text-xs mt-1">
                    {registerForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <RoleSelector
                name="register"
                selectedRole={registerForm.watch("role")}
                onChange={(role) => registerForm.setValue("role", role as UserRole)}
                error={registerForm.formState.errors.role?.message}
              />

              {/* Terms & Conditions */}
              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    {...registerForm.register("terms")}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="terms"
                      className="text-sm text-gray-600"
                    >
                      I agree to the{" "}
                      <a
                        href="#"
                        className="text-primary-600 hover:text-primary-500"
                      >
                        Terms and Conditions
                      </a>
                    </Label>
                  </div>
                </div>
                {registerForm.formState.errors.terms && (
                  <p className="text-red-600 text-xs mt-1">
                    {registerForm.formState.errors.terms.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Creating Account..." : "Create Account"}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Already have an account?</span>
                <Button
                  variant="link"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                  onClick={() => setActiveTab("login")}
                >
                  Sign in
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer Information */}
        <footer className="text-center text-gray-500 text-xs mt-8">
          <p>&copy; 2023 SecureAuth. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
