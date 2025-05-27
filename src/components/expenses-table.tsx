"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check, Tag, Calculator } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDeductibilityEditor } from "@/components/invoice-deductibility-editor";
import { invoiceService } from "@/services/invoice-service";
import { useToast } from "@/components/ui/use-toast";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { fiscalDataService } from '@/services/fiscal-data-service';
import { YearTaxData } from '@/models/fiscalData';

interface ExpensesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
  clientId: string;
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
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add this ref to track if we've loaded from Firebase in this session
  const initialLoadComplete = useRef(false);

  // Modify the useEffect to load from Firebase only on first mount
  useEffect(() => {
    // Only clear on the first load of the component
    if (!initialLoadComplete.current) {
      localStorage.removeItem(`updatedReceivedInvoices_${year}`);
      console.log("🧹 First load: Cleared localStorage");
      
      // Set all invoices from props as the baseline
      const initialData: Record<string, Invoice> = {};
      invoices.filter(inv => inv.recibida).forEach(invoice => {
        initialData[invoice.uuid] = invoice;
      });
      
      setUpdatedInvoices(initialData);
      localStorage.setItem(`updatedReceivedInvoices_${year}`, JSON.stringify(initialData));
      
      // Mark initial load as complete
      initialLoadComplete.current = true;
      console.log("📥 First load: Saved all invoices to localStorage");
    } else {
      // For subsequent renders, try to load from localStorage first
      try {
        console.log("🔄 Subsequent render: Trying to load from localStorage");
        const savedInvoices = localStorage.getItem(`updatedReceivedInvoices_${year}`);
        if (savedInvoices) {
          const parsedInvoices = JSON.parse(savedInvoices);
          setUpdatedInvoices(parsedInvoices);
          console.log("📤 Loaded saved invoices from localStorage");
        } else {
          console.log("⚠️ No saved invoices found in localStorage");
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error);
      }
    }

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [year, invoices]); // Add invoices as dependency
  
  // Keep the save to localStorage functionality
  useEffect(() => {
    if (Object.keys(updatedInvoices).length === 0) return;
    try {
      localStorage.setItem(`updatedReceivedInvoices_${year}`, JSON.stringify(updatedInvoices));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }, [updatedInvoices, year]);

  // Fetch categories
  useEffect(() => {
    categoryService.getAllCategories().then(setCategories).catch(() => {});
  }, [year]);
  ;

  // Helper functions for UI display and logic
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

  // Calculate gravados - needed for UI and local updates
  const calculateGravados = useCallback((invoice: Invoice) => {
    if (!invoiceHelpers.isDeducible(invoice)) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    if (invoice.anual || invoice.usoCFDI?.startsWith('D')) {
      return { gravadoIVA: 0, gravadoISR: 0 };
    }
    
    const ivaValue = invoice.impuestoTrasladado || 0;
    
    // Special case: when IVA is 0, gravado ISR is TOTAL and gravado IVA is 0
    if (ivaValue === 0) {
      return { 
        gravadoISR: invoice.total,  // Changed from subtotal to total
        gravadoIVA: 0
      };
    } 
    // When IVA exists, calculate normally
    else {
      const gravadoISR = Math.round(ivaValue / 0.16 * 100) / 100;
      const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
      return { gravadoIVA, gravadoISR };
    }
  }, [invoiceHelpers]);
  
  // Process and filter invoices - using useMemo for better performance
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount } = useMemo(() => {
    // Merge original invoices with updated ones - THIS IS CRITICAL FOR EDITING
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
  }, [invoices, updatedInvoices, year]); // RESTORED updatedInvoices dependency

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
    const totals: Record<number, { isr: number; iva: number; ieps: number }> = {};
    
    // Initialize all months
    for (let i = 1; i <= 13; i++) totals[i] = { isr: 0, iva: 0, ieps: 0 };
    
    // Calculate totals
    filteredInvoices.forEach(invoice => {
      if (invoice.mesDeduccion && !invoice.estaCancelado) {
        totals[invoice.mesDeduccion].isr += invoice.gravadoISR || 0;
        totals[invoice.mesDeduccion].iva += invoice.gravadoIVA || 0;
        totals[invoice.mesDeduccion].ieps += invoice.iepsTrasladado || 0; // Fix: use iepsTrasladado instead of impuestoIEPS
      }
    });
    
    return totals;
  }, [filteredInvoices]);

  // Invoice interaction handlers
  const handleInvoiceClick = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  }, []);

  // Function to calculate and update fiscal summary tax fields
  const updateFiscalSummaryTaxes = useCallback(async () => {
    if (!clientId || !year) return;
        
    // Initialize monthly totals with zero values for each month
    const monthlyTotals: Record<string, {
      isrDeducible: number;
      ivaDeducible: number;
    }> = {};
    
    // Create entries for months 1-12 (as strings to match the model)
    for (let month = 1; month <= 12; month++) {
      monthlyTotals[month.toString()] = {
        isrDeducible: 0,
        ivaDeducible: 0
      };
    }
    
    // Calculate totals by month from filtered invoices
    filteredInvoices.forEach(invoice => {
      // Skip if not deductible, canceled, or missing month
      if (!invoice.esDeducible || invoice.estaCancelado || !invoice.mesDeduccion) return;
      
      // Skip annual deductions (month 13) since they're handled separately
      if (invoice.mesDeduccion === 13) return;
      
      // Get month as string key
      const monthKey = invoice.mesDeduccion.toString();
      
      // Add tax values to monthly totals
      monthlyTotals[monthKey].isrDeducible += invoice.gravadoISR || 0;
      monthlyTotals[monthKey].ivaDeducible += invoice.gravadoIVA || 0;
    });
    
    try {
      // Update fiscal summary document with expense tax data
      await fiscalDataService.updateFiscalSummaryFields(clientId, year, (existingData) => {
        // Create base data if none exists
        const baseData: YearTaxData = existingData || {
          clientId,
          year,
          months: {}
        };
        
        // Ensure months object exists
        if (!baseData.months) baseData.months = {};
        
        // Update each month's expense tax fields
        Object.entries(monthlyTotals).forEach(([month, taxData]) => {
          // Create month object if it doesn't exist
          if (!baseData.months[month]) {
            baseData.months[month] = {};
          }
          
          // Update only expense tax fields, preserving other data
          baseData.months[month] = {
            ...baseData.months[month],
            isrDeducible: taxData.isrDeducible,
            ivaDeducible: taxData.ivaDeducible
          };
        });
        
        return baseData;
      });
      
    } catch (error) {
      console.error("Error updating fiscal summary:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos fiscales",
        variant: "destructive"
      });
    }
  }, [clientId, year, filteredInvoices, toast]);
  
  // Debounced version of the update function to avoid too many writes
  const debouncedUpdateFiscalSummary = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      updateFiscalSummaryTaxes();
    }, 2000); // 2 second debounce
  }, [updateFiscalSummaryTaxes]);

  // Trigger update when filtered invoices change
  useEffect(() => {
    debouncedUpdateFiscalSummary();
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [filteredInvoices, debouncedUpdateFiscalSummary]);

  // NOW we can define handlers that use debouncedUpdateFiscalSummary
  const handleUpdateInvoice = useCallback(async (updatedInvoice: Invoice) => {
    console.log("Saving invoice to Firebase:", updatedInvoice.uuid);
    
    try {
      // 1. First save to Firebase
      await invoiceService.updateInvoice(clientId, updatedInvoice.uuid, {
        esDeducible: updatedInvoice.esDeducible,
        mesDeduccion: updatedInvoice.mesDeduccion,
        gravadoISR: updatedInvoice.gravadoISR,
        gravadoIVA: updatedInvoice.gravadoIVA,
        gravadoModificado: updatedInvoice.gravadoModificado,
        notasDeducibilidad: updatedInvoice.notasDeducibilidad,
        categoria: updatedInvoice.categoria,
        locked: updatedInvoice.locked
      });
      
      // 2. Update local state
      setUpdatedInvoices(prev => {
        const newState = { ...prev, [updatedInvoice.uuid]: updatedInvoice };
        
        // 3. Also update localStorage with the new state
        try {
          localStorage.setItem(`updatedReceivedInvoices_${year}`, JSON.stringify(newState));
          console.log("📝 Updated localStorage with new invoice data");
        } catch (e) {
          console.error("Error saving to localStorage:", e);
        }
        
        // 4. Update selected invoice if needed
        if (selectedInvoice?.uuid === updatedInvoice.uuid) {
          setSelectedInvoice(updatedInvoice);
        }
        
        // 5. Trigger fiscal summary update
        debouncedUpdateFiscalSummary();
        
        return newState;
      });
      
    } catch (error) {
      console.error("Error saving invoice to Firebase:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios en la base de datos.",
        variant: "destructive"
      });
    }
  }, [clientId, selectedInvoice, toast, debouncedUpdateFiscalSummary, year]);

  const handleLockToggle = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    try {
      const newLockedStatus = !invoice.locked;
      await invoiceService.updateInvoice(clientId, invoice.uuid, { locked: newLockedStatus });
      handleUpdateInvoice({ ...invoice, locked: newLockedStatus });
    } catch (error) {
      console.error("Error updating lock status:", error);
    }
  }, [handleUpdateInvoice, clientId]);

  const handleMonthSelect = useCallback(async (invoiceId: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.uuid === invoiceId);
    
    // CRITICAL: Skip if invoice not found or is locked
    if (!invoice || invoice.locked === true) {
      return;
    }
    
    try {
      const isDeducible = month !== "none";
      const numericMonth = isDeducible ? parseInt(month) : undefined;
      
      let updateData: Partial<Invoice> = {
        mesDeduccion: numericMonth,
        esDeducible: isDeducible
      };
      
      if (isDeducible) {
        // Only calculate new values if not manually modified
        if (invoice.gravadoModificado !== true) {
          const { gravadoISR, gravadoIVA } = calculateGravados({...invoice, ...updateData});
          updateData.gravadoISR = gravadoISR;
          updateData.gravadoIVA = gravadoIVA;
          updateData.gravadoModificado = false;
        }
      } else {
        // Only reset gravado values if not manually modified
        if (invoice.gravadoModificado !== true) {
          updateData.gravadoISR = 0;
          updateData.gravadoIVA = 0;
          updateData.gravadoModificado = false;
        }
      }
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
    } catch (error) {
      console.error("Error updating month:", error);
    }
  }, [filteredInvoices, calculateGravados, handleUpdateInvoice, clientId]);

  const handleGravadoDoubleClick = useCallback((invoice: Invoice) => {
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice)) return;
    
    setInvoiceForDeductibility(invoice);
    setIsDeductibilityEditorOpen(true);
  }, [invoiceHelpers]);

  const handleToggleDeductible = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    
    // CRITICAL: Skip if invoice is locked, is payment complement, or S01
    if (invoice.locked === true || invoiceHelpers.isPaymentComplement(invoice) || invoice.usoCFDI === 'S01') {
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
        
        // Only calculate new values if not manually modified
        if (invoice.gravadoModificado !== true) {
          const { gravadoISR, gravadoIVA } = calculateGravados({
            ...invoice,
            ...updateData,
            mesDeduccion: currentMonth
          });
          
          updateData.gravadoISR = gravadoISR;
          updateData.gravadoIVA = gravadoIVA;
          updateData.gravadoModificado = false;
        }
      } else {
        // Turning off deductible status
        // Only reset gravado values if not manually modified
        if (invoice.gravadoModificado !== true) {
          updateData.gravadoISR = 0;
          updateData.gravadoIVA = 0;
          updateData.gravadoModificado = false;
        }
      }
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
    } catch (error) {
      console.error("Error updating deductible status:", error);
    }
  }, [handleUpdateInvoice, calculateGravados, invoiceHelpers, clientId]);

  const handleFindPaymentComplement = useCallback((invoice: Invoice) => {
    if (!invoiceHelpers.isPaidPPDInvoice(invoice)) return;
    
    const paymentComplements = invoices.filter(
      pc => pc.tipoDeComprobante === 'P' && 
            pc.docsRelacionadoComplementoPago?.some(
              uuid => uuid.toUpperCase() === invoice.uuid.toUpperCase()
            )
    );
    
    if (paymentComplements.length === 0) return;
    
    const paymentComplement = paymentComplements[0];
    
    const complementElement = document.getElementById(`payment-complement-${paymentComplement.uuid}`);
    if (complementElement) {
      complementElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setHighlightedPaymentComplements([paymentComplement.uuid]);
      
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedPaymentComplements([]);
      }, 2000);
    }
  }, [invoices, invoiceHelpers]);

  const handleSetCategory = useCallback(async (invoice: Invoice, categoryId: string | null) => {
    if (invoice.locked) return;
    
    try {
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const categoryName = category ? category.name : '';
      
      const updateData: Partial<Invoice> = { categoria: categoryName };
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({ ...invoice, categoria: categoryName });
    } catch (error) {
      console.error("Error updating category:", error);
    }
  }, [clientId, categories, handleUpdateInvoice]);

  // Evaluate deductibility with forced supplier refresh
