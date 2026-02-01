import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { FilePlus, RefreshCw } from "lucide-react";
import { CFDI } from "@/models/CFDI";
import { fiscalCalculator, AnnualFiscalSummary } from "@/services/fiscal-calculator";
import { useToast } from "@/components/ui/use-toast";
import { TaxBracketsService } from "@/services/tax-brackets-service";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { facturasExtranjerasService } from "@/services/facturas-extranjeras-service";
import { FacturaExtranjera } from "@/models/facturaManual";
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
  cfdis: CFDI[]; // Ahora recibe los CFDIs directamente
  onGenerateDeclaration?: (monthData: MonthlyFiscalData) => void;
}

export function FiscalSummary({ year, clientId, cfdis }: FiscalSummaryProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  // Reference date data
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Calcular el resumen fiscal dinámicamente desde los CFDIs
  const fiscalSummary = useMemo(() => {
    return fiscalCalculator.calculateAnnualSummary(cfdis, year, clientId);
  }, [cfdis, year, clientId]);
  
  // Calcular montos exentos por mes (de gastos con IVA exento)
  const monthlyExento = useMemo(() => {
    const exento: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      exento[month] = 0;
    }
    
    cfdis
      .filter(cfdi => cfdi.esEgreso && cfdi.esDeducible && !cfdi.estaCancelado && cfdi.mesDeduccion)
      .forEach(cfdi => {
        const month = cfdi.mesDeduccion!;
        if (month >= 1 && month <= 12) {
          // Sumar el monto exento del CFDI
          exento[month] += cfdi.exento || 0;
        }
      });
    
    return exento;
  }, [cfdis]);
  
  // Estado para facturas extranjeras cargadas desde Firebase
  const [facturasExtranjeras, setFacturasExtranjeras] = useState<FacturaExtranjera[]>([]);
  
  // Calcular facturas extranjeras por mes desde las facturas manuales cargadas
  const monthlyExtranjero = useMemo(() => {
    const extranjero: Record<number, number> = {};
    for (let month = 1; month <= 12; month++) {
      extranjero[month] = 0;
    }
    
    // Sumar facturas extranjeras manuales por mes de su fecha (solo las deducibles)
    facturasExtranjeras
      .filter(f => f.esDeducible !== false) // Solo incluir las deducibles
      .forEach(factura => {
        const fechaFactura = new Date(factura.fecha);
        const month = fechaFactura.getMonth() + 1; // getMonth() es 0-indexed
        if (month >= 1 && month <= 12) {
          extranjero[month] += factura.totalMXN || 0;
        }
      });
    
    return extranjero;
  }, [facturasExtranjeras]);
  
  const [loading, setLoading] = useState(false);
  const [monthlyDepreciations, setMonthlyDepreciations] = useState<Record<number, number>>({});
  const [taxBracketsByMonth, setTaxBracketsByMonth] = useState<Record<number, any[]>>({});
  const [declaracionModalOpen, setDeclaracionModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Add state for tracking refresh operation
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize the FixedAssetService
  const fixedAssetService = useMemo(() => new FixedAssetService(), []);

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
  
  // Cargar facturas extranjeras desde Firebase
  useEffect(() => {
    const fetchFacturasExtranjeras = async () => {
      try {
        const facturas = await facturasExtranjerasService.getFacturasExtranjeras(clientId, year);
        console.log(`Loaded ${facturas.length} foreign invoices for fiscal summary`);
        setFacturasExtranjeras(facturas);
      } catch (error) {
        console.error("Error loading foreign invoices:", error);
        setFacturasExtranjeras([]);
      }
    };
    
    if (clientId && year) {
      fetchFacturasExtranjeras();
    }
  }, [clientId, year]);

  // Convertir datos del calculador al formato del componente
  const monthlyData = useMemo(() => {
    // Convertir del formato del calculador al formato del componente
    return months.map(month => {
      // fiscalSummary usa meses 1-12, el componente usa 0-11
      const monthData = fiscalSummary.months[month + 1];
      
      // Obtener datos de ingresos y egresos
      const incomeAmount = monthData?.ingresos.isrGravado || 0;
      const expenseAmount = monthData?.egresos.isrDeducible || 0;
      const ivaCollected = monthData?.ingresos.ivaTrasladado || 0;
      const ivaPaid = monthData?.egresos.ivaAcreditable || 0;
      const ivaRetenido = monthData?.ingresos.ivaRetenido || 0;
      
      // Calcular utilidad (considerar depreciación)
      const depreciation = monthlyDepreciations[month] || 0;
      const profit = incomeAmount - expenseAmount - depreciation;
      
      // Calcular valores acumulados hasta este mes
      const accumulated = fiscalCalculator.calculateAccumulatedTotals(fiscalSummary, month + 1);
      
      // Agregar depreciación acumulada
      let totalDepreciation = 0;
      for (let i = 0; i <= month; i++) {
        totalDepreciation += monthlyDepreciations[i] || 0;
      }
      
      const periodIncomesTotal = accumulated.ingresosAcumulados;
      const periodExpensesTotal = accumulated.deduccionesAcumuladas + totalDepreciation;
      const periodProfit = periodIncomesTotal - periodExpensesTotal;
      
      return {
        month,
        incomeAmount,
        expenseAmount,
        ivaCollected,
        ivaPaid,
        ivaRetenido,
        profit,
        depreciation,
        periodIncomesTotal,
        periodExpensesTotal,
        periodProfit
      };
    });
  }, [fiscalSummary, months, monthlyDepreciations]);

  // ISR calculation functions - usando datos calculados dinámicamente
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
      
      // Get the appropriate tax bracket for this amount, year and month
      const brackets = TaxBracketsService.getTaxBracketsByYearAndMonth(year, month + 1); // +1 because months are 0-indexed in the component
      
      // Find the bracket that applies to this amount
      const bracket = brackets.find(b => 
        amount >= b.lowerLimit && amount <= b.upperLimit
      );
      
      if (!bracket) {
        console.error(`No tax bracket found for amount ${amount} in month ${month + 1} of year ${year}`);
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
    const monthData = fiscalSummary.months[month + 1];
    return monthData?.ingresos.isrRetenido || 0;
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

  // Función para refrescar datos de depreciación (los CFDIs se actualizan automáticamente via props)
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log("Refrescando datos de depreciación...");
      
      // Actualizar datos de depreciación de activos fijos
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
        description: "Los datos de depreciación han sido actualizados",
        variant: "default"
      });
    } catch (error) {
      console.error("Error refreshing depreciation data:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos de depreciación",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium whitespace-nowrap">
            Cédula Fiscal {year}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Fixed button - using standard variant */}
            <Button 
              variant="default" 
              size="xs" 
              onClick={() => {
                console.log("Opening declaracion modal");
                setDeclaracionModalOpen(true);
              }}
              className="text-xs flex items-center gap-1"
            >
              <FilePlus className="h-3 w-3" />
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
                    const expenseValue = monthlyData[month]?.expenseAmount || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, expenseValue)}`}
                      >
                        {formatCurrency(expenseValue)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Pagado Exento</td>
                  {months.map(month => {
                    const exentoValue = monthlyExento[month + 1] || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, exentoValue)}`}
                      >
                        {formatCurrency(exentoValue)}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Add new row for Pagado Extranjero */}
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Pagado Extranjero</td>
                  {months.map(month => {
                    const extranjeroValue = monthlyExtranjero[month + 1] || 0;
                    return (
                      <td 
                        key={month} 
                        className={`px-2 py-1 align-middle text-center ${getCellStyle(month, extranjeroValue)}`}
                      >
                        {formatCurrency(extranjeroValue)}
                      </td>
                    );
                  })}
                </tr>

                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Total deducciones del mes</td>
                  {months.map(month => {
                    const expenseValue = monthlyData[month]?.expenseAmount || 0;
                    const exentoValue = monthlyExento[month + 1] || 0;
                    const extranjeroValue = monthlyExtranjero[month + 1] || 0;
                    const value = expenseValue + exentoValue + extranjeroValue;
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
                    const exentoValue = monthlyExento[month + 1] || 0;
                    const extranjeroValue = monthlyExtranjero[month + 1] || 0;
                    const totalValue = expenseValue + depreciationValue + exentoValue + extranjeroValue;
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
                    // Calculate accumulated exento and extranjero values up to this month
                    let accumulatedExento = 0;
                    let accumulatedExtranjero = 0;
                    for (let i = 0; i <= month; i++) {
                      const monthKey = (i + 1).toString();
                      accumulatedExento += monthlyExento[parseInt(monthKey)] || 0;
                      accumulatedExtranjero += monthlyExtranjero[parseInt(monthKey)] || 0;
                    }
                    
                    const value = (monthlyData[month]?.periodExpensesTotal || 0) + accumulatedExento + accumulatedExtranjero;
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
                    const baseProfit = monthlyData[month]?.profit || 0;
                    const exentoValue = monthlyExento[month + 1] || 0;
                    const value = baseProfit - exentoValue;
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
                    const basePeriodProfit = monthlyData[month]?.periodProfit || 0;
                    // Calculate accumulated exento values up to this month
                    let accumulatedExento = 0;
                    for (let i = 0; i <= month; i++) {
                      const monthKey = (i + 1).toString();
                      accumulatedExento += monthlyExento[parseInt(monthKey)] || 0;
                    }
                    const value = basePeriodProfit - accumulatedExento;
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
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Pagado Exento</td>
                  {months.map(month => {
                    // Calculate exento values - using calculated data from CFDIs
                    const value = monthlyExento[month + 1] || 0;
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
                
                {/* ISR SECTION */}
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <td colSpan={months.length + 1} className="pl-7 px-2 py-1.5 font-medium">ISR (IMPUESTO SOBRE LA RENTA)</td>
                </tr>
                <tr className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="pl-7 px-2 py-1 font-medium whitespace-nowrap">Base del Impuesto</td>
                  {months.map(month => {
                    const basePeriodProfit = monthlyData[month]?.periodProfit || 0;
                    // Calculate accumulated exento and extranjero values up to this month
                    let accumulatedExento = 0;
                    let accumulatedExtranjero = 0;
                    for (let i = 0; i <= month; i++) {
                      const monthKey = (i + 1).toString();
                      accumulatedExento += monthlyExento[parseInt(monthKey)] || 0;
                      accumulatedExtranjero += monthlyExtranjero[parseInt(monthKey)] || 0;
                    }
                    const value = basePeriodProfit - accumulatedExento - accumulatedExtranjero;
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
