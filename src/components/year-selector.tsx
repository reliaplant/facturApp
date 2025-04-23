"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  size?: "default" | "sm" | "xs"; // Add size prop
}

export function YearSelector({ 
  selectedYear, 
  onYearChange, 
  size = "default" // Default to "default" size
}: YearSelectorProps) {
  // Generate years from 2010 to current year + 1
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 2 }, (_, i) => currentYear + 1 - i);

  return (
    <Select
      value={selectedYear.toString()}
      onValueChange={(value) => onYearChange(parseInt(value))}
    >
      <SelectTrigger className="w-[90px]" size={size}>
        <SelectValue placeholder={selectedYear.toString()} />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
