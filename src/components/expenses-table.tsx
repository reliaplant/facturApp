"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { ExportInvoicesExcel } from "@/components/export-invoices-excel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDeductibilityEditor } from "@/components/invoice-deductibility-editor";

interface ExpensesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
}

export function ExpensesTable({ year, invoices = [], disableExport = false }: ExpensesTableProps) {
  // State declarations
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const [highlightedPaymentComplements, setHighlightedPaymentComplements] = useState<string[]>([]);
  const highlightTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [isDeductibilityEditorOpen, setIsDeductibilityEditorOpen] = useState(false);
  const [invoiceForDeductibility, setInvoiceForDeductibility] = useState<Invoice | null>(null);

  // Load/Save from/to localStorage
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedReceivedInvoices_${year}`);
      if (savedInvoices) setUpdatedInvoices(JSON.parse(savedInvoices));
    } catch (error) { /* Ignore storage errors */ }
    
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [year]);
  
  // Save to localStorage when updatedInvoices changes
  useEffect(() => {
    if (Object.keys(updatedInvoices).length === 0) return;
    try {
      localStorage.setItem(`updatedReceivedInvoices_${year}`, JSON.stringify(updatedInvoices));
    } catch (error) { /* Ignore storage errors */ }
  }, [updatedInvoices, year]);
  
  // Helper functions - consolidated for brevity
  const invoiceHelpers = useMemo(() => ({
    isDeducible: (invoice: Invoice) => invoice.mesDeduccion && !invoice.estaCancelado,
    isPaymentComplement: (invoice: Invoice) => invoice.tipoDeComprobante === 'P',
    isPUEPayment: (invoice: Invoice) => invoice.metodoPago === 'PUE',
    isAnnualDeduction: (invoice: Invoice) => invoice.usoCFDI?.startsWith('D'),
    isNonDeductible: (invoice: Invoice) => invoice.usoCFDI === 'S01',
    isPaidWithComplement: (invoice: Invoice) => 
      (!!invoice.pagadoConComplementos && invoice.pagadoConComplementos.length > 0) ||
      invoices.some(pc => pc.tipoDeComprobante === 'P' && 
                 pc.docsRelacionadoComplementoPago?.some(uuid => 
                   uuid.toUpperCase() === invoice.uuid.toUpperCase())),
    needsPaymentComplement: (invoice: Invoice) => 
      invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice),
    isPaidPPDInvoice: (invoice: Invoice) => 
      invoice.metodoPago === 'PPD' && invoiceHelpers.isPaidWithComplement(invoice),
    isPPDWithoutComplement: (invoice: Invoice) => 
      invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice),
  }), [invoices]);

  // Update the utility function to calculate gravadoIVA and gravadoISR with better edge case handling
  const calculateGravados = useCallback((invoice: Invoice) => {
    if (!invoiceHelpers.isDeducible(invoice)) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    // Get IVA value from trasladado field
    const ivaValue = invoice.impuestoTrasladado || 0;
    
    // For ISR, calculate based on IVA ÷ 0.16, fallback to subtotal if no IVA exists
    const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
    
    // For IVA, always calculated as 16% of gravadoISR
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    
    return { gravadoIVA, gravadoISR };
  }, [invoiceHelpers]);
  
  // Process and filter invoices - using useMemo for better performance
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount } = useMemo(() => {
    // Merge original invoices with updated ones
    const mergedInvoices = invoices.map(invoice => updatedInvoices[invoice.id] || invoice);
    
    // Filter for current year and received invoices only
    const filtered = mergedInvoices.filter(invoice => {
      try {
        return new Date(invoice.fecha).getFullYear() === year && invoice.recibida;
      } catch (error) { return false; }
    });
    
    // Calculate total amount and group by month
    const total = filtered.reduce((sum, invoice) => sum + invoice.total, 0);
    const byMonth: Record<number, Invoice[]> = {};
    
    filtered.forEach(invoice => {
      try {
        const month = new Date(invoice.fecha).getMonth() + 1;
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(invoice);
      } catch (e) { /* Skip invalid dates */ }
    });
    
    // Sort invoices within each month
    Object.values(byMonth).forEach(monthInvoices => {
      monthInvoices.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    });
    
    // Get sorted month numbers
    const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
    
    return { filteredInvoices: filtered, invoicesByMonth: byMonth, sortedMonths: months, totalAmount: total };
  }, [invoices, updatedInvoices, year]);

  // Date and month utilities - consolidated
  const dateUtils = useMemo(() => ({
    getMonth: (dateString: string) => new Date(dateString).getMonth() + 1,
    getMonthName: (month: number) => format(new Date(year, month - 1, 1), 'MMMM', { locale: es }),
    getMonthAbbreviation: (month: number) => {
      if (month === 13) return 'ANUAL';
      return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month - 1] || '';
    }
  }), [year]);

  // Tax totals calculation - using useMemo for better performance
  const monthlyTaxTotals = useMemo(() => {
    const totals: Record<number, { isr: number; iva: number }> = {};
    
    // Initialize all months
    for (let i = 1; i <= 13; i++) totals[i] = { isr: 0, iva: 0 };
    
    // Calculate totals
    filteredInvoices.forEach(invoice => {
      if (invoice.mesDeduccion && !invoice.estaCancelado) {
        totals[invoice.mesDeduccion].isr += invoice.gravadoISR || 0;
        totals[invoice.mesDeduccion].iva += invoice.gravadoIVA || 0;
      }
    });
    
    return totals;
  }, [filteredInvoices]);

  // Invoice interaction handlers - use useCallback for event handlers
  const handleInvoiceClick = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }, []);

  const handleUpdateInvoice = useCallback((updatedInvoice: Invoice) => {
    setUpdatedInvoices(prev => {
      const newState = { ...prev, [updatedInvoice.id]: updatedInvoice };
      if (selectedInvoice?.id === updatedInvoice.id) setSelectedInvoice(updatedInvoice);
      return newState;
    });
  }, [selectedInvoice]);

  const handleLockToggle = useCallback((e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    handleUpdateInvoice({ ...invoice, locked: !invoice.locked });
  }, [handleUpdateInvoice]);

  const handleMonthSelect = useCallback((invoiceId: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    const isDeducible = month !== "none";
    let updatedInvoice = {
      ...invoice,
      mesDeduccion: month === "none" ? undefined : parseInt(month),
      esDeducible: isDeducible,
    };
    
    if (isDeducible) {
      // Calculate the gravado values using the correct formula
      const { gravadoISR, gravadoIVA } = calculateGravados(updatedInvoice);
      updatedInvoice = {
        ...updatedInvoice,
        gravadoISR,
        gravadoIVA
      };
    } else {
      // If not deductible, set gravado values to 0
      updatedInvoice = {
        ...updatedInvoice,
        gravadoISR: 0,
        gravadoIVA: 0
      };
    }
    
    handleUpdateInvoice(updatedInvoice);
  }, [filteredInvoices, calculateGravados, handleUpdateInvoice]);

  const handleGravadoDoubleClick = useCallback((invoice: Invoice) => {
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice)) return;
    
    setInvoiceForDeductibility(invoice);
    setIsDeductibilityEditorOpen(true);
  }, [invoiceHelpers]);

  // Auto-assignment of payment months - simplified logic
  useEffect(() => {
    if (!invoices || invoices.length === 0) return;
    
    // Create a lookup of payment complements for faster access
    const paymentComplements = invoices.filter(inv => inv.tipoDeComprobante === 'P');
    const paymentMap = new Map<string, Date[]>();
    
    paymentComplements.forEach(pc => {
      if (!pc.docsRelacionadoComplementoPago) return;
      
      pc.docsRelacionadoComplementoPago.forEach(uuid => {
        const key = uuid.toUpperCase();
        const paymentDate = new Date(pc.fecha);
        
        if (!paymentMap.has(key)) {
          paymentMap.set(key, [paymentDate]);
        } else {
          paymentMap.get(key)?.push(paymentDate);
        }
      });
    });
    
    // Process each invoice that needs a payment month
    const updates: Record<string, Invoice> = {};
    
    invoices.forEach(invoice => {
      // Skip if already processed or is a payment complement
      if (invoice.tipoDeComprobante === 'P' || 
          invoice.mesDeduccion !== undefined || 
          updatedInvoices[invoice.id]?.mesDeduccion !== undefined) return;
      
      // Check if this invoice has payment complements
      const paymentDates = paymentMap.get(invoice.uuid.toUpperCase());
      
      if (paymentDates?.length) {
        // Use the earliest payment date's month
        const earliestMonth = Math.min(...paymentDates.map(d => d.getMonth() + 1));
        const baseInvoice = {
          ...invoice,
          mesDeduccion: earliestMonth,
          esDeducible: true,
          pagado: true
        };
        
        const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
        updates[invoice.id] = { ...baseInvoice, gravadoISR, gravadoIVA };
      } 
      // Handle special cases
      else if (invoiceHelpers.isNonDeductible(invoice)) {
        updates[invoice.id] = {
          ...invoice,
          mesDeduccion: undefined,
          esDeducible: false
        };
      } else if (invoiceHelpers.isAnnualDeduction(invoice)) {
        updates[invoice.id] = {
          ...invoice,
          mesDeduccion: 13, // Annual
          esDeducible: true
        };
      } else if (invoiceHelpers.isPUEPayment(invoice)) {
        const invoiceMonth = new Date(invoice.fecha).getMonth() + 1;
        const baseInvoice = {
          ...invoice,
          mesDeduccion: invoiceMonth,
          esDeducible: true
        };
        
        const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
        updates[invoice.id] = { ...baseInvoice, gravadoISR, gravadoIVA };
      } else if (invoice.metodoPago === 'PPD') {
        updates[invoice.id] = {
          ...invoice,
          mesDeduccion: undefined,
          esDeducible: false
        };
      }
    });
    
    // Only update state if we have changes
    if (Object.keys(updates).length > 0) {
      console.log("Auto-assigning payment months to", Object.keys(updates).length, "invoices");
      setUpdatedInvoices(prev => ({ ...prev, ...updates }));
    }
  }, [invoices, year, updatedInvoices, calculateGravados, invoiceHelpers]);

  // Render helper function for invoice row - simplifies the render logic
  const renderInvoiceRow = useCallback((invoice: Invoice, index: number) => {
    const isS01 = invoice.usoCFDI === 'S01';
    const isComplement = invoiceHelpers.isPaymentComplement(invoice);
    
    return (
      <tr
        key={invoice.id}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${isS01 ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-400' : 'bg-white dark:bg-gray-950'}
                  ${invoice.locked ? 'opacity-80' : ''}
                  ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
                  ${highlightedPaymentComplements.includes(invoice.uuid) ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}`}
      >
        {/* Lock Button */}
        <td className="px-2 py-1 align-middle text-center">
          {isS01 || isComplement ? (
            <span className="h-7 w-7 block"></span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => handleLockToggle(e, invoice)}
              disabled={invoice.estaCancelado}
            >
              {invoice.locked ? 
                <Lock className="h-4 w-4 text-amber-600" /> : 
                <Unlock className="h-4 w-4 text-gray-400" />}
            </Button>
          )}
        </td>
        
        {/* Invoice Info */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className={isS01 ? "text-gray-400" : ""}>{format(new Date(invoice.fecha), 'dd/MM/yyyy')}</span>
            <button 
              className={`hover:text-blue-700 text-xs text-left ${isS01 ? "text-gray-400" : "text-blue-500"}`}
              onClick={() => handleInvoiceClick(invoice)}
            >
              {invoice.uuid.substring(0, 8)}... ({invoice.tipoDeComprobante})
            </button>
          </div>
        </td>

        {/* Emisor */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className={`truncate max-w-[40ch] ${isS01 ? "text-gray-400" : ""}`}>
              {invoice.nombreEmisor} ({invoice.regimenFiscal || 'N/A'})
            </span>
            <span className={isS01 ? "text-gray-400" : "text-gray-500 text-xs"}>
              {invoice.rfcEmisor}
            </span>
          </div>
        </td>

        {/* Uso/Pago */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className={`${isS01 ? "text-gray-400" : "font-medium"}`}>
              {invoice.usoCFDI}
            </span>
            {!isComplement && !isS01 && (
              <div className="flex items-center gap-1">
                <span className={`text-xs ${
                  invoiceHelpers.needsPaymentComplement(invoice) ? 'text-red-500 font-medium' : 
                  invoiceHelpers.isPaidPPDInvoice(invoice) ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {invoice.formaPago} / {invoice.metodoPago}
                  {invoiceHelpers.needsPaymentComplement(invoice) && ' ⚠️'}
                  {invoiceHelpers.isPaidPPDInvoice(invoice) && (
                    <Check className="h-3 w-3 inline ml-1 text-blue-600" />
                  )}
                </span>
              </div>
            )}
          </div>
        </td>

        {/* Concepto */}
        <td className="px-2 py-1 align-middle">
          {isComplement 
            ? <span className="text-gray-400">Comp. de Pago</span>
            : isS01 ? (
              <span className="text-sm text-gray-400 italic">Sin efectos fiscales</span>
            ) : (
              <span className="text-sm truncate max-w-[48ch]">{invoice.concepto || invoice.descripcion || 'Sin concepto'}</span>
            )}
        </td>
        
        {/* Categoría */}
        <td className="px-2 py-1 align-middle">
          {isComplement || isS01
            ? <span></span>
            : <span className="text-sm truncate max-w-[48ch]">{invoice.categoria || 'Sin categoría'}</span>
          }
        </td>

        {/* SubTotal */}
        <td className="px-2 py-1 align-middle text-right">
          {isComplement 
            ? <span></span>
            : <span className={isS01 ? "text-gray-400" : ""}>
                ${invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
          }
        </td>

        {/* Impuestos */}
        <td className="px-2 py-1 align-middle">
          {isComplement ? (
            <span></span>
          ) : (
            <div className={`flex flex-col text-xs text-right ${isS01 ? "text-gray-400" : ""}`}>
              <span>+IVA: ${(invoice.impuestoTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span>-IVA: ${(invoice.ivaRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span>-ISR: ${(invoice.isrRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </td>
        
        {/* Total */}
        <td className="px-2 py-1 align-middle text-right font-medium">
          {isComplement 
            ? <span></span>
            : <span className={isS01 ? "text-gray-400" : ""}>
                ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
          }
        </td>
        
        {/* Mes Pago */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement || isS01 ? (
            <span></span>
          ) : (
            <div className="flex flex-col items-center">
              <Select
                value={invoice.mesDeduccion?.toString() || "none"}
                onValueChange={(value) => handleMonthSelect(invoice.id, value)}
                onClick={(e) => e.stopPropagation()}
                disabled={invoice.locked}
              >
                <SelectTrigger className="h-7 w-24 text-xs mx-auto">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = i+1;
                    const needsWarning = invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice);
                    return (
                      <SelectItem key={monthNum} value={monthNum.toString()}>
                        {dateUtils.getMonthAbbreviation(monthNum)}{needsWarning ? " (Sin CP)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
        </td>
        
        {/* Deducible Status */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement || isS01 ? (
            <span></span>
          ) : (
            <Badge variant="outline" className={`
              ${invoice.esDeducible ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}
            `}>
              {invoice.esDeducible ? 'Sí' : 'No'}
            </Badge>
          )}
        </td>
        
        {/* Gravado ISR */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : <>${
              invoiceHelpers.isDeducible(invoice) 
              ? invoice.gravadoISR || 0
              : '0.00'
              }</>
          }
        </td>

        {/* Gravado IVA */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : <>${
              invoiceHelpers.isDeducible(invoice)
              ? invoice.gravadoIVA || 0
              : '0.00'
              }</>
          }
        </td>
      </tr>
    );
  }, [dateUtils, handleGravadoDoubleClick, handleInvoiceClick, handleLockToggle, handleMonthSelect, highlightedPaymentComplements, invoiceHelpers]);

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium whitespace-nowrap">Facturas Recibidas {year}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
                Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Badge>
              {!disableExport && <ExportInvoicesExcel invoices={filteredInvoices} year={year} fileName={`Gastos_${year}.xlsx`} />}
            </div>
          </div>

          {/* Table */}
          <div className="relative">
            <div className="max-h-[70vh] overflow-y-auto">
              <table className="w-full text-xs relative">
                <thead className="sticky top-0 z-20">
                  <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-12">Lock</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Factura</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Emisor</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Uso/Pago</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Concepto</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">SubTotal</th>
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Impuestos</th>
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Mes Pago</th>
                    <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Deducible</th>
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado ISR</th>
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado IVA</th>
                  </tr>
                </thead>
                <tbody className="mt-1">
                  {sortedMonths.length > 0 ? (
                    sortedMonths.map((month) => (
                      <React.Fragment key={month}>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <td colSpan={13} className="px-2 py-1.5 font-medium">{dateUtils.getMonthName(month)}</td>
                        </tr>
                        
                        {invoicesByMonth[month].map(renderInvoiceRow)}
                        
                        {/* Monthly Totals */}
                        <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                          <td colSpan={13} className="px-2 py-1.5 text-right text-gray-500">
                            Total Deducible: ISR ${monthlyTaxTotals[month].isr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}   &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                            IVA ${monthlyTaxTotals[month].iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={13} className="px-2 py-4 text-center text-gray-500 text-xs">
                        No se encontraron facturas CFDI recibidas para el año {year} con los filtros actuales
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modals */}
        <InvoicePreviewModal
          invoice={selectedInvoice}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateInvoice}
        />
        
        <InvoiceDeductibilityEditor
          invoice={invoiceForDeductibility}
          isOpen={isDeductibilityEditorOpen}
          onClose={() => setIsDeductibilityEditorOpen(false)}
          onSave={handleUpdateInvoice}
        />
      </div>
    </TooltipProvider>
  );
}

