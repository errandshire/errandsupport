"use client";

import * as React from "react";
import { X, Filter, MapPin, Star, CheckCircle, Sliders, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchFilters } from "@/lib/types/marketplace";
import { getMainCategories } from "@/lib/data/categories";
import { cn } from "@/lib/utils";

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-900 hover:text-green-600 transition-colors"
      >
        {title}
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}

function FilterContent({ filters, onFiltersChange, onClearFilters }: Omit<FilterSidebarProps, "className">) {
  const categories = getMainCategories();
  const [priceRange, setPriceRange] = React.useState([
    filters.priceRange?.min || 1000,
    filters.priceRange?.max || 10000
  ]);

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const currentCategory = filters.category;
    if (checked) {
      onFiltersChange({ ...filters, category: categoryId });
    } else if (currentCategory === categoryId) {
      onFiltersChange({ ...filters, category: undefined });
    }
  };

  const handlePriceRangeChange = (values: number[]) => {
    setPriceRange(values);
    onFiltersChange({
      ...filters,
      priceRange: { min: values[0], max: values[1] }
    });
  };

  const handleLocationChange = (field: string, value: string) => {
    onFiltersChange({
      ...filters,
      location: {
        ...filters.location,
        [field]: value
      }
    });
  };

  const handleRatingChange = (rating: number) => {
    onFiltersChange({
      ...filters,
      rating: { min: rating }
    });
  };

  const handleVerifiedChange = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      verified: checked || undefined
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('_');
    onFiltersChange({
      ...filters,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc'
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceRange) count++;
    if (filters.rating) count++;
    if (filters.location?.city) count++;
    if (filters.verified) count++;
    return count;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveFiltersCount()}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-gray-500 hover:text-gray-700"
        >
          Clear All
        </Button>
      </div>

      {/* Filters Content */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {/* Sort By */}
        <FilterSection title="Sort By">
          <Select 
            value={`${filters.sortBy || 'rating'}_${filters.sortOrder || 'desc'}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating_desc">Highest Rated</SelectItem>
              <SelectItem value="rating_asc">Lowest Rated</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="reviews_desc">Most Reviews</SelectItem>
              <SelectItem value="response_time_asc">Fastest Response</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>

        <Separator />

        {/* Categories */}
        <FilterSection title="Categories">
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={filters.category === category.id}
                  onCheckedChange={(checked) => 
                    handleCategoryChange(category.id, checked as boolean)
                  }
                />
                <Label 
                  htmlFor={category.id}
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Price Range */}
        <FilterSection title="Price Range (₦/hour)">
          <div className="space-y-4">
            <Slider
              value={priceRange}
              onValueChange={handlePriceRangeChange}
              max={10000}
              min={1000}
              step={500}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>₦{priceRange[0].toLocaleString()}</span>
              <span>₦{priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Rating */}
        <FilterSection title="Minimum Rating">
          <div className="space-y-2">
            {[5, 4, 3, 2].map((rating) => (
              <div key={rating} className="flex items-center space-x-2">
                <Checkbox
                  id={`rating-${rating}`}
                  checked={filters.rating?.min === rating}
                  onCheckedChange={(checked) => 
                    checked ? handleRatingChange(rating) : onFiltersChange({ ...filters, rating: undefined })
                  }
                />
                <Label 
                  htmlFor={`rating-${rating}`}
                  className="flex items-center space-x-1 cursor-pointer"
                >
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < rating ? "text-yellow-400 fill-current" : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-700">& up</span>
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Location */}
        <FilterSection title="Location">
          <div className="space-y-3">
            <div>
              <Label htmlFor="city" className="text-sm font-medium text-gray-700">City</Label>
              <Input
                id="city"
                placeholder="Enter city..."
                value={filters.location?.city || ""}
                onChange={(e) => handleLocationChange("city", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="radius" className="text-sm font-medium text-gray-700">
                Radius: {filters.location?.radius || 25} km
              </Label>
              <Slider
                value={[filters.location?.radius || 25]}
                onValueChange={(values) => handleLocationChange("radius", values[0].toString())}
                max={100}
                min={5}
                step={5}
                className="mt-2"
              />
            </div>
          </div>
        </FilterSection>

        <Separator />

        {/* Verification */}
        <FilterSection title="Verification">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="verified"
              checked={filters.verified || false}
              onCheckedChange={handleVerifiedChange}
            />
            <Label htmlFor="verified" className="flex items-center space-x-2 cursor-pointer">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-700">Verified Workers Only</span>
            </Label>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}

export function FilterSidebar({ filters, onFiltersChange, onClearFilters, className }: FilterSidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn("hidden lg:block w-80 h-full", className)}>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 h-full">
          <FilterContent 
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={onClearFilters}
          />
        </div>
      </div>

      {/* Mobile Filter Button & Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center space-x-2">
              <Sliders className="h-4 w-4" />
              <span>Filters</span>
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-6 border-b">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="p-6 h-full overflow-y-auto">
              <FilterContent 
                filters={filters}
                onFiltersChange={onFiltersChange}
                onClearFilters={onClearFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
} 