const handleEvaluateDeductibility = async () => {
  setIsEvaluating(true);
  try {
    // First force a refresh of suppliers to ensure we have latest data
    try {
      await invoiceService.syncSuppliersFromInvoices(clientId);
    } catch (syncError) {
      console.error("Error syncing suppliers:", syncError);
      // Continue with evaluation even if sync fails
    }

    // Add a small delay to ensure any DB updates have propagated
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Now run the evaluation with fresh supplier data
    const result = await invoiceService.evaluateDeductibility(clientId);
    
    toast({
      title: "Evaluación completada",
      description: `Se encontraron ${result.processed + result.skipped} facturas: 
                    ${result.processed} evaluadas (desbloqueadas)`,
      variant: "default"
    });
    
    // If updates were made, refresh the local data
    if (result.updated > 0) {
      try {
        const refreshedInvoices = await invoiceService.getInvoices(clientId);
        
        const updatedMap: Record<string, Invoice> = {};
        refreshedInvoices.forEach(invoice => {
          if (invoice.recibida) {
            updatedMap[invoice.uuid] = invoice;
          }
        });
        
        // Update state
        setUpdatedInvoices(updatedMap);
        
        // Also update localStorage
        localStorage.setItem(`updatedReceivedInvoices_${year}`, JSON.stringify(updatedMap));
        console.log("📝 Updated localStorage after evaluation");
        
        // Update fiscal summary with fresh data
        updateFiscalSummaryTaxes();
      } catch (refreshError) {
        console.error("Error refreshing invoices:", refreshError);
      }
    }
  } catch (error) {
    console.error("Error evaluating deductibility:", error);
    toast({
      title: "Error",
      description: "No se pudo completar la evaluación de deducibilidad.",
      variant: "destructive"
    });
  } finally {
    setIsEvaluating(false);
  }
};

  // Render invoice row - modified to ensure we use exact values from invoice without implicit transformations
  const renderInvoiceRow = useCallback((invoice: Invoice, index: number) => {
    const isS01 = invoice.usoCFDI === 'S01';
    const isComplement = invoiceHelpers.isPaymentComplement(invoice);
    const isAnnualDeduction = invoice.usoCFDI?.startsWith('D');
    const needsComplement = invoice.metodoPago === 'PPD' && !invoiceHelpers.isPaidWithComplement(invoice);
    const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && invoiceHelpers.isPaidWithComplement(invoice);
    
    // IMPORTANT: Use the exact values from the invoice without transformations
    // Log for debugging
    if (invoice.uuid === "87703bd5-f139-407d-8970-ac454bc9cb44" || 
        invoice.rfcEmisor === "AAF1107272S1") {
     
    }
    
    // Simply use the invoice properties directly without transformations
    const deductibleStatus = invoice.esDeducible === true;
    
    // Explicitly use strict equality for all conditions to avoid type coercion
    return (
      <tr
        key={invoice.uuid}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${isS01 ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-400' : 'bg-white dark:bg-gray-950'}
                  ${invoice.locked === true ? 'opacity-80' : ''}
                  ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
                  ${hasComplement ? '!bg-blue-50/30 dark:!bg-blue-900/30' : ''}
                  ${highlightedPaymentComplements.includes(invoice.uuid) ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}`}
      >
        {/* Lock Button */}
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
        
        {/* Factura Info - Add this column */}
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
                  {invoice.formaPago} / {' '}
                  {hasComplement ? (
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => handleFindPaymentComplement(invoice)}
                    >
                      {invoice.metodoPago}
                      <Check className="h-3 w-3 inline ml-1 text-blue-600" />
                    </span>
                  ) : (
                    invoice.metodoPago
                  )}
                  {invoiceHelpers.needsPaymentComplement(invoice) && ' ⚠️'}
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
        
        {/* Category */}
        <td className="px-2 py-1 align-middle">
          {isComplement || isS01
            ? <span></span>
            : invoice.locked ? (
              <div className="flex items-center gap-1 px-2 py-1 max-w-[200px] opacity-80">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {invoice.categoria || 'Sin categoría'}
                </span>
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 max-w-[200px] transition-colors">
                    <Tag className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {invoice.categoria || 'Sin categoría'}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="start">
                  <div className="max-h-[200px] overflow-y-auto">
                    <div 
                      className="text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                      onClick={() => handleSetCategory(invoice, null)}
                    >
                      Sin categoría
                    </div>
                    {categories.map(category => (
                      <div
                        key={category.id || ''}
                        className={`text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center ${
                          invoice.categoria === category.name ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => handleSetCategory(invoice, category.id || null)}
                      >
                        <span>{category.name}</span>
                        {invoice.categoria === category.name && (
                          <Check className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )
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
              {(invoice.impuestoTrasladado || 0) > 0 && (
                <span>+IVA: ${(invoice.impuestoTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              )}
              {(invoice.iepsTrasladado || 0) > 0 && (
                <span>+IEPS: ${(invoice.iepsTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              )}
              {(invoice.ivaRetenido || 0) > 0 && (
                <span>-IVA: ${(invoice.ivaRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              )}
              {(invoice.isrRetenido || 0) > 0 && (
                <span>-ISR: ${(invoice.isrRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              )}
              {/* Show a placeholder when all taxes are zero */}
              {(invoice.impuestoTrasladado || 0) === 0 && 
               (invoice.iepsTrasladado || 0) === 0 && 
               (invoice.ivaRetenido || 0) === 0 && 
               (invoice.isrRetenido || 0) === 0 && (
                <span>Sin impuestos</span>
              )}
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
        
        {/* Month selection */}
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
        
        {/* Deductible status - use exact value from invoice */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement || isS01 ? (
            <span></span>
          ) : (
            <Badge 
              variant="outline" 
              className={`
                cursor-pointer hover:opacity-80 transition-opacity
                ${(isAnnualDeduction && invoice.esDeducible === true)
                  ? 'bg-purple-50 text-purple-700 border-purple-300' 
                  : invoice.esDeducible === true
                    ? 'bg-green-50 text-green-700 border-green-300' 
                    : 'bg-red-50 text-red-700 border-red-300' 
                }
              `}
              onClick={(e) => handleToggleDeductible(e, invoice)}
            >
              {(isAnnualDeduction && invoice.esDeducible === true)
                ? 'Anual' 
                : invoice.esDeducible === true
                  ? 'Sí' 
                  : 'No'
              }
            </Badge>
          )}
        </td>
        
        {/* Gravado ISR - only show value if invoice.esDeducible === true */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : (isAnnualDeduction && invoice.esDeducible === true)
              ? <span className="text-gray-400">$0.00 (Anual)</span>
              : <span>
                  ${invoice.esDeducible === true && invoice.mesDeduccion 
                    ? invoice.gravadoISR || 0
                    : '0.00'
                  }
                  {invoice.gravadoModificado === true && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
                </span>
          }
        </td>

        {/* Gravado IVA - only show value if invoice.esDeducible === true */}
        <td 
          className="pr-7 px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isS01 && handleGravadoDoubleClick(invoice)}
        >
          {isComplement || isS01
            ? <span></span>
            : (isAnnualDeduction && invoice.esDeducible === true)
              ? <span className="text-gray-400">$0.00 (Anual)</span>
              : <span>
                  ${invoice.esDeducible === true && invoice.mesDeduccion
                    ? invoice.gravadoIVA || 0
                    : '0.00'
                  }
                  {invoice.gravadoModificado === true && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
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
    handleFindPaymentComplement,
    categories,
    handleSetCategory,
    updatedInvoices // Add this dependency to ensure row renders correctly when updatedInvoices changes
  ]);

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">Facturas Recibidas {year}</h2>
          <div className="flex items-center gap-2">
            {/* <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Badge> */}
            
            {/* Deductibility evaluation button */}
            <Button
              variant="black"
              size="sm"
              className="flex items-center whitespace-nowrap"
              onClick={handleEvaluateDeductibility}
              disabled={isEvaluating}
            >
              <Calculator className={`h-3.5 w-3.5 mr-1 ${isEvaluating ? "animate-spin" : ""}`} />
              {isEvaluating ? "Evaluando..." : "Evaluar Deducibilidad"}
            </Button>
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
                          {monthlyTaxTotals[month].ieps > 0 && (
                            <>&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                            IEPS ${monthlyTaxTotals[month].ieps.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</>
                          )}
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