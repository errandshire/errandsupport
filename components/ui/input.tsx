import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-2 border-neutral-200 bg-white rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-100",
        filled: "border-2 border-transparent bg-neutral-100 rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary-100",
        outline: "border-2 border-primary-200 bg-transparent rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-100",
        minimal: "border-0 border-b-2 border-neutral-200 bg-transparent rounded-none px-0 py-2 text-sm focus-visible:border-primary-500",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-xl",
        default: "h-12 px-4 py-3 text-sm",
        lg: "h-14 px-6 text-base rounded-3xl",
      },
      state: {
        default: "",
        error: "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-100",
        success: "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-100",
        warning: "border-yellow-500 focus-visible:border-yellow-500 focus-visible:ring-yellow-100",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helper?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, state, label, error, helper, startIcon, endIcon, ...props }, ref) => {
    const inputState = error ? "error" : state;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {startIcon}
            </div>
          )}
          <input
            className={cn(
              inputVariants({ variant, size, state: inputState, className }),
              startIcon && "pl-10",
              endIcon && "pr-10"
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="mt-1 text-sm text-neutral-500">{helper}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
