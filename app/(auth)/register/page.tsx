"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, CheckCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { registerSchema, RegisterFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, loading } = useAuth();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<"client" | "worker">("client");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "client",
      phone: "",
    },
  });

  // Watch the role field to update state
  React.useEffect(() => {
    setValue("role", selectedRole);
  }, [selectedRole, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const result = await registerUser(data);
      
      if (result.success) {
        // Redirect to login page
        router.push("/login");
      } else if (result.error) {
        setError("root", { message: result.error.message });
      }
    } catch (error) {
      setError("root", { message: "An unexpected error occurred" });
    }
  };

  const roleOptions = [
    {
      value: "client" as const,
      title: "I need help with tasks",
      description: "Find trusted workers for your errands and daily tasks",
      features: ["Book services instantly", "Trusted verified workers", "Secure payments"],
    },
    {
      value: "worker" as const,
      title: "I want to offer services",
      description: "Earn money by helping others with their daily tasks",
      features: ["Set your own rates", "Flexible schedule", "Get paid securely"],
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white font-bold text-xl">
              E
            </div>
            <span className="text-2xl font-serif font-bold text-neutral-900">
              Errand Support
            </span>
          </Link>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-neutral-600">
            Join thousands of users who trust us with their daily tasks
          </p>
        </div>

        <Card variant="elevated" className="shadow-hover">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-serif text-center">Sign Up</CardTitle>
            <CardDescription className="text-center">
              Choose your account type and create your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">I want to...</Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setSelectedRole(value as "client" | "worker")}
                  className="grid grid-cols-1 gap-4"
                >
                  {roleOptions.map((option) => (
                    <div key={option.value} className="relative">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className={cn(
                          "flex flex-col p-6 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                          "hover:border-primary-300 hover:bg-primary-50",
                          selectedRole === option.value
                            ? "border-primary-500 bg-primary-50"
                            : "border-neutral-200 bg-white"
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-neutral-900 mb-1">
                              {option.title}
                            </h3>
                            <p className="text-sm text-neutral-600">
                              {option.description}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                              selectedRole === option.value
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-neutral-300 bg-white"
                            )}
                          >
                            {selectedRole === option.value && (
                              <Circle className="w-4 h-4 text-white fill-white" />
                            )}
                          </div>
                        </div>
                        <ul className="space-y-1">
                          {option.features.map((feature, index) => (
                            <li
                              key={index}
                              className="text-xs text-neutral-500 flex items-center"
                            >
                              <div className="w-1 h-1 bg-neutral-400 rounded-full mr-2" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  {...register("name")}
                  label="Full Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  startIcon={<User className="h-4 w-4" />}
                  disabled={isSubmitting || loading}
                  required
                />
                <Input
                  {...register("phone")}
                  label="Phone Number"
                  placeholder="+1 (555) 123-4567"
                  error={errors.phone?.message}
                  startIcon={<Phone className="h-4 w-4" />}
                  disabled={isSubmitting || loading}
                />
              </div>

              <Input
                {...register("email")}
                type="email"
                label="Email Address"
                placeholder="john@example.com"
                error={errors.email?.message}
                startIcon={<Mail className="h-4 w-4" />}
                disabled={isSubmitting || loading}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  label="Password"
                  placeholder="Create a strong password"
                  error={errors.password?.message}
                  startIcon={<Lock className="h-4 w-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-neutral-500 hover:text-neutral-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  disabled={isSubmitting || loading}
                  required
                />

                <Input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  startIcon={<Lock className="h-4 w-4" />}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-neutral-500 hover:text-neutral-700 transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                  disabled={isSubmitting || loading}
                  required
                />
              </div>

              {/* Terms and Privacy */}
              <div className="text-sm text-neutral-600">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </Link>
                .
              </div>

              {/* Error Message */}
              {errors.root && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.root.message}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || loading}
              >
                {isSubmitting || loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-neutral-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Help Links */}
        <div className="text-center mt-8 space-x-4 text-sm text-neutral-500">
          <Link href="/help" className="hover:text-neutral-700 transition-colors">
            Help Center
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-neutral-700 transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-neutral-700 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
} 