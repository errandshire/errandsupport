"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BookingProgressTrackerProps {
  status: string;
  className?: string;
}

const progressSteps = [
  { key: "posted", label: "Posted", shortLabel: "Posted" },
  { key: "hired", label: "Hired", shortLabel: "Hired" },
  { key: "in_progress", label: "In Progress", shortLabel: "Active" },
  { key: "awaiting", label: "Awaiting Confirmation", shortLabel: "Confirm" },
  { key: "completed", label: "Completed", shortLabel: "Done" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "pending":
    case "confirmed":
      return 1; // Hired (payment confirmed = hired)
    case "accepted":
    case "in_progress":
      return 2; // In Progress (accept now auto-starts)
    case "worker_completed":
      return 3; // Awaiting Confirmation
    case "completed":
      return 4; // Completed
    case "cancelled":
    case "disputed":
      return -1; // Special states
    default:
      return 0; // Posted
  }
}

export function BookingProgressTracker({ status, className }: BookingProgressTrackerProps) {
  const activeIndex = getStepIndex(status);

  if (activeIndex === -1) {
    return null; // Don't show for cancelled/disputed
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {progressSteps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isCurrent = index === activeIndex;
          const isFuture = index > activeIndex;
          const isAwaiting = isCurrent && status === "worker_completed";

          return (
            <React.Fragment key={step.key}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    "w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-colors border-2",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && !isAwaiting && "bg-blue-500 border-blue-500 text-white",
                    isAwaiting && "bg-orange-500 border-orange-500 text-white animate-pulse",
                    isFuture && "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1 text-[9px] sm:text-[11px] font-medium text-center leading-tight max-w-[60px] sm:max-w-[80px]",
                    isCompleted && "text-green-600",
                    isCurrent && !isAwaiting && "text-blue-600",
                    isAwaiting && "text-orange-600 font-bold",
                    isFuture && "text-gray-400"
                  )}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </div>

              {/* Connector line */}
              {index < progressSteps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-0.5 sm:mx-1.5 mt-[-16px] sm:mt-[-20px]",
                    index < activeIndex ? "bg-green-500" : "bg-gray-200"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
