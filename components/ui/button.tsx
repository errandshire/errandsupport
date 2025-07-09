import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default:
          "bg-green-500 text-white shadow-medium hover:bg-green-600 hover:shadow-hover active:bg-green-700 focus-visible:outline-ring",
        destructive:
          "bg-red-500 text-white shadow-medium hover:bg-red-600 hover:shadow-hover active:bg-red-700 focus-visible:outline-red-500",
        outline:
          "border-2 border-green-500 bg-transparent text-green-600 shadow-soft hover:bg-green-50 hover:shadow-medium active:bg-green-100 focus-visible:outline-ring",
        secondary:
          "bg-gray-100 text-gray-900 shadow-soft hover:bg-gray-200 hover:shadow-medium active:bg-gray-300 focus-visible:outline-gray-500",
        ghost:
          "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 focus-visible:outline-gray-500",
        link: "text-green-600 underline-offset-4 hover:underline hover:text-green-700 focus-visible:outline-ring",
        accent:
          "bg-blue-500 text-white shadow-medium hover:bg-blue-600 hover:shadow-hover active:bg-blue-700 focus-visible:outline-blue-500",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-xl gap-1.5",
        default: "h-10 px-4 py-2 text-sm",
        lg: "h-12 px-6 text-base rounded-3xl",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
