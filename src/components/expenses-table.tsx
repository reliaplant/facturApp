"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { invoiceService } from "@/services/invoice-service"; // Add this import
import { useToast } from "@/components/ui/use-toast"; // Make sure this is imported

interface ExpensesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
  clientId: string; // Add this prop
}

export function ExpensesTable({ year, invoices = [], disableExport = false, clientId }: ExpensesTableProps) {
  // State declarations
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const [highlightedPaymentComplements, setHighlightedPaymentComplements] = useState<string[]>([]);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isDeductibilityEditorOpen, setIsDeductibilityEditorOpen] = useState(false);
  const [invoiceForDeductibility, setInvoiceForDeductibility] = useState<Invoice | null>(null);
  const { toast } = useToast(); // Make sure we have the toast

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
    isAnnualDeduction: (invoice: Invoice) => invoice.anual || invoice.usoCFDI?.startsWith('D'),
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

  // Update the utility function to calculate gravadoIVA and gravadoISR with special handling for annual invoices
  const calculateGravados = useCallback((invoice: Invoice) => {
    if (!invoiceHelpers.isDeducible(invoice)) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    // If it's an annual deduction (tipo D), always return 0 for both values
    if (invoice.anual || invoice.usoCFDI?.startsWith('D')) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    // For regular deductible invoices, calculate normally
    const ivaValue = invoice.impuestoTrasladado || 0;
    const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    
    return { gravadoIVA, gravadoISR };
  }, [invoiceHelpers]);
  
  // Process and filter invoices - using useMemo for better performance
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount } = useMemo(() => {
    // Merge original invoices with updated ones
    const mergedInvoices = invoices.map(invoice => updatedInvoices[invoice.uuid] || invoice);
    
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
      const newState = { ...prev, [updatedInvoice.uuid]: updatedInvoice };
      if (selectedInvoice?.uuid === updatedInvoice.uuid) setSelectedInvoice(updatedInvoice);
      return newState;
    });
  }, [selectedInvoice]);

  // Update the handlers to use the single updateInvoice method
  const handleLockToggle = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    const newLockedStatus = !invoice.locked;
    
    try {
      await invoiceService.updateInvoice(clientId, invoice.uuid, { locked: newLockedStatus });
      handleUpdateInvoice({ ...invoice, locked: newLockedStatus });
      
      toast({
        title: newLockedStatus ? "Factura bloqueada" : "Factura desbloqueada",
        description: "El estado de la factura se ha actualizado correctamente.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating lock status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la factura.",
        variant: "destructive",
      });
    }
  }, [handleUpdateInvoice, clientId, toast]);

  // Simplified month selection handler
  const handleMonthSelect = useCallback(async (invoiceId: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.uuid === invoiceId);
    if (!invoice) return;
    
    const isDeducible = month !== "none";
    const numericMonth = isDeducible ? parseInt(month) : undefined; // Change from null to undefined
    
    try {
      let updateData: Partial<Invoice> = {
        mesDeduccion: numericMonth,
        esDeducible: isDeducible
      };
      
      if (isDeducible) {
        const { gravadoISR, gravadoIVA } = calculateGravados({...invoice, ...updateData});
        updateData = {
          ...updateData,
          gravadoISR,
          gravadoIVA,
          gravadoModificado: false
        };
      } else {
        updateData.gravadoISR = 0;
        updateData.gravadoIVA = 0;
        updateData.gravadoModificado = false;
      }
      
      // Single update call
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
      
      toast({
        title: "Actualizado",
        description: isDeducible ? `Factura asignada al mes ${month}` : "Factura sin mes asignado",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating month:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el mes de la factura",
        variant: "destructive"
      });
    }
  }, [filteredInvoices, calculateGravados, handleUpdateInvoice, clientId, toast]);

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
          updatedInvoices[invoice.uuid]?.mesDeduccion !== undefined) return;
      
      // Check if this is a type D invoice (annual deduction)
      const isAnnualType = invoice.usoCFDI?.startsWith('D');
      
      if (isAnnualType) {
        // For type D invoices, apply special rules
        if (invoice.metodoPago === 'PUE' && invoice.formaPago === '03') {
          // PUE (Pago en una sola exhibición) + 03 (Transfer) = Automatically deducible, mark as annual
          const invoiceMonth = new Date(invoice.fecha).getMonth() + 1;
          const baseInvoice = {
            ...invoice,
            mesDeduccion: invoiceMonth, // Use invoice month as payment month
            esDeducible: true,          // Mark as deducible
            anual: true                 // Mark as annual
          };
          
          const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
          updates[invoice.uuid] = { ...baseInvoice, gravadoISR, gravadoIVA };
        } 
        else if (invoice.formaPago === '01') {
          // If payment form is 01 (Cash), type D is NEVER deducible
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: undefined,
            esDeducible: false,
            anual: true // Still mark as annual type for reference
          };
        }
        else if (invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice)) {
          // PPD without complement - not deducible yet
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: undefined,
            esDeducible: false,
            anual: true // Still mark as annual type for reference
          };
        }
        else {
          // Default for other cases - keep as annual but wait for user decision
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: undefined,
            esDeducible: false,
            anual: true
          };
        }
      }
      // For non-type D invoices, continue with existing logic
      else {
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
          updates[invoice.uuid] = { ...baseInvoice, gravadoISR, gravadoIVA };
        } 
        // Handle special cases
        else if (invoiceHelpers.isNonDeductible(invoice)) {
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: undefined,
            esDeducible: false
          };
        } else if (invoiceHelpers.isAnnualDeduction(invoice)) {
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: 13, // Annual
            esDeducible: true, // Always mark them as deductible
            anual: true // Set the new anual field
          };
        } else if (invoiceHelpers.isPUEPayment(invoice)) {
          const invoiceMonth = new Date(invoice.fecha).getMonth() + 1;
          const baseInvoice = {
            ...invoice,
            mesDeduccion: invoiceMonth,
            esDeducible: true
          };
          
          const { gravadoISR, gravadoIVA } = calculateGravados(baseInvoice);
          updates[invoice.uuid] = { ...baseInvoice, gravadoISR, gravadoIVA };
        } else if (invoice.metodoPago === 'PPD') {
          updates[invoice.uuid] = {
            ...invoice,
            mesDeduccion: undefined,
            esDeducible: false
          };
        }
      }
    });
    
    // Only update state if we have changes
    if (Object.keys(updates).length > 0) {
      console.log("Auto-assigning payment months to", Object.keys(updates).length, "invoices");
      setUpdatedInvoices(prev => ({ ...prev, ...updates }));
    }
  }, [invoices, year, updatedInvoices, calculateGravados, invoiceHelpers]);

  // Simplified deductible toggle handler
  const handleToggleDeductible = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice) || invoice.usoCFDI === 'S01') {
      return;
    }
    
    try {
      const isCurrentlyDeducible = invoice.esDeducible;
      const isAnnualType = invoiceHelpers.isAnnualDeduction(invoice);
      
      let updateData: Partial<Invoice> = {
        esDeducible: !isCurrentlyDeducible,
        anual: isAnnualType ? true : invoice.anual
      };
      
      if (!isCurrentlyDeducible) {
        // Turning on deductible status
        const currentMonth = isAnnualType ? 13 : (invoice.mesDeduccion || new Date().getMonth() + 1);
        updateData.mesDeduccion = currentMonth;
        
        const { gravadoISR, gravadoIVA } = calculateGravados({
          ...invoice,
          ...updateData,
          mesDeduccion: currentMonth
        });
        
        updateData.gravadoISR = gravadoISR;
        updateData.gravadoIVA = gravadoIVA;
        updateData.gravadoModificado = false;
      } else {
        // Turning off deductible status
        updateData.gravadoISR = 0;
        updateData.gravadoIVA = 0;
        updateData.gravadoModificado = false;
        // Keep mesDeduccion as is
      }
      
      // Update in one call
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
      
      toast({
        title: "Actualizado",
        description: !isCurrentlyDeducible 
          ? (isAnnualType ? "Factura marcada como deducción anual" : "Factura marcada como deducible")
          : "Factura marcada como no deducible",
        variant: "default"
      });
    } catch (error) {
      console.error("Error updating deductible status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de deducibilidad",
        variant: "destructive"
      });
    }
  }, [handleUpdateInvoice, calculateGravados, invoiceHelpers, clientId, toast]);

  // Add handler for clicking on a PPD invoice to find its payment complement
  const handleFindPaymentComplement = useCallback((invoice: Invoice) => {
    // Only proceed if this is a PPD invoice with a payment complement
    if (!invoiceHelpers.isPaidPPDInvoice(invoice)) return;
    
    // Find the payment complement invoices for this invoice
    const paymentComplements = invoices.filter(
      pc => pc.tipoDeComprobante === 'P' && 
            pc.docsRelacionadoComplementoPago?.some(
              uuid => uuid.toUpperCase() === invoice.uuid.toUpperCase()
            )
    );
    
    if (paymentComplements.length === 0) return;
    
    // Get the first payment complement
    const paymentComplement = paymentComplements[0];
    
    // Scroll to the payment complement element
    const complementElement = document.getElementById(`payment-complement-${paymentComplement.uuid}`);
    if (complementElement) {
      complementElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the payment complement
      setHighlightedPaymentComplements([paymentComplement.uuid]);
      
      // Clear previous timer if exists
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      
      // Set timeout to remove highlight after 3 seconds
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedPaymentComplements([]);
      }, 2000);
    }
  }, [invoices, invoiceHelpers]);
  
  // Clean up the timer on component unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Render helper function for invoice row - simplifies the render logic
  const renderInvoiceRow = useCallback((invoice: Invoice, index: number) => {
    const isS01 = invoice.usoCFDI === 'S01';
    const isComplement = invoiceHelpers.isPaymentComplement(invoice);
    const isAnnualDeduction = invoice.usoCFDI?.startsWith('D');
    const needsComplement = invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice);
    const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && invoiceHelpers.isPaidWithComplement(invoice);
    
    return (
      <tr
        key={invoice.uuid}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${isS01 ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-400' : 'bg-white dark:bg-gray-950'}
                  ${invoice.locked ? 'opacity-80' : ''}
                  ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
                  ${hasComplement ? '!bg-blue-50/30 dark:!bg-blue-900/30 cursor-pointer' : ''}
                  ${highlightedPaymentComplements.includes(invoice.uuid) ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}`}
        onClick={hasComplement ? () => handleFindPaymentComplement(invoice) : undefined}
      >
        {/* Lock Button - Updated styling */}
        <td className="pl-7 px-2 py-1 align-middle text-center">
          {isS01 || isComplement ? (
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
              <span className="text-sm truncate max-w-[48ch]">{invoice.concepto || 'Sin concepto'}</span>
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
        
        {/* Mes Pago - update to show red text when no complement */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement || isS01 ? (
            <span></span>
          ) : (
            <div className="flex flex-col items-center">
              <div onClick={(e) => e.stopPropagation()}>
                <Select
                  value={invoice.mesDeduccion?.toString() || "none"}
                  onValueChange={(value) => handleMonthSelect(invoice.uuid, value)}
                  disabled={invoice.locked}
                >
                <SelectTrigger className={`h-7 w-24 text-xs mx-auto ${needsComplement ? 'text-red-500' : ''}`}>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = i+1;
                    return (
                      <SelectItem 
                        key={monthNum} 
                        value={monthNum.toString()}
                        className={needsComplement ? 'text-red-500' : ''}
                      >
                        {dateUtils.getMonthAbbreviation(monthNum)}
                        {needsComplement ? " (Sin CP)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </td>
        
        {/* Deducible Status with special handling for annual deductions */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement || isS01 ? (
            <span></span>
          ) : (
            <Badge 
              variant="outline" 
              className={`
                cursor-pointer hover:opacity-80 transition-opacity
                ${(isAnnualDeduction && invoice.esDeducible)
                  ? 'bg-purple-50 text-purple-700 border-purple-300' // Tipo D y deducible -> morado
                  : invoice.esDeducible 
                    ? 'bg-green-50 text-green-700 border-green-300' // No tipo D y deducible -> verde
                    : 'bg-red-50 text-red-700 border-red-300' // No deducible -> rojo (incluso si es tipo D)
                }
              `}
              onClick={(e) => handleToggleDeductible(e, invoice)}
            >
              {(isAnnualDeduction && invoice.esDeducible)
                ? 'Anual' 
                : invoice.esDeducible 
                  ? 'Sí' 
                  : 'No'
              }
            </Badge>
          )}
        </td>
        
        {/* Gravado ISR - update to show zeros for annual deductions */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : (isAnnualDeduction && invoice.esDeducible)
              ? <span className="text-gray-400">$0.00 (Anual)</span>
              : <span>
                  ${invoiceHelpers.isDeducible(invoice) 
                    ? invoice.gravadoISR || 0
                    : '0.00'
                  }
                  {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
                </span>
          }
        </td>

        {/* Gravado IVA - update to show zeros for annual deductions */}
        <td 
          className="pr-7 px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : (isAnnualDeduction && invoice.esDeducible)
              ? <span className="text-gray-400">$0.00 (Anual)</span>
              : <span>
                  ${invoiceHelpers.isDeducible(invoice)
                    ? invoice.gravadoIVA || 0
                    : '0.00'
                  }
                  {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
                </span>
          }
        </td>
      </tr>
    );
  }, [
    dateUtils,
    handleGravadoDoubleClick,
    handleInvoiceClick,
    handleLockToggle,
    handleMonthSelect,
    highlightedPaymentComplements,
    invoiceHelpers,
    handleToggleDeductible,
    handleFindPaymentComplement  // Add this dependency
  ]);

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
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
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-12">Lock</th>
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
                  <th className="pr-7 px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado IVA</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {sortedMonths.length > 0 ? (
                  sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <td colSpan={13} className="pl-7 px-2 py-1.5 font-medium">{dateUtils.getMonthName(month)}</td>
                      </tr>
                      
                      {invoicesByMonth[month].map(renderInvoiceRow)}
                      
                      {/* Monthly Totals */}
                      <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                        <td colSpan={13} className="px-7 py-1.5 text-right text-gray-500">
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
  );
}

