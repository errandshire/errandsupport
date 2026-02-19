"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface EscrowStepsProps {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
}

const steps = [
  { label: "Pay", shortLabel: "Pay" },
  { label: "Work Done", shortLabel: "Work" },
  { label: "You Confirm", shortLabel: "Confirm" },
  { label: "Worker Paid", shortLabel: "Paid" },
];

export function EscrowSteps({ currentStep, className }: EscrowStepsProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isFuture = stepNumber > currentStep;

          return (
            <React.Fragment key={step.label}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors border-2",
                    isCompleted && "bg-green-500 border-green-500 text-white",
                    isCurrent && "bg-blue-500 border-blue-500 text-white",
                    isFuture && "bg-gray-100 border-gray-300 text-gray-400"
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-[10px] sm:text-xs font-medium text-center leading-tight",
                    isCompleted && "text-green-600",
                    isCurrent && "text-blue-600",
                    isFuture && "text-gray-400"
                  )}
                >
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 sm:mx-2 mt-[-18px] sm:mt-[-22px]",
                    stepNumber < currentStep ? "bg-green-500" : "bg-gray-200"
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
