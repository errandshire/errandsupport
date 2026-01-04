"use client";

import * as React from "react";
import { Edit3, Save, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSelect } from "./location-select";

interface EditableLocationFieldProps {
  label: string;
  stateValue?: string;
  cityValue?: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (state: string, city: string) => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}

export function EditableLocationField({
  label,
  stateValue = "",
  cityValue = "",
  isEditing,
  onEdit,
  onSave,
  onCancel,
  icon,
}: EditableLocationFieldProps) {
  const [tempState, setTempState] = React.useState(stateValue);
  const [tempCity, setTempCity] = React.useState(cityValue);

  React.useEffect(() => {
    setTempState(stateValue);
    setTempCity(cityValue);
  }, [stateValue, cityValue, isEditing]);

  const handleSave = () => {
    onSave(tempState, tempCity);
  };

  return (
    <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-neutral-50 transition-colors">
      <div className="flex items-start space-x-3 flex-1">
        {icon && <div className="text-neutral-500 mt-1">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-700 mb-2">{label}</p>
          {isEditing ? (
            <div className="space-y-4">
              <LocationSelect
                selectedState={tempState}
                selectedCity={tempCity}
                onStateChange={setTempState}
                onCityChange={setTempCity}
                stateLabel="State"
                cityLabel="City"
                disabled={false}
                className="max-w-md"
              />
            </div>
          ) : (
            <p className="text-neutral-900 mt-1">
              {stateValue && cityValue
                ? `${cityValue}, ${stateValue}`
                : stateValue
                ? stateValue
                : cityValue
                ? cityValue
                : "Not set"}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 ml-4">
        {isEditing ? (
          <>
            <Button size="sm" variant="ghost" onClick={handleSave}>
              <Save className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}





