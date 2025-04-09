import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function YearSelector({ selectedYear, onYearChange }: YearSelectorProps) {
  // Generar un rango de años (últimos 5 años + año actual + próximo año)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  
  return (
    <Select 
      value={selectedYear.toString()} 
      onValueChange={(value) => onYearChange(parseInt(value))}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder={selectedYear.toString()} />
      </SelectTrigger>
      <SelectContent>
        {years.map(year => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
