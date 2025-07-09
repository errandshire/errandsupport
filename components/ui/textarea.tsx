import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex min-h-[80px] w-full transition-all duration-200 resize-none placeholder:text-neutral-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-2 border-neutral-200 bg-white rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-100",
        filled: "border-2 border-transparent bg-neutral-100 rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary-100",
        outline: "border-2 border-primary-200 bg-transparent rounded-2xl px-4 py-3 text-sm focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-100",
      },
      size: {
        sm: "min-h-[60px] px-3 py-2 text-xs rounded-xl",
        default: "min-h-[80px] px-4 py-3 text-sm",
        lg: "min-h-[120px] px-6 py-4 text-base rounded-3xl",
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

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helper?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, size, state, label, error, helper, ...props }, ref) => {
    const textareaState = error ? "error" : state;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          className={cn(
            textareaVariants({ variant, size, state: textareaState, className })
          )}
          ref={ref}
          {...props}
        />
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
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants }; 