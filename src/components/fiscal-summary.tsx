import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { TaxDeclaration, calculateDueDate } from "@/models/TaxDeclaration";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  invoices: Invoice[];
  onGenerateDeclaration?: (monthData: MonthlyFiscalData) => void;
}

export function FiscalSummary({ year, invoices = [], onGenerateDeclaration }: FiscalSummaryProps) {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [monthlyData, setMonthlyData] = useState<MonthlyFiscalData[]>([]);
  
  // Filtrar facturas por año
  const yearInvoices = invoices.filter(
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
  }, [year, invoices]);
  
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
    const expenseAmount = monthExpenseInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Calcular IVA cobrado, pagado y retenido
    const ivaCollected = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
    const ivaPaid = monthExpenseInvoices.reduce((sum, inv) => sum + (inv.tax || 0), 0);
    const ivaWithheld = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.retainedVat || 0), 0);
    
    // Calcular balance de IVA
    const ivaBalance = ivaCollected - ivaPaid - ivaWithheld;
    
    // Calcular ISR retenido
    const isrWithheld = monthIncomeInvoices.reduce((sum, inv) => sum + (inv.retainedIsr || 0), 0);
    
    // Calcular depreciación (simulación simple)
    const depreciation = 0; // En un caso real se obtendría de los activos fijos
    
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
    
    // Acumular datos de meses anteriores hasta el actual
    for (let i = 0; i <= month; i++) {
      const monthIncome = incomeInvoices.filter(inv => new Date(inv.date).getMonth() === i);
      const monthExpense = expenseInvoices.filter(inv => new Date(inv.date).getMonth() === i);
      
      periodIncomesTotal += monthIncome.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
      periodExpensesTotal += monthExpense.reduce((sum, inv) => sum + (inv.total || 0), 0);
      
      periodIVACharged += monthIncome.reduce((sum, inv) => sum + (inv.tax || 0), 0);
      periodIVAPaid += monthExpense.reduce((sum, inv) => sum + (inv.tax || 0), 0);
      periodIVAWithheld += monthIncome.reduce((sum, inv) => sum + (inv.retainedVat || 0), 0);
    }
    
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
      periodExpensesTotal,
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
      <CardHeader className="pb-3">
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
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px] font-bold">Concepto</TableHead>
                {months.map(month => (
                  <TableHead key={month} className="text-center">
                    {getMonthName(month)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* SECCIÓN DE INGRESOS */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-lg">
                  INGRESOS
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Ingresos Facturados a clientes individuales</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.incomeAmount || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Ingresos del mes</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.incomeAmount || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Ingresos del periodo</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.periodIncomesTotal || 0)}
                  </TableCell>
                ))}
              </TableRow>
              
              {/* SECCIÓN DE DEDUCCIONES */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-lg">
                  DEDUCCIONES
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Deducciones autorizadas del mes</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.expenseAmount || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Depreciación mensual</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.depreciation || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Deducciones del periodo</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency((monthlyData[month]?.expenseAmount || 0) + (monthlyData[month]?.depreciation || 0))}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Deducciones acumuladas</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.periodExpensesTotal || 0)}
                  </TableCell>
                ))}
              </TableRow>
              
              {/* SECCIÓN DE UTILIDAD */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-lg">
                  UTILIDAD
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Utilidad del mes</TableCell>
                {months.map(month => (
                  <TableCell 
                    key={month} 
                    className={`text-center ${(monthlyData[month]?.profit || 0) < 0 ? 'text-red-500' : 'text-green-600'}`}
                  >
                    {formatCurrency(monthlyData[month]?.profit || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Ingreso Gravable</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell 
                      key={month} 
                      className="text-center"
                    >
                      {formatCurrency(isrData?.ingresoGravable || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* SECCIÓN DE CÁLCULO DE ISR */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-lg">
                  CÁLCULO DE ISR
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Pérdidas fiscales</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.perdidasFiscales || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Base del Impuesto</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.baseImpuesto || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Limite inferior</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.limiteInferior || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Excedente del limite inferior</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.excedente || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(*) Porcentaje sobre el excedente</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {isrData ? `${(isrData.porcentajeExcedente * 100).toFixed(1)}%` : '0%'}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Impuesto Marginal</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.impuestoMarginal || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(+) Cuota Fija</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.cuotaFija || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Impuestos Art. 113</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.impuestoArt113 || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Pagos provisionales anteriores</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.pagosProvisionalesAnteriores || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Retenciones acumuladas</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.retencionesAcumuladas || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Retenciones del periodo</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.isrWithheld || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Impuesto Sobre la Renta a Cargo</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center font-semibold">
                      {formatCurrency(isrData?.isrACargo || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Compensación de saldos</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(isrData?.compensacionSaldos || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Impuesto por pagar</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  return (
                    <TableCell key={month} className="text-center font-semibold text-red-500">
                      {formatCurrency(isrData?.impuestoPorPagar || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* SECCIÓN DE IVA */}
              <TableRow className="bg-slate-50">
                <TableCell colSpan={months.length + 1} className="font-bold text-lg">
                  IMPUESTO AL VALOR AGREGADO
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Cobrados a la tasa del 16%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.actosGravados16 || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Suma de gastos gravados 16%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.gastosGravados16 || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(+) Por lo que no se deba pagar el impuesto (exentos)</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.actosExentos || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Suma de actos gravados a tasa 0%</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.actosTasa0 || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">Impuesto Causado</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.ivaCollected || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">IVA retenido</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.ivaWithheld || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">IVA Acreditable pagado</TableCell>
                {months.map(month => (
                  <TableCell key={month} className="text-center">
                    {formatCurrency(monthlyData[month]?.ivaPaid || 0)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">IVA por Pagar</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.ivaPorPagar || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">IVA a Favor</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.ivaAFavor || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(-) Acreditamiento de saldos a favor</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center">
                      {formatCurrency(ivaData?.acreditamientoSaldosFavor || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="font-medium pl-6">(=) Impuesto por Pagar</TableCell>
                {months.map(month => {
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  return (
                    <TableCell key={month} className="text-center font-semibold text-red-500">
                      {formatCurrency(ivaData?.impuestoPorPagar || 0)}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* SECCIÓN DE TOTAL */}
              <TableRow className="bg-slate-50">
                <TableCell className="font-bold text-lg">(=) SUMA DE IMPUESTOS A PAGAR</TableCell>
                {months.map(month => {
                  const isrData = monthlyData[month] ? 
                    calculateIsrData(monthlyData[month], monthlyData.slice(0, month)) : null;
                  const ivaData = monthlyData[month] ? calculateIvaData(monthlyData[month]) : null;
                  
                  const totalImpuestos = (isrData?.impuestoPorPagar || 0) + (ivaData?.impuestoPorPagar || 0);
                  
                  return (
                    <TableCell key={month} className="text-center font-bold text-lg text-red-500">
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
