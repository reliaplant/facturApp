import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TaxDeclaration, calculateDueDate } from "@/models/TaxDeclaration";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FixedAssetService } from "@/services/fixed-asset-service";

// Interfaz para los datos fiscales calculados por mes
export interface MonthlyFiscalData {
  month: number;
  // Ingresos y gastos
  incomeAmount: number;
  expenseAmount: number;
  // IVA
  ivaCollected: number;
  ivaPaid: number;
  ivaWithheld: number;
  ivaBalance: number;
  // ISR
  isrWithheld: number;
  estimatedIsrToPay: number;
  // Depreciación
  depreciation: number;
  // Utilidad
  profit: number;
  // Datos acumulados del periodo
  periodIncomesTotal: number;
  periodExpensesTotal: number;
  periodIVACharged: number;
  periodIVAPaid: number;
  periodIVAWithheld: number;
  periodProfit: number;
}

interface FiscalSummaryProps {
  year: number;
  clientId: string; // Añadir clientId como prop obligatorio
  invoices: Invoice[];
  onGenerateDeclaration?: (monthData: MonthlyFiscalData) => void;
}

export function FiscalSummary({ year, clientId, invoices = [], onGenerateDeclaration }: FiscalSummaryProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  // Usamos la fecha actual para determinar el mes actual y qué meses han transcurrido
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyFiscalData[]>([]);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const [monthlyDepreciations, setMonthlyDepreciations] = useState<Record<number, number>>({});
  const fixedAssetService = new FixedAssetService();
  
  // Cargar facturas actualizadas desde localStorage
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedInvoices_${year}`);
      if (savedInvoices) {
        const parsed = JSON.parse(savedInvoices);
        setUpdatedInvoices(parsed);
        console.log(`FiscalSummary - Cargamos ${Object.keys(parsed).length} facturas actualizadas del localStorage`);
      }
    } catch (error) {
      console.error("Error al cargar facturas actualizadas en FiscalSummary:", error);
    }
  }, [year]);
  
  // Cargar depreciaciones mensuales
  useEffect(() => {
    const loadDepreciations = async () => {
      try {
        console.log("🔍 Cargando depreciaciones para cliente:", clientId, "año:", year);
        
        const depreciationsByMonth: Record<number, number> = {};
        
        // Para cada mes, obtener todas las depreciaciones correspondientes
        for (let month = 0; month < 12; month++) {
          const startDate = `${year}-${String(month + 1).padStart(2, '0')}`;
          const endDate = `${year}-${String(month + 1).padStart(2, '0')}`;
          
          try {
            // Usar método alternativo directamente para evitar llamadas duplicadas
            const depreciation = await fixedAssetService.getTotalMonthlyDepreciation(
              clientId,
              startDate,
              endDate
            );
            
            depreciationsByMonth[month] = depreciation;
          } catch (error) {
            console.error(`Error cargando depreciación para ${startDate}:`, error);
            depreciationsByMonth[month] = 0;
          }
        }
        
        console.log("Depreciaciones por mes cargadas");
        setMonthlyDepreciations(depreciationsByMonth);
        
      } catch (error) {
        console.error("Error al cargar depreciaciones mensuales:", error);
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
  }, [year, clientId]); // Quitar fixedAssetService para evitar el loop
  
  // Combinar las facturas originales con las actualizadas
  const mergedInvoices = invoices.map(invoice => 
    updatedInvoices[invoice.id] ? updatedInvoices[invoice.id] : invoice
  );
  
  // Filtrar facturas por año
  const yearInvoices = mergedInvoices.filter(
    inv => new Date(inv.date).getFullYear() === year && !inv.isCancelled
  );

  // Facturas de ingresos (recibidas)
  const incomeInvoices = yearInvoices.filter(inv => inv.cfdiType === 'I');
  
  // Facturas de gastos (emitidas)
  const expenseInvoices = yearInvoices.filter(inv => inv.cfdiType === 'E');
  
  // Calcular datos por mes y almacenarlos en el estado
  useEffect(() => {
    const calculatedMonthlyData = months.map(month => {
      return calculateMonthlyData(month, incomeInvoices, expenseInvoices);
    });
    setMonthlyData(calculatedMonthlyData);
  }, [year, mergedInvoices, monthlyDepreciations]); // Eliminar clientId de las dependencias
  
  // Calcular datos por mes
  const calculateMonthlyData = (month: number, incomeInvoices: Invoice[], expenseInvoices: Invoice[]): MonthlyFiscalData => {
    // Filtrar facturas por mes
    const monthIncomeInvoices = incomeInvoices.filter(
      inv => new Date(inv.date).getMonth() === month
    );
    
    const monthExpenseInvoices = expenseInvoices.filter(
      inv => new Date(inv.date).getMonth() === month
    );
    
    // Calcular totales del mes - usando subtotal para ingresos
    const incomeAmount = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
    
    // Calcular gastos deducibles: solo incluir facturas marcadas como deducibles y usar el monto deducible apropiado
    const expenseAmount = monthExpenseInvoices.reduce((sum, inv) => {
      if (!inv.isDeductible) return sum; // No es deducible
      
      // Determinar el monto deducible basado en el tipo de deducibilidad
      let deductibleAmount = 0;
      
      if (inv.deductibilityType === 'fixed' && inv.deductibleAmount) {
        // Monto fijo especificado
        deductibleAmount = inv.deductibleAmount;
      } else if (inv.deductibilityType === 'partial' && inv.deductiblePercentage) {
        // Porcentaje del total
        deductibleAmount = (inv.total || 0) * (inv.deductiblePercentage / 100);
      } else if (inv.deductibilityType === 'full') {
        // 100% deducible
        deductibleAmount = inv.total || 0;
      }
      
      return sum + deductibleAmount;
    }, 0);
    
    // Calcular IVA cobrado, pagado y retenido
    const ivaCollected = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
    
    // Solo incluir IVA pagado de facturas deducibles
    const ivaPaid = monthExpenseInvoices.reduce((sum, inv) => {
      if (!inv.isDeductible) return sum;
      
      // Calcular el IVA acreditable proporcionalmente al monto deducible
      let deductibleRatio = 1; // Por defecto, todo el IVA es acreditable
      
      if (inv.deductibilityType === 'fixed' && inv.deductibleAmount && inv.total) {
        deductibleRatio = Math.min(1, inv.deductibleAmount / inv.total);
      } else if (inv.deductibilityType === 'partial' && inv.deductiblePercentage) {
        deductibleRatio = inv.deductiblePercentage / 100;
      } else if (!inv.isDeductible) {
        deductibleRatio = 0;
      }
      
      return sum + ((inv.tax || 0) * deductibleRatio);
    }, 0);
    
    const ivaWithheld = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.retainedVat || 0), 0);
    
    // Calcular balance de IVA
    const ivaBalance = ivaCollected - ivaPaid - ivaWithheld;
    
    // Calcular ISR retenido
    const isrWithheld = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.retainedIsr || 0), 0);
    
    // Obtener la depreciación del mes desde el estado
    const depreciation = monthlyDepreciations[month] || 0;
    
    // Calcular utilidad del mes
    const profit = incomeAmount - expenseAmount - depreciation;
    
    // Calcular ISR estimado
    const estimatedIsrToPay = calculateEstimatedISR(profit > 0 ? profit : 0, month);
    
    // Calcular acumulados hasta el mes actual
    let periodIncomesTotal = 0;
    let periodExpensesTotal = 0;
    let periodIVACharged = 0;
    let periodIVAPaid = 0;
    let periodIVAWithheld = 0;
    let periodProfit = 0;
    let totalDepreciation = 0;
    
    // Acumular datos de meses anteriores hasta el actual
    for (let i = 0; i <= month; i++) {
      const monthIncome = incomeInvoices.filter(inv => new Date(inv.date).getMonth() === i);
      const monthExpense = expenseInvoices.filter(inv => new Date(inv.date).getMonth() === i);
      
      periodIncomesTotal += monthIncome.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      
      // Acumular gastos deducibles solamente
      periodExpensesTotal += monthExpense.reduce((sum, inv) => {
        if (!inv.isDeductible) return sum;
        
        let deductibleAmount = 0;
        if (inv.deductibilityType === 'fixed' && inv.deductibleAmount) {
          deductibleAmount = inv.deductibleAmount;
        } else if (inv.deductibilityType === 'partial' && inv.deductiblePercentage) {
          deductibleAmount = (inv.total || 0) * (inv.deductiblePercentage / 100);
        } else if (inv.deductibilityType === 'full') {
          deductibleAmount = inv.total || 0;
        }
        
        return sum + deductibleAmount;
      }, 0);
      
      // Acumular depreciaciones
      totalDepreciation += monthlyDepreciations[i] || 0;
      
      periodIVACharged += monthIncome.reduce((sum, inv) => sum + (inv.tax || 0), 0);
      
      // IVA acreditable proporcional
      periodIVAPaid += monthExpense.reduce((sum, inv) => {
        if (!inv.isDeductible) return sum;
        
        let deductibleRatio = 1;
        if (inv.deductibilityType === 'fixed' && inv.deductibleAmount && inv.total) {
          deductibleRatio = Math.min(1, inv.deductibleAmount / inv.total);
        } else if (inv.deductibilityType === 'partial' && inv.deductiblePercentage) {
          deductibleRatio = inv.deductiblePercentage / 100;
        } else if (!inv.isDeductible) {
          deductibleRatio = 0;
        }
        
        return sum + ((inv.tax || 0) * deductibleRatio);
      }, 0);
      
      periodIVAWithheld += monthIncome.reduce((sum, inv) => sum + (inv.retainedVat || 0), 0);
    }
    
    // Incluir la depreciación acumulada en las deducciones acumuladas para el periodo
    periodExpensesTotal += totalDepreciation;
    
    // Calcular utilidad del periodo con las deducciones totales (incluida depreciación)
    periodProfit = periodIncomesTotal - periodExpensesTotal;
    
    return {
      month,
      incomeAmount,
      expenseAmount,
      ivaCollected,
      ivaPaid,
      ivaWithheld,
      ivaBalance,
      isrWithheld,
      estimatedIsrToPay,
      depreciation,
      profit,
      periodIncomesTotal,
      periodExpensesTotal,  // Ahora incluye la depreciación acumulada
      periodIVACharged,
      periodIVAPaid,
      periodIVAWithheld,
      periodProfit
    };
  };
    
  // Calcular ISR estimado (simulación)
  const calculateEstimatedISR = (taxableIncome: number, month: number) => {
    // Simplificación para el ejemplo: 30% de la utilidad
    return Math.max(0, taxableIncome * 0.3);
  };
  
  const handleGenerateDeclaration = () => {
    if (onGenerateDeclaration && monthlyData[selectedMonth]) {
      onGenerateDeclaration(monthlyData[selectedMonth]);
    }
  };

  // Función auxiliar para formatear montos
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  // Obtener nombres de los meses en español
  const getMonthName = (month: number) => {
    return new Date(year, month).toLocaleDateString('es', { month: 'short' });
  };

  // Función para determinar el estilo de la celda según el mes y el valor
  const getCellStyle = (month: number, value: number) => {
    // Si estamos viendo un año diferente al actual, todo depende de si es futuro o pasado
    if (year > currentYear) {
      return "bg-gray-100 text-gray-400"; // Año futuro, todas las celdas en gris con texto claro
    } else if (year < currentYear) {
      return value === 0 ? "text-gray-400" : ""; // Año pasado, solo color para los 0
    }
    
    // Para el año actual
    if (month > currentMonth) {
      return "bg-gray-100 text-gray-400"; // Meses futuros en gris con texto claro
    } else if (month === currentMonth) {
      return `bg-sky-100 ${value === 0 ? "text-gray-400" : ""}`; // Mes actual en azul claro, 0 en gris
    } else {
      return value === 0 ? "text-gray-400" : ""; // Meses pasados, solo color para los 0
    }
  };

  // Cálculos adicionales para ISR
  const calculateIsrData = (monthData: MonthlyFiscalData, previousMonths: MonthlyFiscalData[]) => {
    const ingresoGravable = monthData.profit > 0 ? monthData.profit : 0;
    const perdidasFiscales = 0; // Simulado, en un caso real vendría de datos históricos
    const baseImpuesto = Math.max(0, ingresoGravable - perdidasFiscales);
    
    // Simulación de tabla ISR (valores aproximados)
    const limiteInferior = baseImpuesto > 20000 ? 20000 : 
                           baseImpuesto > 10000 ? 10000 : 
                           baseImpuesto > 5000 ? 5000 : 0;
    
    const excedente = Math.max(0, baseImpuesto - limiteInferior);
    const porcentajeExcedente = baseImpuesto > 20000 ? 0.34 : 
                                baseImpuesto > 10000 ? 0.30 : 
                                baseImpuesto > 5000 ? 0.25 : 0.16;
    
    const impuestoMarginal = excedente * porcentajeExcedente;
    const cuotaFija = baseImpuesto > 20000 ? 4000 :
                      baseImpuesto > 10000 ? 1500 :
                      baseImpuesto > 5000 ? 500 : 0;
    
    const impuestoArt113 = impuestoMarginal + cuotaFija;
    
    // Pagos provisionales anteriores
    const pagosProvisionalesAnteriores = previousMonths.reduce((sum, m) => 
      sum + (m.estimatedIsrToPay - m.isrWithheld), 0);
    
    // Retenciones acumuladas
    const retencionesAcumuladas = previousMonths.reduce((sum, m) => 
      sum + m.isrWithheld, 0);
    
    // Retenciones del periodo
    const retencionesPeriodo = monthData.isrWithheld;
    
    // ISR a cargo
    const isrACargo = Math.max(0, impuestoArt113 - pagosProvisionalesAnteriores - 
      retencionesAcumuladas - retencionesPeriodo);
    
    // Compensación saldos (simulado)
    const compensacionSaldos = 0;
    
    // Impuesto por pagar
    const impuestoPorPagar = Math.max(0, isrACargo - compensacionSaldos);
    
    return {
      ingresoGravable,
      perdidasFiscales,
      baseImpuesto,
      limiteInferior,
      excedente,
      porcentajeExcedente,
      impuestoMarginal,
      cuotaFija,
      impuestoArt113,
      pagosProvisionalesAnteriores,
      retencionesAcumuladas,
      retencionesPeriodo,
      isrACargo,
      compensacionSaldos,
      impuestoPorPagar
    };
  };

  // Cálculos adicionales para IVA
  const calculateIvaData = (monthData: MonthlyFiscalData) => {
    const actosGravados16 = monthData.incomeAmount; // Asumiendo que todo es al 16%
    const gastosGravados16 = monthData.expenseAmount; // Asumiendo que todo es al 16%
    const actosExentos = 0; // Simulado
    const actosTasa0 = 0; // Simulado
    
    const ivaCausado = monthData.ivaCollected;
    const ivaRetenido = monthData.ivaWithheld;
    const ivaAcreditable = monthData.ivaPaid;
    
    const ivaPorPagar = Math.max(0, ivaCausado - ivaRetenido - ivaAcreditable);
    const ivaAFavor = ivaCausado - ivaRetenido - ivaAcreditable < 0 ? 
                     Math.abs(ivaCausado - ivaRetenido - ivaAcreditable) : 0;
    
    const acreditamientoSaldosFavor = 0; // Simulado
    const impuestoPorPagar = Math.max(0, ivaPorPagar - acreditamientoSaldosFavor);
    
    return {
      actosGravados16,
      gastosGravados16,
      actosExentos,
      actosTasa0,
      ivaCausado,
      ivaRetenido,
      ivaAcreditable,
      ivaPorPagar,
      ivaAFavor,
      acreditamientoSaldosFavor,
      impuestoPorPagar
    };
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
              {/* SECCIÓN DE INGRESOS */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  INGRESOS
                </TableCell>
              </TableRow>
              {/* Se elimina la fila de "Ingresos Facturados a clientes individuales" */}
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Ingresos del periodo</TableCell>
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
              
              {/* SECCIÓN DE DEDUCCIONES */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  DEDUCCIONES
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Deducciones autorizadas del mes</TableCell>
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Depreciación mensual</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.depreciation || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Deducciones del periodo</TableCell>
                {months.map(month => {
                  const expenseValue = monthlyData[month]?.expenseAmount || 0;
                  const depreciationValue = monthlyData[month]?.depreciation || 0;
                  const value = expenseValue + depreciationValue;
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
                  // periodExpensesTotal ya incluye la depreciación acumulada
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
              
              {/* SECCIÓN DE UTILIDAD */}
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Ingreso Gravable</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.ingresoGravable || 0;
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

              {/* SECCIÓN DE CÁLCULO DE ISR */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  CÁLCULO DE ISR
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Pérdidas fiscales</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.perdidasFiscales || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Base del Impuesto</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.baseImpuesto || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Limite inferior</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.limiteInferior || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Excedente del limite inferior</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.excedente || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Porcentaje sobre el excedente</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  // Para porcentajes, consideramos el valor como 0 si es 0%
                  const value = isrData?.porcentajeExcedente || 0;
                  const displayValue = isrData ? `${(isrData.porcentajeExcedente * 100).toFixed(1)}%` : '0%';
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 ${getCellStyle(month, value)}`}
                    >
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
              
              {/* Continuar con el resto de filas siguiendo el mismo patrón */}
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuesto Marginal</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.impuestoMarginal || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Cuota Fija</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.cuotaFija || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuestos Art. 113</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.impuestoArt113 || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Pagos provisionales anteriores</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.pagosProvisionalesAnteriores || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Retenciones acumuladas</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.retencionesAcumuladas || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Retenciones del periodo</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.isrWithheld || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuesto Sobre la Renta a Cargo</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.isrACargo || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-semibold ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Compensación de saldos</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.compensacionSaldos || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuesto por pagar</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const value = isrData?.impuestoPorPagar || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-semibold text-red-500 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* SECCIÓN DE IVA */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-sm py-1 pl-2">
                  IMPUESTO AL VALOR AGREGADO
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Cobrados a la tasa del 16%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.actosGravados16 || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Suma de gastos gravados 16%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.gastosGravados16 || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">(+) Por lo que no se deba pagar el impuesto (exentos)</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.actosExentos || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Suma de actos gravados a tasa 0%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.actosTasa0 || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuesto Causado</TableCell>
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA retenido</TableCell>
                {months.map(month => {
                  const value = monthlyData[month]?.ivaWithheld || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA Acreditable pagado</TableCell>
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
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.ivaPorPagar || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">IVA a Favor</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.ivaAFavor || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Acreditamiento de saldos a favor</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.acreditamientoSaldosFavor || 0;
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
                <TableCell className="font-medium pl-6 py-1 whitespace-nowrap">Impuesto por Pagar</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  const value = ivaData?.impuestoPorPagar || 0;
                  return (
                    <TableCell 
                      key={month} 
                      className={`text-center py-1 font-semibold text-red-500 ${getCellStyle(month, value)}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* SECCIÓN DE TOTAL */}
              <TableRow className="bg-slate-50">
                <TableCell className="font-bold text-sm py-1 whitespace-nowrap">SUMA DE IMPUESTOS A PAGAR</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  
                  const totalImpuestos = (isrData?.impuestoPorPagar || 0) + (ivaData?.impuestoPorPagar || 0);
                  
                  return (
                    <TableCell key={month} className="text-center py-1 font-bold text-sm text-red-500">
                      {formatCurrency(totalImpuestos)}
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
