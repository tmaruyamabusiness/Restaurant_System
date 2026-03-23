"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants: Record<string, string> = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
      ghost: "bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-400",
      outline: "border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400",
    };

    const sizes: Record<string, string> = {
      sm: "px-3 py-1.5 text-sm min-h-[36px]",
      md: "px-4 py-2 text-sm min-h-[44px]",
      lg: "px-6 py-3 text-base min-h-[52px]",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
