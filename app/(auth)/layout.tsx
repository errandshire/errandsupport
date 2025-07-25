import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Errand Support Platform",
  description: "Sign in or create an account to access the Errand Support Platform",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      {children}
    </div>
  );
} 