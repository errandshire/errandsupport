"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      
      const result = await forgotPassword(data.email);
      
      if (result.success) {
        setIsSubmitted(true);
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error(result.error?.message || "Failed to send reset email");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription className="text-sm sm:text-base px-2">
                We've sent a password reset link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  If you don't see the email in your inbox, please check your spam folder. 
                  The reset link will expire in 1 hour for security reasons.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => setIsSubmitted(false)}
                  variant="outline" 
                  className="w-full"
                >
                  Try Different Email
                </Button>
                
                <Button 
                  onClick={() => router.push("/login")}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold">Forgot Password?</CardTitle>
            <CardDescription className="text-sm sm:text-base px-2">
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                {...register("email")}
                type="email"
                label="Email Address"
                placeholder="Enter your email address"
                error={errors.email?.message}
                startIcon={<Mail className="h-4 w-4" />}
                disabled={isSubmitting || isLoading}
                required
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Reset Link
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link 
                  href="/login" 
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
