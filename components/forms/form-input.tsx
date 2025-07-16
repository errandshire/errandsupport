"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, startIcon, endIcon, required, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <Label htmlFor={props.id} className="text-sm font-medium text-neutral-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {startIcon}
            </div>
          )}
          <Input
            ref={ref}
            className={cn(
              "transition-colors duration-200",
              startIcon && "pl-10",
              endIcon && "pr-10",
              error && "border-red-500 focus:border-red-500 focus:ring-red-100",
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-x-1 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export { FormInput }; 