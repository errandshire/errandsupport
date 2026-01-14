"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetTime: Date | string; // Target end time
  onExpire?: () => void; // Callback when timer reaches zero
  className?: string;
  showIcon?: boolean;
}

export function CountdownTimer({
  targetTime,
  onExpire,
  className,
  showIcon = true
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = React.useState(0);

  React.useEffect(() => {
    const calculateRemaining = () => {
      const target = new Date(targetTime).getTime();
      const now = Date.now();
      return Math.max(0, target - now);
    };

    // Initial calculation
    setTimeRemaining(calculateRemaining());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, onExpire]);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = () => {
    if (timeRemaining < 300000) return "text-red-600 font-semibold"; // Less than 5 minutes
    if (timeRemaining < 600000) return "text-orange-500"; // 5-10 minutes
    return "text-neutral-600";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <Clock className={cn(
          "h-4 w-4",
          timeRemaining < 300000 ? "text-red-600" : "text-neutral-500"
        )} />
      )}
      <span className={cn("font-mono tabular-nums", getColorClass())}>
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
