import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FixedAssetService } from "@/services/fixed-asset-service";

// Simplified interface for fiscal data - focusing only on key metrics
export interface MonthlyFiscalData {
  month: number;
  // Core metrics
  incomeAmount: number;  // Based on gravadoISR 
  expenseAmount: number; // Based on gravadoISR
  ivaCollected: number;  // Based on gravadoIVA
  ivaPaid: number;       // Based on gravadoIVA
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
      profit,
      periodIncomesTotal,
      periodExpensesTotal,
      periodProfit
    };
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
    return new Date(year, month).toLocaleDateString('es', { month: 'short' });
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

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-8">
        <div className="flex items-center justify-between">
          <CardTitle>Cédula Fiscal {year}</CardTitle>
          {onGenerateDeclaration && (
            <Button 
              size="sm" 
              onClick={handleGenerateDeclaration}
              title="Generar declaración con los datos fiscales calculados"
            >
              Generar Declaración
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-1">
        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px] font-bold py-1">Concepto</TableHead>
                {months.map(month => (
                  <TableHead 
                    key={month} 
                    className="text-center p-1"
                  >
                    {getMonthName(month)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* INGRESOS SECTION */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  INGRESOS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Ingresos del mes</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.incomeAmount || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Ingresos acumulados</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.periodIncomesTotal || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* DEDUCCIONES SECTION */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  DEDUCCIONES
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Deducciones del mes</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.expenseAmount || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Deducciones acumuladas</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.periodExpensesTotal || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* UTILIDAD SECTION */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  UTILIDAD
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Utilidad del mes</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.profit || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)} ${value < 0 ? 'text-red-500' : value > 0 ? 'text-green-600' : ''}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Utilidad acumulada</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.periodProfit || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-medium ${getCellStyle(month, value)} ${value < 0 ? 'text-red-500' : value > 0 ? 'text-green-600' : ''}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* IVA SECTION */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  IVA
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA Cobrado</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.ivaCollected || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA Pagado</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.ivaPaid || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA por Pagar</TableCell>
                {months.map(month => {
                  const value = Math.max(0, (monthlyData[month]?.ivaCollected || 0) - (monthlyData[month]?.ivaPaid || 0));
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-medium ${value > 0 ? 'text-red-500' : ''} ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA a Favor</TableCell>
                {months.map(month => {
                  const ivaDiff = (monthlyData[month]?.ivaCollected || 0) - (monthlyData[month]?.ivaPaid || 0);
                  const value = ivaDiff < 0 ? Math.abs(ivaDiff) : 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-medium ${value > 0 ? 'text-green-600' : ''} ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
