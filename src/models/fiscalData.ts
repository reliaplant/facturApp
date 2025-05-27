/**
 * Model to represent monthly tax data from income/expense tables
 */

export interface YearTaxData {
  year: number;
  clientId?: string;  // Add clientId for reference
  // Change months from array to an object where keys are month strings
  months: Record<string, MonthlyTaxData>;
  lastUpdated?: string; // Add lastUpdated timestamp
}

export interface MonthlyTaxData {
  // Month number no longer needed as it's the key in the Record
  // Income tax fields
  isrGravado?: number;     // ISR taxable amount
  isrRetenido?: number;    // ISR retained amount
  ivaTrasladado?: number;  // IVA transferred 
  ivaRetenido?: number;    // IVA withheld
  // Expense tax fields
  isrDeducible?: number;   // ISR deductible amount
  ivaDeducible?: number;   // IVA deductible amount
  exento?: number;         // Exempt amounts
  // Make all fields optional to allow partial updates
}

