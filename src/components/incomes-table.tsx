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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDeductibilityEditor } from "@/components/invoice-deductibility-editor";

interface IncomesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
}

export function IncomesTable({ year, invoices = [], disableExport = false }: IncomesTableProps) {
  // State management - grouped related state together
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const [isDeductibilityEditorOpen, setIsDeductibilityEditorOpen] = useState(false);
  const [invoiceForDeductibility, setInvoiceForDeductibility] = useState<Invoice | null>(null);

  // Load/Save from localStorage - simplified with error handling
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedEmittedInvoices_${year}`);
      if (savedInvoices) setUpdatedInvoices(JSON.parse(savedInvoices));
    } catch (error) { /* Ignore storage errors */ }
  }, [year]);
  
  useEffect(() => {
    if (Object.keys(updatedInvoices).length === 0) return;
    try {
      localStorage.setItem(`updatedEmittedInvoices_${year}`, JSON.stringify(updatedInvoices));
    } catch (error) { /* Ignore storage errors */ }
  }, [updatedInvoices, year]);

  // Helper functions - memoized for better performance
  const invoiceHelpers = useMemo(() => ({
    isPaymentComplement: (invoice: Invoice) => invoice.tipoDeComprobante === 'P',
    isPaidWithComplement: (invoice: Invoice) => 
      (!!invoice.pagadoConComplementos && invoice.pagadoConComplementos.length > 0) ||
      invoices.some(pc => pc.tipoDeComprobante === 'P' && 
                 pc.docsRelacionadoComplementoPago?.some(uuid => 
                   uuid.toUpperCase() === invoice.uuid.toUpperCase())),
    isPaidPPDInvoice: (invoice: Invoice) => 
      invoice.metodoPago === 'PPD' && 
      ((!!invoice.pagadoConComplementos && invoice.pagadoConComplementos.length > 0) ||
       invoices.some(pc => pc.tipoDeComprobante === 'P' && 
                 pc.docsRelacionadoComplementoPago?.some(uuid => 
                   uuid.toUpperCase() === invoice.uuid.toUpperCase()))),
    isAnnualDeduction: (invoice: Invoice) => invoice.anual || invoice.usoCFDI?.startsWith('D'),
  }), [invoices]);

  // Date utilities - memoized
  const dateUtils = useMemo(() => ({
    getMonth: (dateString: string): number => new Date(dateString).getMonth() + 1,
    getMonthName: (month: number): string => format(new Date(year, month - 1, 1), 'MMMM', { locale: es }),
    getMonthAbbreviation: (month: number): string => {
      if (month === 13) return 'ANUAL';
      return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month - 1] || '';
    }
  }), [year]);

  // Process and filter invoices - memoized
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount } = useMemo(() => {
    // Merge original invoices with updated ones
    const mergedInvoices = invoices.map(invoice => updatedInvoices[invoice.uuid] || invoice);
    
    // Filter for current year and emitted invoices only
    const filtered = mergedInvoices.filter(invoice => {
      try {
        return new Date(invoice.fecha).getFullYear() === year && !invoice.recibida;
      } catch (error) { return false; }
    });
    
    // Calculate total amount and group by month
    const total = filtered.reduce((sum, invoice) => sum + invoice.total, 0);
    const byMonth: Record<number, Invoice[]> = {};
    
    filtered.forEach(invoice => {
      try {
        const month = dateUtils.getMonth(invoice.fecha);
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
  }, [invoices, updatedInvoices, year, dateUtils]);

  // Calculate gravados function for consistent calculation
  const calculateGravados = useCallback((invoice: Invoice) => {
    const ivaValue = invoice.impuestoTrasladado || 0;
    const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    return { gravadoISR, gravadoIVA };
  }, []);

  // Tax totals calculation - memoized
  const monthlyTaxTotals = useMemo(() => {
    const totals: Record<number, { isr: number; iva: number }> = {};
    
    // Initialize all months
    for (let i = 1; i <= 13; i++) totals[i] = { isr: 0, iva: 0 };
    
    // Calculate totals
    filteredInvoices.forEach(invoice => {
      if (invoice.mesDeduccion && !invoice.estaCancelado && invoice.esDeducible) {
        totals[invoice.mesDeduccion].isr += invoice.gravadoISR || invoice.subTotal;
        totals[invoice.mesDeduccion].iva += invoice.gravadoIVA || (invoice.impuestoTrasladado || 0);
      }
    });
    
    return totals;
  }, [filteredInvoices]);

  // Event handlers - all using useCallback for better performance
  const handleInvoiceClick = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }, []);

  const handleUpdateInvoice = useCallback((updatedInvoice: Invoice) => {
    setUpdatedInvoices(prev => {
      const newState = { ...prev, [updatedInvoice.uuid]: updatedInvoice };
      if (selectedInvoice?.uuid === updatedInvoice.uuid) {
        setSelectedInvoice(updatedInvoice);
      }
      return newState;
    });
  }, [selectedInvoice]);

  const handleLockToggle = useCallback((e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    handleUpdateInvoice({ ...invoice, locked: !invoice.locked });
  }, [handleUpdateInvoice]);

  const handleMonthSelect = useCallback((invoiceUuid: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.uuid === invoiceUuid);
    if (!invoice) return;
    
    const isActive = month !== "none";
    let updatedInvoice = {
      ...invoice,
      mesDeduccion: isActive ? parseInt(month) : undefined,
      esDeducible: isActive
    };
    
    if (isActive) {
      // Calculate gravado values
      const { gravadoISR, gravadoIVA } = calculateGravados(updatedInvoice);
      updatedInvoice = {
        ...updatedInvoice,
        gravadoISR,
        gravadoIVA,
        gravadoModificado: false
      };
    } else {
      updatedInvoice = {
        ...updatedInvoice,
        gravadoISR: 0,
        gravadoIVA: 0,
        gravadoModificado: false
      };
    }
    
    handleUpdateInvoice(updatedInvoice);
  }, [filteredInvoices, calculateGravados, handleUpdateInvoice]);

  const handleGravadoDoubleClick = useCallback((invoice: Invoice) => {
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice)) return;
    
    setInvoiceForDeductibility(invoice);
    setIsDeductibilityEditorOpen(true);
  }, [invoiceHelpers]);

  // Toggle gravable status handler
  const handleToggleGravable = useCallback((e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice)) return;
    
    if (invoice.esDeducible) {
      // Turn off gravable status
      handleUpdateInvoice({
        ...invoice,
        esDeducible: false,
        gravadoISR: 0,
        gravadoIVA: 0,
        gravadoModificado: false
      });
    } else {
      // Turn on gravable status
      const currentMonth = invoice.mesDeduccion || dateUtils.getMonth(new Date().toISOString());
      const updatedInvoice = { ...invoice, esDeducible: true, mesDeduccion: currentMonth };
      const { gravadoISR, gravadoIVA } = calculateGravados(updatedInvoice);
      
      handleUpdateInvoice({
        ...updatedInvoice,
        gravadoISR,
        gravadoIVA,
        gravadoModificado: false
      });
    }
  }, [handleUpdateInvoice, calculateGravados, invoiceHelpers, dateUtils]);

  // Auto-assign PUE invoices to their issue month
  useEffect(() => {
    if (filteredInvoices.length === 0) return;
    
    const updatesNeeded: Record<string, Invoice> = {};
    
    filteredInvoices.forEach(invoice => {
      if (invoice.metodoPago === "PUE" && !invoice.mesDeduccion && !invoice.locked) {
        const month = dateUtils.getMonth(invoice.fecha);
        const baseInvoice = { ...invoice, mesDeduccion: month, esDeducible: true };
        const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
        
        updatesNeeded[invoice.uuid] = {
          ...baseInvoice,
          gravadoISR,
          gravadoIVA
        };
      }
    });
    
    if (Object.keys(updatesNeeded).length > 0) {
      setUpdatedInvoices(prev => ({ ...prev, ...updatesNeeded }));
    }
  }, [filteredInvoices, dateUtils, calculateGravados]);

  // Render invoice row - extracted and memoized
  const renderInvoiceRow = useCallback((invoice: Invoice) => {
    const isComplement = invoiceHelpers.isPaymentComplement(invoice);
    const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && invoiceHelpers.isPaidWithComplement(invoice);
    
    return (
      <tr
        key={invoice.uuid}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
                  ${hasComplement ? '!bg-blue-50/30 dark:!bg-blue-900/30' : ''}
                  ${invoice.locked ? 'opacity-80' : ''}`}
      >
        {/* Lock Button */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement ? (
            <span className="h-7 w-7 block"></span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${!invoice.locked ? 'bg-red-50 hover:bg-red-100' : ''}`}
              onClick={(e) => handleLockToggle(e, invoice)}
              disabled={invoice.estaCancelado}
            >
              {invoice.locked ? 
                <Lock className="h-4 w-4 text-gray-400" /> : 
                <Unlock className="h-4 w-4 text-red-500" />}
            </Button>
          )}
        </td>
        
        {/* Invoice Info */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span>{format(new Date(invoice.fecha), 'dd/MM/yyyy')}</span>
            <button 
              className="text-blue-500 hover:text-blue-700 text-xs text-left"
              onClick={() => handleInvoiceClick(invoice)}
            >
              {invoice.uuid.substring(0, 8)}... ({invoice.tipoDeComprobante})
            </button>
          </div>
        </td>

        {/* Receiver Info */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span>{invoice.nombreReceptor} ({invoice.regimenFiscalReceptor || 'N/A'})</span>
            <span className="text-gray-500 text-xs">
              {invoice.rfcReceptor}, CP: {invoice.domicilioFiscalReceptor || 'N/A'}
            </span>
          </div>
        </td>

        {/* Payment Type */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className="font-medium">{invoice.usoCFDI}</span>
            {!isComplement && (
              <span className={`text-xs ${
                invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice) 
                  ? 'text-red-500 font-medium' 
                  : invoiceHelpers.isPaidPPDInvoice(invoice) 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-500'
              }`}>
                {invoice.formaPago} / {invoice.metodoPago}
                {invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice) && ' ⚠️'}
                {invoiceHelpers.isPaidPPDInvoice(invoice) && (
                  <Check className="h-3 w-3 inline ml-1 text-blue-600" />
                )}
              </span>
            )}
          </div>
        </td>

        {/* Concept & Category */}
        <td className="px-2 py-1 align-middle">
          {isComplement 
            ? <span className="text-gray-400">Comp. de Pago</span>
            : <span className="text-sm">{invoice.concepto || invoice.descripcion || 'Sin concepto'}</span>
          }
        </td>
        <td className="px-2 py-1 align-middle">
          {isComplement ? <span></span> : <span className="text-sm">{invoice.categoria || 'Sin categoría'}</span>}
        </td>

        {/* Amount Cells */}
        <td className="px-2 py-1 align-middle text-right">
          {isComplement ? <span></span> : <span>${invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
        </td>
        <td className="px-2 py-1 align-middle">
          {isComplement ? <span></span> : (
            <div className="flex flex-col text-xs text-right">
              <span>+IVA: ${(invoice.impuestoTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span>-IVA: ${(invoice.ivaRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span>-ISR: ${(invoice.isrRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </td>
        <td className="px-2 py-1 align-middle text-right font-medium">
          {isComplement ? <span></span> : <span>${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>}
        </td>
        
        {/* Collection Month */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement ? <span></span> : (
            <Select
              value={invoice.mesDeduccion?.toString() || "none"}
              onValueChange={(value) => handleMonthSelect(invoice.uuid, value)}
              onClick={(e) => e.stopPropagation()}
              disabled={invoice.locked}
            >
              <SelectTrigger className={`h-7 w-20 text-xs mx-auto 
                ${invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice) ? 'text-red-500' : ''}`}
              >
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem 
                    key={i+1} 
                    value={(i+1).toString()}
                    className={invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice) ? 'text-red-500' : ''}
                  >
                    {dateUtils.getMonthAbbreviation(i+1)}
                    {invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice) ? " (Sin CP)" : ""}
                  </SelectItem>
                ))}
                <SelectItem value="13">ANUAL</SelectItem>
              </SelectContent>
            </Select>
          )}
        </td>
        
        {/* Gravado badge */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement ? <span></span> : (
            <Badge 
              variant="outline" 
              className={`cursor-pointer hover:opacity-80 transition-opacity
                ${invoice.esDeducible 
                  ? 'bg-green-50 text-green-700 border-green-300' 
                  : 'bg-red-50 text-red-700 border-red-300'
                }`}
              onClick={(e) => handleToggleGravable(e, invoice)}
            >
              {invoice.esDeducible ? 'Sí' : 'No'}
            </Badge>
          )}
        </td>
        
        {/* Gravado Values */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isComplement && handleGravadoDoubleClick(invoice)}
        >
          {isComplement ? <span></span> : (
            <span>
              ${invoice.mesDeduccion && invoice.esDeducible 
                ? (invoice.gravadoISR || invoice.subTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 }) 
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )}
        </td>
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isComplement && handleGravadoDoubleClick(invoice)}
        >
          {isComplement ? <span></span> : (
            <span>
              ${invoice.mesDeduccion && invoice.esDeducible 
                ? (invoice.gravadoIVA || (invoice.impuestoTrasladado || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 }) 
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )}
        </td>
      </tr>
    );
  }, [
    dateUtils,
    handleGravadoDoubleClick,
    handleInvoiceClick,
    handleLockToggle,
    handleMonthSelect,
    handleToggleGravable,
    invoiceHelpers
  ]);

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border">
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Facturas Emitidas {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Badge>
            
            {!disableExport && <ExportInvoicesExcel invoices={filteredInvoices} year={year} fileName={`Ingresos_${year}.xlsx`} />}
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
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Receptor</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Uso/Pago</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Concepto</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">SubTotal</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Impuestos</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Mes Cobro</th>
                  <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Ingreso</th>
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
                          Total Gravado: ISR ${monthlyTaxTotals[month].isr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}   &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                          IVA ${monthlyTaxTotals[month].iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="px-2 py-4 text-center text-gray-500 text-xs">
                      No se encontraron facturas CFDI emitidas para el año {year} con los filtros actuales
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
  );
}
