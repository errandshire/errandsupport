"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/forms/form-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { registerSchema, RegisterFormData } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { trackRegistration } from "@/lib/meta-pixel-events";

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

  // Handle role selection with toast notification
  const handleRoleChange = (role: "client" | "worker") => {
    setSelectedRole(role);
    const roleName = role === "worker" ? "Worker" : "Client";
    toast.success(`You're registering as a ${roleName}!`, {
      description: role === "worker" 
        ? "You'll be able to offer services and earn money"
        : "You'll be able to book services from trusted workers"
    });
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      // Show validation errors as toasts
      if (Object.keys(errors).length > 0) {
        Object.values(errors).forEach((error) => {
          if (error?.message) {
            toast.error(error.message);
          }
        });
        return;
      }

      const result = await registerUser(data);

      if (result.success) {
        // Track successful registration
        trackRegistration(data.role);

        // Redirect workers to onboarding, clients to login
        if (data.role === "worker") {
          router.push("/onboarding");
        } else {
          router.push("/login");
        }
      } else if (result.error) {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const roleOptions = [
    {
      value: "worker" as const,
      title: "Register as a Worker - I want to offer services",
      description: "Earn money by helping others with their daily tasks",
      features: ["Set your own rates", "Flexible schedule", "Get paid securely"],
    },
    {
      value: "client" as const,
      title: "Register as a Client - I need help with tasks",
      description: "Find trusted workers for your errands and daily tasks",
      features: ["Book services instantly", "Trusted verified workers", "Secure payments"],
    },
    
  ];

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
          <Card variant="elevated" className="shadow-hover">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-serif">Create Your Account</CardTitle>
              <CardDescription>
            Join thousands of users who trust us with their daily tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Role Selection */}
                <div className="space-y-3">
                {/* <Label className="text-base font-medium">I want to...</Label> */}
                <div className="grid grid-cols-1 gap-3">
                  {roleOptions.map((option) => (
                    <div key={option.value} className="relative">
                      <Label
                        htmlFor={option.value}
                        className={cn(
                            "flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                            "hover:border-[#86efac] hover:bg-[#f0fdf4]",
                          selectedRole === option.value
                              ? "border-[#22c55e] bg-[#f0fdf4]"
                            : "border-neutral-200 bg-white"
                        )}
                      >
                          <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              id={option.value}
                              checked={selectedRole === option.value}
                              onCheckedChange={() => handleRoleChange(option.value)}
                              className="mt-1"
                            />
                            <div>
                              <p className="text-bold text-neutral-900 text-md">{option.title}</p>
                              <h2 className="text-xs text-neutral-600">{option.description}</h2>
                            </div>
                          </div>
                        </div>
                        <ul className="space-y-1 ml-7">
                          {option.features.map((feature, index) => (
                              <li key={index} className="text-xs text-neutral-500 flex items-center">
                              <div className="w-1 h-1 bg-neutral-400 rounded-full mr-2" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  {...register("name")}
                  label="Full Name"
                  placeholder="John Doe"
                  error={errors.name?.message}
                  startIcon={<User className="h-4 w-4" />}
                  disabled={isSubmitting || loading}
                  required
                />
                <FormInput
                  {...register("phone")}
                  label="Phone Number"
                  // placeholder="+1 (555) 123-4567"
                  error={errors.phone?.message}
                  startIcon={<Phone className="h-4 w-4" />}
                  disabled={isSubmitting || loading}
                />
              </div>

              <FormInput
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
                <FormInput
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
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  disabled={isSubmitting || loading}
                  required
                />

                <FormInput
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
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  disabled={isSubmitting || loading}
                  required
                />
              </div>

              {/* Terms and Privacy */}
              <div className="text-sm text-neutral-600">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-700 font-medium">
                  Privacy Policy
                </Link>
                .
              </div>

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

            {/* Sign In Link */}
                <div className="text-center mt-4">
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
              </form>
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </>
  );
} 