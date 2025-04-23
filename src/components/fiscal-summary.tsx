import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { TaxBracketsService, TaxBracket } from "@/services/tax-brackets-service"; 

// Simplified interface for fiscal data - focusing only on key metrics
export interface MonthlyFiscalData {
  month: number;
  // Core metrics
  incomeAmount: number;  // Based on gravadoISR 
  expenseAmount: number; // Based on gravadoISR
  ivaCollected: number;  // Based on gravadoIVA
  ivaPaid: number;       // Based on gravadoIVA
  ivaRetenido: number;   // IVA retenido - add this property
  // Calculated metrics
  profit: number;        // Income - Expenses
  
  // Accumulated values
  periodIncomesTotal: number;
  periodExpensesTotal: number;
  periodProfit: number;
}

interface FiscalSummaryProps {
  year: number;
  clientId: string;
  invoices: Invoice[];
  onGenerateDeclaration?: (monthData: MonthlyFiscalData) => void;
}

export function FiscalSummary({ year, clientId, invoices = [], onGenerateDeclaration }: FiscalSummaryProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  // Reference date data
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyFiscalData[]>([]);
  const [monthlyDepreciations, setMonthlyDepreciations] = useState<Record<number, number>>({});
  const fixedAssetService = new FixedAssetService();
  
  // Add state for tax brackets
  const [taxBracketsByMonth, setTaxBracketsByMonth] = useState<Record<number, TaxBracket[]>>({});
  
  // Load depreciation data
  useEffect(() => {
    const loadDepreciations = async () => {
      try {
        const depreciationsByMonth: Record<number, number> = {};
        
        // For each month, get all relevant depreciations
        for (let month = 0; month < 12; month++) {
          const monthStr = String(month + 1).padStart(2, '0');
          const startDate = `${year}-${monthStr}`;
          const endDate = `${year}-${monthStr}`;
          
          try {
            const depreciation = await fixedAssetService.getTotalMonthlyDepreciation(
              clientId,
              startDate,
              endDate
            );
            
            depreciationsByMonth[month] = depreciation;
          } catch (error) {
            depreciationsByMonth[month] = 0;
          }
        }
        
        setMonthlyDepreciations(depreciationsByMonth);
      } catch (error) {
        // Set defaults if there's an error
        const emptyDepreciations: Record<number, number> = {};
        for (let i = 0; i < 12; i++) {
          emptyDepreciations[i] = 0;
        }
        setMonthlyDepreciations(emptyDepreciations);
      }
    };
    
    if (clientId) {
      loadDepreciations();
    }
  }, [year, clientId]);
  
  // Load tax brackets
  useEffect(() => {
    const brackets: Record<number, TaxBracket[]> = {};
    for (let month = 1; month <= 12; month++) {
      brackets[month] = TaxBracketsService.getTaxBracketsByMonth(month);
    }
    setTaxBracketsByMonth(brackets);
  }, []);
  
  // Filter invoices for the current year
  const yearInvoices = useMemo(() => {
    return invoices.filter(
      inv => new Date(inv.fecha).getFullYear() === year && !inv.estaCancelado
    );
  }, [invoices, year]);

  // Split invoices into income and expense
  const { incomeInvoices, expenseInvoices } = useMemo(() => {
    return {
      incomeInvoices: yearInvoices.filter(inv => !inv.recibida),
      expenseInvoices: yearInvoices.filter(inv => inv.recibida)
    };
  }, [yearInvoices]);
  
  // Calculate monthly fiscal data
  useEffect(() => {
    const calculatedMonthlyData = months.map(month => {
      return calculateMonthlyData(month, incomeInvoices, expenseInvoices, monthlyDepreciations);
    });
    setMonthlyData(calculatedMonthlyData);
  }, [incomeInvoices, expenseInvoices, monthlyDepreciations]);
  
  // Simplified calculation function - focuses only on essential metrics
  const calculateMonthlyData = (
    month: number, 
    incomeInvoices: Invoice[], 
    expenseInvoices: Invoice[],
    depreciations: Record<number, number>
  ): MonthlyFiscalData => {
    // IMPORTANT: We compare mesDeduccion with (month+1) because mesDeduccion uses 1-based months (1-12)
    // while our month parameter is 0-based (0-11)
    
    // ------- Monthly calculations -------
    
    // Filter income invoices for this month using mesDeduccion=month+1
    const monthIncomeInvoices = incomeInvoices.filter(inv => 
      inv.mesDeduccion === month + 1 && inv.esDeducible && !inv.estaCancelado
    );
    
    // Filter expense invoices for this month using mesDeduccion=month+1
    const monthExpenseInvoices = expenseInvoices.filter(inv => 
      inv.mesDeduccion === month + 1 && inv.esDeducible && !inv.estaCancelado
    );
    
    // Calculate income amount using gravadoISR (or fallback to subTotal)
    const incomeAmount = monthIncomeInvoices.reduce((sum, inv) => 
      sum + (inv.gravadoISR || inv.subTotal || 0), 0);
    
    // Calculate expense amount using gravadoISR (or fallback to subTotal)
    const expenseAmount = monthExpenseInvoices.reduce((sum, inv) => 
      sum + (inv.gravadoISR || inv.subTotal || 0), 0);
    
    // Calculate IVA collected using gravadoIVA (or fallback to impuestoTrasladado)
    const ivaCollected = monthIncomeInvoices.reduce((sum, inv) => 
      sum + (inv.gravadoIVA || inv.impuestoTrasladado || 0), 0);
    
    // Calculate IVA paid using gravadoIVA (or fallback to impuestoTrasladado)
    const ivaPaid = monthExpenseInvoices.reduce((sum, inv) => 
      sum + (inv.gravadoIVA || inv.impuestoTrasladado || 0), 0);
    
    // Calculate IVA retenido - from income invoices
    const ivaRetenido = monthIncomeInvoices.reduce((sum, inv) => 
      sum + (inv.ivaRetenido || 0), 0);
    
    // Get depreciation value for this month
    const depreciation = depreciations[month] || 0;
    
    // Calculate profit
    const profit = incomeAmount - expenseAmount - depreciation;
    
    // ------- Accumulated calculations -------
    
    // Calculate income and expenses for all months up to and including current month
    let periodIncomesTotal = 0;
    let periodExpensesTotal = 0;
    let totalDepreciation = 0;
    
    // Loop through all months up to current month
    for (let i = 0; i <= month; i++) {
      // Filter income invoices with mesDeduccion=i+1
      const periodIncomeInvoices = incomeInvoices.filter(inv => 
        inv.mesDeduccion === i + 1 && inv.esDeducible && !inv.estaCancelado
      );
      
      // Filter expense invoices with mesDeduccion=i+1
      const periodExpenseInvoices = expenseInvoices.filter(inv => 
        inv.mesDeduccion === i + 1 && inv.esDeducible && !inv.estaCancelado
      );
      
      // Accumulate incomes using gravadoISR
      periodIncomesTotal += periodIncomeInvoices.reduce((sum, inv) => 
        sum + (inv.gravadoISR || inv.subTotal || 0), 0);
      
      // Accumulate expenses using gravadoISR
      periodExpensesTotal += periodExpenseInvoices.reduce((sum, inv) => 
        sum + (inv.gravadoISR || inv.subTotal || 0), 0);
      
      // Accumulate depreciation
      totalDepreciation += depreciations[i] || 0;
    }
    
    // Include accumulated depreciation in total expenses
    periodExpensesTotal += totalDepreciation;
    
    // Calculate accumulated profit
    const periodProfit = periodIncomesTotal - periodExpensesTotal;
    
    return {
      month,
      incomeAmount,
      expenseAmount,
      ivaCollected,
      ivaPaid,
      ivaRetenido, // Add this property
      profit,
      periodIncomesTotal,
      periodExpensesTotal,
      periodProfit
    };
  };
  
  // Calculate ISR for a specific month
  const calculateMonthISR = (month: number, amount: number) => {
    try {
      if (amount <= 0) return { 
        taxBase: 0,
        lowerLimit: 0,
        excess: 0,
        percentage: 0,
        marginalTax: 0,
        fixedFee: 0,
        totalTax: 0
      };
      
      // Find the applicable bracket
      const brackets = taxBracketsByMonth[month + 1] || [];
      const bracket = brackets.find(b => 
        amount >= b.lowerLimit && amount <= b.upperLimit
      );
      
      if (!bracket) return { 
        taxBase: amount,
        lowerLimit: 0,
        excess: 0,
        percentage: 0,
        marginalTax: 0,
        fixedFee: 0,
        totalTax: 0
      };
      
      // Calculate ISR components
      const excess = amount - bracket.lowerLimit;
      const marginalTax = excess * bracket.percentage;
      const totalTax = bracket.fixedFee + marginalTax;
      
      return {
        taxBase: amount,
        lowerLimit: bracket.lowerLimit,
        excess,
        percentage: bracket.percentage * 100,
        marginalTax,
        fixedFee: bracket.fixedFee,
        totalTax
      };
    } catch (error) {
      console.error('Error calculating ISR:', error);
      return { 
        taxBase: 0,
        lowerLimit: 0,
        excess: 0,
        percentage: 0,
        marginalTax: 0,
        fixedFee: 0,
        totalTax: 0
      };
    }
  };
  
  // Calculate retained ISR for a month
  const getMonthlyRetainedISR = (month: number) => {
    const monthNumber = month + 1;
    return incomeInvoices
      .filter(inv => 
        inv.mesDeduccion === monthNumber && 
        inv.esDeducible && 
        !inv.estaCancelado
      )
      .reduce((sum, inv) => sum + (inv.isrRetenido || 0), 0);
  };
  
  // Calculate accumulated retained ISR up to a month
  const getAccumulatedRetainedISR = (month: number) => {
    let total = 0;
    for (let i = 0; i <= month; i++) {
      total += getMonthlyRetainedISR(i);
    }
    return total;
  };
  
  const handleGenerateDeclaration = () => {
    if (onGenerateDeclaration && monthlyData[selectedMonth]) {
      onGenerateDeclaration(monthlyData[selectedMonth]);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Get month name in Spanish
  const getMonthName = (month: number) => {
    return format(new Date(year, month), 'MMMM', { locale: es });
  };

  // Get month abbreviation
  const getMonthAbbreviation = (month: number) => {
    return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month] || '';
  };

  // Determine cell style based on month and value
  const getCellStyle = (month: number, value: number) => {
    if (year > currentYear) {
      return "bg-gray-100 text-gray-400"; // Future year
    } else if (year < currentYear) {
      return value === 0 ? "text-gray-400" : ""; // Past year, gray for zero values
    }
    
    // For current year
    if (month > currentMonth) {
      return "bg-gray-100 text-gray-400"; // Future months
    } else if (month === currentMonth) {
      return `bg-sky-100 ${value === 0 ? "text-gray-400" : ""}`; // Current month
    } else {
      return value === 0 ? "text-gray-400" : ""; // Past months
    }
  };

  // Calculate annual totals for badge display
  const annualTotals = useMemo(() => {
    const income = monthlyData.reduce((sum, data) => sum + data.incomeAmount, 0);
    const expenses = monthlyData.reduce((sum, data) => sum + data.expenseAmount, 0);
    const profit = monthlyData.reduce((sum, data) => sum + data.profit, 0);
    
    return { income, expenses, profit };
  }, [monthlyData]);

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Cédula Fiscal {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Ingreso: {formatCurrency(annualTotals.income)}
            </Badge>
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Gastos: {formatCurrency(annualTotals.expenses)}
            </Badge>
            <Badge variant="outline" className={`text-sm py-0.5 whitespace-nowrap ${
              annualTotals.profit < 0 ? 'text-red-500' : 'text-green-600'
            }`}>
              Utilidad: {formatCurrency(annualTotals.profit)}
            </Badge>
            
            {onGenerateDeclaration && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateDeclaration}
                className="text-xs"
              >
                Generar Declaración
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left w-[250px]">Concepto</th>
                  {months.map(month => (
                    <th 
                      key={month} 
                      className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center"
                    >
                      {getMonthAbbreviation(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="mt-1">
                {/* INGRESOS SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">INGRESOS</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Ingresos del mes</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.incomeAmount || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Ingresos acumulados</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.periodIncomesTotal || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                
                {/* DEDUCCIONES SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">DEDUCCIONES</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Deducciones del mes</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.expenseAmount || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Depreciación mensual</td>
                  {months.map(month => {
                    const value = monthlyDepreciations[month] || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Total deducciones del periodo</td>
                  {months.map(month => {
                    const expenseValue = monthlyData[month]?.expenseAmount || 0;
                    const depreciationValue = monthlyDepreciations[month] || 0;
                    const totalValue = expenseValue + depreciationValue;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${getCellStyle(month, totalValue)}`}
                      >
                        {formatCurrency(totalValue)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Deducciones acumuladas</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.periodExpensesTotal || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                
                {/* UTILIDAD SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">UTILIDAD</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Utilidad del mes</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.profit || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)} ${value < 0 ? 'text-red-500' : value > 0 ? 'text-green-600' : ''}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Utilidad acumulada</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.periodProfit || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${getCellStyle(month, value)} ${value < 0 ? 'text-red-500' : value > 0 ? 'text-green-600' : ''}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                
                {/* IVA SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">IVA</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">IVA Cobrado</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.ivaCollected || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">IVA Pagado</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.ivaPaid || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">IVA Retenido</td>
                  {months.map(month => {
                    const value = monthlyData[month]?.ivaRetenido || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">IVA por Pagar</td>
                  {months.map(month => {
                    // Consider IVA retenido in the calculation
                    const collected = monthlyData[month]?.ivaCollected || 0;
                    const paid = monthlyData[month]?.ivaPaid || 0;
                    const retenido = monthlyData[month]?.ivaRetenido || 0;
                    // IVA por pagar = IVA Collected - IVA Paid - IVA Retenido (if positive)
                    const value = Math.max(0, collected - paid - retenido);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${value > 0 ? 'text-red-500' : ''} ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">IVA a Favor</td>
                  {months.map(month => {
                    // Consider IVA retenido in the calculation
                    const collected = monthlyData[month]?.ivaCollected || 0;
                    const paid = monthlyData[month]?.ivaPaid || 0;
                    const retenido = monthlyData[month]?.ivaRetenido || 0;
                    // IVA Diff = IVA Collected - IVA Paid - IVA Retenido
                    const ivaDiff = collected - paid - retenido;
                    // If negative, it's IVA a favor (absolute value)
                    const value = ivaDiff < 0 ? Math.abs(ivaDiff) : 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${value > 0 ? 'text-green-600' : ''} ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                
                {/* ISR SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">ISR (IMPUESTO SOBRE LA RENTA)</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Base del Impuesto</td>
                  {months.map(month => {
                    // Use periodProfit (utilidad acumulada) instead of periodIncomesTotal
                    const value = monthlyData[month]?.periodProfit || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, value)}`}
                      >
                        {formatCurrency(value)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Límite inferior</td>
                  {months.map(month => {
                    // Use periodProfit instead of periodIncomesTotal for all ISR calculations
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, isrCalc.lowerLimit)}`}
                      >
                        {formatCurrency(isrCalc.lowerLimit)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Excedente del límite inferior</td>
                  {months.map(month => {
                    // Update all ISR calculations to use periodProfit
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, isrCalc.excess)}`}
                      >
                        {formatCurrency(isrCalc.excess)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Porcentaje sobre excedente</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, isrCalc.percentage)}`}
                      >
                        {isrCalc.percentage.toFixed(2)}%
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Impuesto Marginal</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, isrCalc.marginalTax)}`}
                      >
                        {formatCurrency(isrCalc.marginalTax)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Cuota Fija</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, isrCalc.fixedFee)}`}
                      >
                        {formatCurrency(isrCalc.fixedFee)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Impuestos Art. 113</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${getCellStyle(month, isrCalc.totalTax)}`}
                      >
                        {formatCurrency(isrCalc.totalTax)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Pagos provisionales anteriores en el periodo</td>
                  {months.map(month => {
                    // For first month, there are no previous payments
                    if (month === 0) {
                      return (
                        <td 
                          key={month} 
                          className={`px-2 py-1 align-middle text-center ${getCellStyle(month, 0)}`}
                        >
                          {formatCurrency(0)}
                        </td>
                      );
                    }
                    
                    // For other months, sum up the ISR charges from previous months
                    let previousPayments = 0;
                    for (let i = 0; i < month; i++) {
                      const prevIncome = monthlyData[i]?.periodProfit || 0;
                      const prevIsrCalc = calculateMonthISR(i, prevIncome);
                      const prevRetentions = getAccumulatedRetainedISR(i);
                      const prevIsrCharge = Math.max(0, prevIsrCalc.totalTax - prevRetentions);
                      previousPayments += prevIsrCharge;
                    }
                    
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, previousPayments)}`}
                      >
                        {formatCurrency(previousPayments)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Retenciones del periodo</td>
                  {months.map(month => {
                    const retentions = getMonthlyRetainedISR(month);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, retentions)}`}
                      >
                        {formatCurrency(retentions)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Retenciones acumuladas</td>
                  {months.map(month => {
                    const accRetentions = getAccumulatedRetainedISR(month);
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, accRetentions)}`}
                      >
                        {formatCurrency(accRetentions)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">ISR a Cargo</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    const accRetentions = getAccumulatedRetainedISR(month);
                    
                    // Calculate previous payments for this month
                    let previousPayments = 0;
                    for (let i = 0; i < month; i++) {
                      const prevIncome = monthlyData[i]?.periodProfit || 0;
                      const prevIsrCalc = calculateMonthISR(i, prevIncome);
                      const prevRetentions = getAccumulatedRetainedISR(i);
                      const prevIsrCharge = Math.max(0, prevIsrCalc.totalTax - prevRetentions - 
                        (i > 0 ? previousPayments : 0)); // Only consider previous months' payments
                      previousPayments += prevIsrCharge;
                    }
                    
                    // Calculate ISR to pay considering both retentions and previous payments
                    const isrCharge = Math.max(0, isrCalc.totalTax - accRetentions - previousPayments);
                    
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium text-red-500 ${getCellStyle(month, isrCharge)}`}
                      >
                        {formatCurrency(isrCharge)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Impuesto por pagar</td>
                  {months.map(month => {
                    const income = monthlyData[month]?.periodProfit || 0;
                    const isrCalc = calculateMonthISR(month, income);
                    const accRetentions = getAccumulatedRetainedISR(month);
                    
                    // Calculate previous payments (same as above)
                    let previousPayments = 0;
                    for (let i = 0; i < month; i++) {
                      const prevIncome = monthlyData[i]?.periodProfit || 0;
                      const prevIsrCalc = calculateMonthISR(i, prevIncome);
                      const prevRetentions = getAccumulatedRetainedISR(i);
                      const prevIsrCharge = Math.max(0, prevIsrCalc.totalTax - prevRetentions - 
                        (i > 0 ? previousPayments : 0));
                      previousPayments += prevIsrCharge;
                    }
                    
                    // Final amount to pay is the same as ISR a Cargo
                    const isrCharge = Math.max(0, isrCalc.totalTax - accRetentions - previousPayments);
                    
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center font-medium ${
                          isrCharge > 0 ? 'text-red-500 font-bold' : ''
                        } ${getCellStyle(month, isrCharge)}`}
                      >
                        {formatCurrency(isrCharge)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
