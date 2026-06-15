"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Suspense } from "react";

const resetPasswordSchema = z.object({
  otp: z.string().min(4, "Please enter the OTP code"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, forgotPassword } = useAuth();
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const email = searchParams.get("email") || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { otp: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!email) {
      toast.error("Email is missing. Please go back to forgot password.");
      return;
    }
    try {
      setIsLoading(true);
      const result = await resetPassword(email, data.otp, data.password);
      if (result.success) {
        setIsSuccess(true);
      } else {
        toast.error(result.error?.message || "Failed to reset password");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    try {
      setIsResending(true);
      await forgotPassword(email);
      toast.success("A new OTP has been sent to your email");
    } catch {
      toast.error("Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-2 text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold">Password Reset Successfully!</CardTitle>
              <CardDescription className="text-sm sm:text-base px-2">
                Your password has been updated. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => router.push("/login")} className="w-full">
                Sign In
              </Button>
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
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription className="text-sm sm:text-base px-2">
              Enter the OTP sent to <strong>{email}</strong> and your new password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                {...register("otp")}
                type="text"
                label="OTP Code"
                placeholder="Enter the OTP from your email"
                error={errors.otp?.message}
                disabled={isSubmitting || isLoading}
                required
              />

              <FormInput
                {...register("password")}
                type={showPassword ? "text" : "password"}
                label="New Password"
                placeholder="Enter your new password"
                error={errors.password?.message}
                startIcon={<Lock className="h-4 w-4" />}
                endIcon={
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                disabled={isSubmitting || isLoading}
                required
              />

              <FormInput
                {...register("confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm New Password"
                placeholder="Confirm your new password"
                error={errors.confirmPassword?.message}
                startIcon={<Lock className="h-4 w-4" />}
                endIcon={
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
                disabled={isSubmitting || isLoading}
                required
              />

              <Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </form>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the OTP?{" "}
                <button
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50"
                >
                  {isResending ? "Resending..." : "Resend OTP"}
                </button>
              </p>
              <p className="text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                  Back to Login
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
