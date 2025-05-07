import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { FilePlus, RefreshCw } from "lucide-react";
import { fiscalDataService } from "@/services/fiscal-data-service";
import { YearTaxData } from "@/models/fiscalData";
import { useToast } from "@/components/ui/use-toast";
import { TaxBracketsService } from "@/services/tax-brackets-service";
import { FixedAssetService } from "@/services/fixed-asset-service";
import DeclaracionModal from "@/components/declaracion-modal";

// Simplified interface for fiscal data - focusing only on key metrics
export interface MonthlyFiscalData {
  month: number;
  // Core metrics
  incomeAmount: number;
  expenseAmount: number;
  ivaCollected: number;
  ivaPaid: number;
  ivaRetenido: number;
  // Calculated metrics
  profit: number;
  depreciation: number; // Add explicit depreciation field
  // Accumulated values
  periodIncomesTotal: number;
  periodExpensesTotal: number;
  periodProfit: number;
}

interface FiscalSummaryProps {
  year: number;
  clientId: string;
  onGenerateDeclaration?: (monthData: MonthlyFiscalData) => void;
}

export function FiscalSummary({ year, clientId }: FiscalSummaryProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  // Reference date data
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Add state for Firebase fiscal data
  const [fiscalData, setFiscalData] = useState<YearTaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthlyDepreciations, setMonthlyDepreciations] = useState<Record<number, number>>({});
  const [taxBracketsByMonth, setTaxBracketsByMonth] = useState<Record<number, any[]>>({});
  const [declaracionModalOpen, setDeclaracionModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Add state for tracking refresh operation
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize the FixedAssetService
  const fixedAssetService = useMemo(() => new FixedAssetService(), []);
  
  // Fetch fiscal data from Firebase
  useEffect(() => {
    async function fetchFiscalData() {
      setLoading(true);
      try {
        const data = await fiscalDataService.getFiscalSummary(clientId, year);
        console.log("Fetched fiscal data:", data);
        setFiscalData(data);
      } catch (error) {
        console.error("Error fetching fiscal data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos fiscales",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    if (clientId && year) {
      fetchFiscalData();
    }
  }, [clientId, year, toast]);

  // Modify the depreciation data loading effect
  useEffect(() => {
    const fetchDepreciationData = async () => {
      try {
        console.log("Fetching fixed asset depreciation data...");
        const depreciations: Record<number, number> = {};
        
        // Initialize with zeros
        for (let month = 0; month < 12; month++) {
          depreciations[month] = 0;
        }
        
        // Fetch depreciation data for each month
        for (let month = 0; month < 12; month++) {
          // Create start and end dates for this month
          const startDate = new Date(year, month, 1).toISOString();
          const endDate = new Date(year, month + 1, 0).toISOString(); // Last day of the month
          
          // Get total depreciation for this month
          const monthlyDepreciation = await fixedAssetService.getTotalMonthlyDepreciation(
            clientId,
            startDate,
            endDate
          );
          
          depreciations[month] = monthlyDepreciation;
        }
        
        console.log("Fixed asset depreciation data loaded:", depreciations);
        setMonthlyDepreciations(depreciations);
      } catch (error) {
        console.error("Error loading depreciation data:", error);
        // Set all to zero if there's an error
        const emptyDepreciations: Record<number, number> = {};
        for (let i = 0; i < 12; i++) {
          emptyDepreciations[i] = 0;
        }
        setMonthlyDepreciations(emptyDepreciations);
      }
    };
    
    if (clientId && year) {
      fetchDepreciationData();
    }
  }, [year, clientId, fixedAssetService]);
  
  // Load tax brackets - mock for now
  useEffect(() => {
    const brackets: Record<number, any[]> = {};
    for (let month = 1; month <= 12; month++) {
      brackets[month] = [];
    }
    setTaxBracketsByMonth(brackets);
  }, []);

  // Convert Firebase data to the format expected by our component
  const monthlyData = useMemo(() => {
    if (!fiscalData || !fiscalData.months) {
      // Return empty data array if no fiscal data
      return months.map(month => ({
        month,
        incomeAmount: 0,
        expenseAmount: 0,
        ivaCollected: 0,
        ivaPaid: 0,
        ivaRetenido: 0,
        profit: 0,
        depreciation: 0, // Add with default value
        periodIncomesTotal: 0,
        periodExpensesTotal: 0,
        periodProfit: 0
      }));
    }

    // Convert the Firebase data to our component's format
    return months.map(month => {
      // Get month data from Firebase (month+1 because our months are 0-indexed but Firebase uses 1-indexed)
      const monthKey = (month + 1).toString();
      const monthData = fiscalData.months[monthKey] || {};
      
      // Map Firebase fields to our component's fields
      const incomeAmount = monthData.isrGravado || 0;
      const expenseAmount = monthData.isrDeducible || 0;
      const ivaCollected = monthData.ivaTrasladado || 0;
      const ivaPaid = monthData.ivaDeducible || 0;
      const ivaRetenido = monthData.ivaRetenido || 0;
      
      // Calculate profit (consider depreciation)
      const depreciation = monthlyDepreciations[month] || 0;
      const profit = incomeAmount - expenseAmount - depreciation;
      
      // Calculate accumulated values up to this month
      let periodIncomesTotal = 0;
      let periodExpensesTotal = 0;
      let totalDepreciation = 0;
      
      for (let i = 0; i <= month; i++) {
        const prevMonthKey = (i + 1).toString();
        const prevMonthData = fiscalData.months[prevMonthKey] || {};
        
        periodIncomesTotal += prevMonthData.isrGravado || 0;
        periodExpensesTotal += prevMonthData.isrDeducible || 0;
        totalDepreciation += monthlyDepreciations[i] || 0;
      }
      
      periodExpensesTotal += totalDepreciation;
      const periodProfit = periodIncomesTotal - periodExpensesTotal;
      
      return {
        month,
        incomeAmount,
        expenseAmount,
        ivaCollected,
        ivaPaid,
        ivaRetenido,
        profit,
        depreciation, // Include the depreciation value explicitly
        periodIncomesTotal,
        periodExpensesTotal,
        periodProfit
      };
    });
  }, [fiscalData, months, monthlyDepreciations]);

  // ISR calculation functions - using data from Firebase
  const calculateMonthISR = (month: number, amount: number) => {
    try {
      // Skip calculation for negative or zero income
      if (amount <= 0) {
        return { 
          taxBase: amount,
          lowerLimit: 0,
          excess: 0,
          percentage: 0,
          marginalTax: 0,
          fixedFee: 0,
          totalTax: 0
        };
      }
      
      // Get the appropriate tax bracket for this amount and month
      const brackets = TaxBracketsService.getTaxBracketsByMonth(month + 1); // +1 because months are 0-indexed in the component
      
      // Find the bracket that applies to this amount
      const bracket = brackets.find(b => 
        amount >= b.lowerLimit && amount <= b.upperLimit
      );
      
      if (!bracket) {
        console.error(`No tax bracket found for amount ${amount} in month ${month + 1}`);
        return { 
          taxBase: amount,
          lowerLimit: 0,
          excess: 0,
          percentage: 0,
          marginalTax: 0,
          fixedFee: 0,
          totalTax: 0
        };
      }
      
      // Calculate the ISR components
      const excess = amount - bracket.lowerLimit;
      const marginalTax = excess * bracket.percentage;
      const totalTax = bracket.fixedFee + marginalTax;
      
      return { 
        taxBase: amount,
        lowerLimit: bracket.lowerLimit,
        excess: excess,
        percentage: bracket.percentage * 100, // Convert to percentage for display
        marginalTax: marginalTax,
        fixedFee: bracket.fixedFee,
        totalTax: totalTax
      };
    } catch (error) {
      console.error("Error calculating ISR:", error);
      return { 
        taxBase: amount,
        lowerLimit: 0,
        excess: 0,
        percentage: 0,
        marginalTax: 0,
        fixedFee: 0,
        totalTax: 0
      };
    }
  };
  
  const getMonthlyRetainedISR = (month: number) => {
    const monthKey = (month + 1).toString();
    return fiscalData?.months[monthKey]?.isrRetenido || 0;
  };
  
  const getAccumulatedRetainedISR = (month: number) => {
    let total = 0;
    for (let i = 0; i <= month; i++) {
      total += getMonthlyRetainedISR(i);
    }
    return total;
  };
  
  // Helper functions remain the same
  const handleDeclarationSave = (declaration: any) => {
    toast({
      title: "Declaración guardada",
      description: `Se ha guardado la declaración de ${getMesNombre(declaration.mes)} ${year}`,
    });
    setDeclaracionModalOpen(false);
  };

  const getMesNombre = (mes: string): string => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[parseInt(mes) - 1] || "";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const getMonthName = (month: number) => {
    return format(new Date(year, month), 'MMMM', { locale: es });
  };

  const getMonthAbbreviation = (month: number) => {
    return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month] || '';
  };

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

  // Calculate annual totals for badge display from Firebase data
  const annualTotals = useMemo(() => {
    const income = monthlyData.reduce((sum, data) => sum + data.incomeAmount, 0);
    const expenses = monthlyData.reduce((sum, data) => sum + data.expenseAmount, 0);
    const profit = monthlyData.reduce((sum, data) => sum + data.profit, 0);
    
    return { income, expenses, profit };
  }, [monthlyData]);

  // Add a function to handle manual refresh
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log("Manually refreshing fiscal data...");
      
      // 1. Fetch the fiscal summary data
      const data = await fiscalDataService.getFiscalSummary(clientId, year);
      setFiscalData(data);
      
      // 2. Update depreciation data from fixed assets
      const depreciations: Record<number, number> = {};
      for (let month = 0; month < 12; month++) {
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();
        
        const monthlyDepreciation = await fixedAssetService.getTotalMonthlyDepreciation(
          clientId, startDate, endDate
        );
        
        depreciations[month] = monthlyDepreciation;
      }
      setMonthlyDepreciations(depreciations);
      
      toast({
        title: "Datos actualizados",
        description: "La información fiscal ha sido actualizada correctamente",
        variant: "default"
      });
    } catch (error) {
      console.error("Error refreshing fiscal data:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos fiscales",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando datos fiscales...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Cédula Fiscal {year}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Add refresh button */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center whitespace-nowrap"
              onClick={handleRefreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Actualizando..." : "Actualizar Datos"}
            </Button>
            
            {/* Fixed button - using standard variant */}
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => {
                console.log("Opening declaracion modal");
                setDeclaracionModalOpen(true);
              }}
              className="text-xs flex items-center gap-1"
            >
              <FilePlus className="h-3.5 w-3.5" />
              Crear Declaración
            </Button>
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
      
      {/* Debug to verify modal state */}
      <div className="hidden">Modal state: {declaracionModalOpen ? 'open' : 'closed'}</div>

      {/* Add Declaracion Modal with fiscal data */}
      <DeclaracionModal
        open={declaracionModalOpen}
        onClose={() => {
          console.log("Closing modal");
          setDeclaracionModalOpen(false);
        }}
        onSave={handleDeclarationSave}
        year={year}
        clientId={clientId}
        fiscalData={monthlyData}
        calculateMonthISR={calculateMonthISR}
        getAccumulatedRetainedISR={getAccumulatedRetainedISR}
      />
    </div>
  );
}
