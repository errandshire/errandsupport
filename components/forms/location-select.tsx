"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NIGERIAN_STATES, getCitiesByState } from "@/lib/data/locations";
import { cn } from "@/lib/utils";

export interface LocationSelectProps {
  selectedState?: string;
  selectedCity?: string;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  stateLabel?: string;
  cityLabel?: string;
  stateError?: string;
  cityError?: string;
  stateRequired?: boolean;
  cityRequired?: boolean;
  disabled?: boolean;
  className?: string;
  statePlaceholder?: string;
  cityPlaceholder?: string;
}

export function LocationSelect({
  selectedState,
  selectedCity,
  onStateChange,
  onCityChange,
  stateLabel = "State",
  cityLabel = "City",
  stateError,
  cityError,
  stateRequired = false,
  cityRequired = false,
  disabled = false,
  className,
  statePlaceholder = "Select state",
  cityPlaceholder = "Select city",
}: LocationSelectProps) {
  // Memoize available cities for performance
  const availableCities = React.useMemo(() => {
    if (!selectedState) return [];
    return getCitiesByState(selectedState);
  }, [selectedState]);

  // Update city selection when state changes
  React.useEffect(() => {
    if (selectedState && selectedCity) {
      // Validate that selected city belongs to selected state
      if (!availableCities.includes(selectedCity)) {
        onCityChange("");
      }
    } else if (!selectedState) {
      // Clear city if no state selected
      if (selectedCity) {
        onCityChange("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, availableCities]); // Only depend on state and cities, not callbacks

  return (
    <div className={cn("space-y-4", className)}>
      {/* State Select */}
      <div className="space-y-2">
        {stateLabel && (
          <Label className="text-sm font-medium text-neutral-700">
            {stateLabel}
            {stateRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Select
          value={selectedState || ""}
          onValueChange={onStateChange}
          disabled={disabled}
        >
          <SelectTrigger className={cn(stateError && "border-red-500")}>
            <SelectValue placeholder={statePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATES.map((state) => (
              <SelectItem key={state.code} value={state.name}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stateError && (
          <p className="text-sm text-red-500 mt-1">{stateError}</p>
        )}
      </div>

      {/* City Select */}
      <div className="space-y-2">
        {cityLabel && (
          <Label className="text-sm font-medium text-neutral-700">
            {cityLabel}
            {cityRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Select
          value={selectedCity || ""}
          onValueChange={onCityChange}
          disabled={disabled || !selectedState || availableCities.length === 0}
        >
          <SelectTrigger className={cn(cityError && "border-red-500")}>
            <SelectValue 
              placeholder={
                !selectedState 
                  ? "Select state first" 
                  : availableCities.length === 0
                  ? "No cities available"
                  : cityPlaceholder
              } 
            />
          </SelectTrigger>
          <SelectContent>
            {availableCities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {cityError && (
          <p className="text-sm text-red-500 mt-1">{cityError}</p>
        )}
        {selectedState && availableCities.length === 0 && (
          <p className="text-sm text-neutral-500 mt-1">
            No cities available for this state
          </p>
        )}
      </div>
    </div>
  );
}

