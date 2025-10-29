"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";

interface LoginFormProps {
  callbackUrl: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      console.log('Attempting login with:', { email, callbackUrl });
      
      // Use real authentication
      const result = await login({ email, password });
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful, redirecting to:', callbackUrl || '/dashboard');
        toast.success("Logged in successfully!");
        
        // Small delay to ensure auth state is set
        setTimeout(() => {
          router.replace(callbackUrl || '/dashboard');
        }, 100);
      } else {
        console.error('Login failed:', result.error);
        toast.error(result.error?.message || "Login failed");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="space-y-2 text-center pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription className="text-sm sm:text-base px-2">
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="worker@gmail.com"
                className="pl-10 h-11 text-base"
                required
                disabled={isLoading}
                autoComplete="email"
                autoCapitalize="none"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              {/* <Link 
                href="/forgot-password" 
                className="text-xs text-primary-600 hover:text-primary-500 transition-colors"
              >
                Forgot password?
              </Link> */}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 text-base"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            className="w-full h-11 text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </form>
        
        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or</span>
          </div>
        </div>
        
        {/* Forgot password link */}
        <div className="text-center">
          <Link
            href="/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            Forgot your password?
          </Link>
        </div>
        
        {/* Sign up link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 