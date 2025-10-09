"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { PasswordService } from "@/lib/password-service";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = React.useMemo(() => {
    return PasswordService.getPasswordStrength(password);
  }, [password]);

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password Strength</span>
          <span className={cn("font-medium", strength.color)}>
            {strength.label}
          </span>
        </div>
        <Progress 
          value={(strength.score / 5) * 100} 
          className="h-2"
        />
      </div>

      {/* Requirements */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Requirements:</p>
        <div className="space-y-1">
          <RequirementItem
            met={strength.requirements.length}
            text="At least 8 characters"
          />
          <RequirementItem
            met={strength.requirements.uppercase}
            text="One uppercase letter"
          />
          <RequirementItem
            met={strength.requirements.lowercase}
            text="One lowercase letter"
          />
          <RequirementItem
            met={strength.requirements.number}
            text="One number"
          />
          <RequirementItem
            met={strength.requirements.special}
            text="One special character"
          />
        </div>
      </div>
    </div>
  );
}

interface RequirementItemProps {
  met: boolean;
  text: string;
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      {met ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-gray-400" />
      )}
      <span className={cn(
        met ? "text-green-700" : "text-gray-500"
      )}>
        {text}
      </span>
    </div>
  );
}
