"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check, Tag, RefreshCw, Calculator, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InvoiceDeductibilityEditor } from "@/components/invoice-deductibility-editor";
import { invoiceService } from "@/services/invoice-service";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/use-toast";
import { fiscalDataService } from '@/services/fiscal-data-service';
import { YearTaxData } from '@/models/fiscalData'; // Add this import

interface IncomesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
  clientId: string;
}

export function IncomesTable({ year, invoices = [], disableExport = false, clientId }: IncomesTableProps) {
  // Consolidated modal state
  const [modalState, setModalState] = useState<{
    selectedInvoice: Invoice | null;
    isModalOpen: boolean;
    isDeductibilityEditorOpen: boolean;
    invoiceForDeductibility: Invoice | null;
  }>({
    selectedInvoice: null,
    isModalOpen: false,
    isDeductibilityEditorOpen: false,
    invoiceForDeductibility: null
  });
  
  // Other state
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const [highlightedPaymentComplements, setHighlightedPaymentComplements] = useState<string[]>([]);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationTotal, setVerificationTotal] = useState(0);
  const { toast } = useToast();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load/Save from localStorage - simplified
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedEmittedInvoices_${year}`);
      if (savedInvoices) setUpdatedInvoices(JSON.parse(savedInvoices));
    } catch (error) {}
  }, [year]);
  
  useEffect(() => {
    if (Object.keys(updatedInvoices).length === 0) return;
    try {
      localStorage.setItem(`updatedEmittedInvoices_${year}`, JSON.stringify(updatedInvoices));
    } catch (error) {}
  }, [updatedInvoices, year]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await categoryService.getAllCategories();
        setCategories(categoriesData);
      } catch (error) {}
    };
    
    fetchCategories();
  }, []);

  // Helper functions
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
    // Fixed gravados calculation - gravadoISR should simply be the subtotal
    calculateGravados: (invoice: Invoice) => {
      const gravadoISR = invoice.subTotal;
      const gravadoIVA = invoice.impuestoTrasladado || 0;
      return { gravadoISR, gravadoIVA };
    }
  }), [invoices]);

  // Date utilities - Make sure we're consistently using 1-12 for months
  const dateUtils = useMemo(() => ({
    // This already returns 1-12, which is correct
    getMonth: (dateString: string): number => new Date(dateString).getMonth() + 1,
    
    // Already using 1-12 months correctly
    getMonthName: (month: number): string => format(new Date(year, month - 1, 1), 'MMMM', { locale: es }),
    
    // Already using 1-12 months correctly
    getMonthAbbreviation: (month: number): string => {
      if (month === 13) return 'ANUAL';
      return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month - 1] || '';
    }
  }), [year]);

  // Process and filter invoices 
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount, monthlyTaxTotals } = useMemo(() => {
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
    
    // Initialize monthly tax totals
    const taxTotals: Record<number, { isr: number; iva: number; ivaRetenido: number }> = {};
    for (let i = 1; i <= 13; i++) taxTotals[i] = { isr: 0, iva: 0, ivaRetenido: 0 };
    
    filtered.forEach(invoice => {
      try {
        // Group by month
        const month = dateUtils.getMonth(invoice.fecha);
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(invoice);
        
        // Calculate tax totals - use the same logic as row display
        if (invoice.mesDeduccion && !invoice.estaCancelado && invoice.esDeducible) {
          // Use the same calculation logic as in the UI to ensure consistent totals
          const isrValue = invoice.gravadoModificado ? (invoice.gravadoISR || 0) : invoice.subTotal;
          const ivaValue = invoice.gravadoModificado ? (invoice.gravadoIVA || 0) : (invoice.impuestoTrasladado || 0);
          
          taxTotals[invoice.mesDeduccion].isr += isrValue;
          taxTotals[invoice.mesDeduccion].iva += ivaValue;
          taxTotals[invoice.mesDeduccion].ivaRetenido += (invoice.ivaRetenido || 0);
        }
      } catch (e) {}
    });
    
    // Sort invoices within each month
    Object.values(byMonth).forEach(monthInvoices => {
      monthInvoices.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    });
    
    // Get sorted month numbers
    const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
    
    return { 
      filteredInvoices: filtered, 
      invoicesByMonth: byMonth, 
      sortedMonths: months, 
      totalAmount: total,
      monthlyTaxTotals: taxTotals
    };
  }, [invoices, updatedInvoices, year, dateUtils]);

  // Function to calculate and update fiscal summary tax fields
  const updateFiscalSummaryTaxes = useCallback(async (invoicesToProcess = filteredInvoices) => {
    if (!clientId || !year || invoicesToProcess.length === 0) return;
    
    console.log("Calculating fiscal summary tax fields for income invoices...");
    
    // Calculate income tax totals
    const monthlyTotals: Record<string, {
      isrGravado: number;
      isrRetenido: number;
      ivaTrasladado: number;
      ivaRetenido: number;
    }> = {};
    
    // Initialize monthly totals object - use string keys to match the model
    for (let month = 1; month <= 12; month++) {
      monthlyTotals[month.toString()] = {
        isrGravado: 0,
        isrRetenido: 0,
        ivaTrasladado: 0,
        ivaRetenido: 0
      };
    }
    
    // Calculate totals by month for income invoices only (deducible and not canceled)
    invoicesToProcess.forEach(invoice => {
      // Skip if not income-recognized or canceled
      if (!invoice.esDeducible || invoice.estaCancelado || !invoice.mesDeduccion) return;
      
      // Month should always be 1-12 or 13 for annual - validate and convert to string
      const month = invoice.mesDeduccion.toString();
      if (invoice.mesDeduccion < 1 || invoice.mesDeduccion > 13) {
        console.warn(`Invalid month ${invoice.mesDeduccion} found for invoice ${invoice.uuid}`);
        return; // Skip invalid months
      }
      
      // Now use the validated month string
      if (!monthlyTotals[month]) return; // Skip if not a valid month in our structure
      
      // Add tax values to totals
      monthlyTotals[month].isrGravado += invoice.gravadoISR || 0;
      monthlyTotals[month].isrRetenido += invoice.isrRetenido || 0;
      monthlyTotals[month].ivaTrasladado += invoice.gravadoIVA || 0;
      monthlyTotals[month].ivaRetenido += invoice.ivaRetenido || 0;
    });
    
    try {
      // Update the fiscal summary with these values
      await fiscalDataService.updateFiscalSummaryFields(clientId, year, (existingData) => {
        // If no existing data, create a new object with default values
        const baseData: YearTaxData = existingData || {
          clientId,
          year,
          months: {}
        };
        
        // Ensure months object exists
        if (!baseData.months) baseData.months = {};
        
        // Update each month's data
        Object.entries(monthlyTotals).forEach(([month, taxData]) => {
          // Create month object if it doesn't exist
          if (!baseData.months[month]) {
            baseData.months[month] = {};
          }
          
          // Update only the income tax fields, preserving other data
          baseData.months[month] = {
            ...baseData.months[month],
            // Income tax fields
            isrGravado: taxData.isrGravado,
            isrRetenido: taxData.isrRetenido,
            ivaTrasladado: taxData.ivaTrasladado,
            ivaRetenido: taxData.ivaRetenido
          };
        });
        
        return baseData;
      });
      
      console.log("Fiscal summary income tax fields updated successfully");
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
    }, 2000); // Wait 2 seconds after the last change before updating
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

  // Event handlers
  const handleUpdateInvoice = useCallback((updatedInvoice: Invoice) => {
    setUpdatedInvoices(prev => {
      const newState = { ...prev, [updatedInvoice.uuid]: updatedInvoice };
      if (modalState.selectedInvoice?.uuid === updatedInvoice.uuid) {
        setModalState(prev => ({ ...prev, selectedInvoice: updatedInvoice }));
      }
      
      // Trigger fiscal summary update after updating local state
      debouncedUpdateFiscalSummary();
      
      return newState;
    });
  }, [modalState.selectedInvoice, debouncedUpdateFiscalSummary]);

  const handleLockToggle = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    const newLockedStatus = !invoice.locked;
    
    try {
      await invoiceService.updateInvoice(clientId, invoice.uuid, { locked: newLockedStatus });
      handleUpdateInvoice({ ...invoice, locked: newLockedStatus });
    } catch (error) {}
  }, [handleUpdateInvoice, clientId]);

  const handleMonthSelect = useCallback(async (invoiceUuid: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.uuid === invoiceUuid);
    if (!invoice) return;
    
    const isActive = month !== "none";
    // Parse month as integer, ensuring it's in the 1-12 range (or 13 for annual)
    const numericMonth = isActive ? parseInt(month) : undefined;
    
    // Debug check to make sure we're never using month 0
    if (numericMonth === 0) {
      console.error("Invalid month 0 detected! Months should be 1-12 or 13 for annual.");
      return;
    }
    
    try {
      let updateData: Partial<Invoice> = {
        mesDeduccion: numericMonth,
        esDeducible: isActive
      };
      
      if (isActive) {
        const { gravadoISR, gravadoIVA } = invoiceHelpers.calculateGravados({...invoice, ...updateData});
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
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
    } catch (error) {}
  }, [filteredInvoices, invoiceHelpers, handleUpdateInvoice, clientId]);

  const handleToggleGravable = useCallback(async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    
    if (invoice.locked || invoiceHelpers.isPaymentComplement(invoice)) return;
    
    try {
      const newDeductibleStatus = !invoice.esDeducible;
      let updateData: Partial<Invoice> = { 
        esDeducible: newDeductibleStatus
      };
      
      if (newDeductibleStatus) {
        const currentMonth = invoice.mesDeduccion || dateUtils.getMonth(new Date().toISOString());
        updateData.mesDeduccion = currentMonth;
        
        const { gravadoISR, gravadoIVA } = invoiceHelpers.calculateGravados({
          ...invoice, 
          esDeducible: true,
          mesDeduccion: currentMonth
        });
        
        updateData.gravadoISR = gravadoISR;
        updateData.gravadoIVA = gravadoIVA;
        updateData.gravadoModificado = false;
      } else {
        updateData.gravadoISR = 0;
        updateData.gravadoIVA = 0;
        updateData.gravadoModificado = false;
      }
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      handleUpdateInvoice({...invoice, ...updateData});
    } catch (error) {}
  }, [handleUpdateInvoice, invoiceHelpers, dateUtils, clientId]);

  // Modal handlers - consolidated for better performance
  const handleModals = useCallback((action: string, invoice?: Invoice) => {
    switch(action) {
      case 'openPreview':
        if (invoice) setModalState(prev => ({ 
          ...prev, 
          selectedInvoice: invoice, 
          isModalOpen: true 
        }));
        break;
      case 'closePreview':
        setModalState(prev => ({ ...prev, isModalOpen: false }));
        break;
      case 'openDeductibility':
        if (invoice) setModalState(prev => ({ 
          ...prev, 
          invoiceForDeductibility: invoice, 
          isDeductibilityEditorOpen: true 
        }));
        break;
      case 'closeDeductibility':
        setModalState(prev => ({ ...prev, isDeductibilityEditorOpen: false }));
        break;
    }
  }, []);

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
      }, 3000);
    }
  }, [invoices, invoiceHelpers]);

  // Add category update handler - fixed type error
  const handleCategorySelect = useCallback(async (invoice: Invoice, categoryId: string | null) => {
    if (invoice.locked) return;
    
    try {
      // Find selected category to get name
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const categoryName = category ? category.name : '';
      
      // Store the category ID in a custom attribute if needed
      const updateData: Partial<Invoice> & { categoriaId?: string | null } = {
        categoria: categoryName,
        categoriaId: categoryId || null // We'll add this even though it's not in the interface
      };
      
      await invoiceService.updateInvoice(clientId, invoice.uuid, updateData);
      
      // Update local state - use a type assertion to add categoriaId
      handleUpdateInvoice({
        ...invoice, 
        categoria: categoryName,
        // Add categoriaId with type assertion
      } as Invoice & { categoriaId?: string | null });
    } catch (error) {}
  }, [categories, clientId, handleUpdateInvoice]);

  // Cleanup highlight timer
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Add income evaluation handler
  const handleEvaluateIncome = async () => {
    setIsEvaluating(true);
    try {
      console.log("Starting income evaluation...");
      const result = await invoiceService.evaluateIncome(clientId);
      console.log("Income evaluation completed:", result);
      
      toast({
        title: "Evaluación completada",
        description: `Se encontraron ${result.processed + result.skipped} facturas: 
                     ${result.processed} evaluadas (desbloqueadas)`,
        variant: "default"
      });
      
      // If updates were made, refresh the local data
      if (result.updated > 0) {
        try {
          console.log("Refreshing invoice data after updates...");
          const refreshedInvoices = await invoiceService.getInvoices(clientId);
          
          const updatedMap: Record<string, Invoice> = {};
          refreshedInvoices.forEach(invoice => {
            if (!invoice.recibida) {
              updatedMap[invoice.uuid] = invoice;
            }
          });
          
          setUpdatedInvoices(updatedMap);
          console.log("Invoice data refreshed successfully");
          
          // Update fiscal summary with the new data
          updateFiscalSummaryTaxes(refreshedInvoices.filter(inv => !inv.recibida));
        } catch (refreshError) {
          console.error("Error refreshing invoices:", refreshError);
        }
      }
    } catch (error) {
      console.error("Error evaluating income:", error);
      toast({
        title: "Error",
        description: "No se pudo completar la evaluación de ingresos.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Render invoice row - extracted and memoized using React.memo pattern
  const InvoiceRow = React.memo(({ invoice }: { invoice: Invoice }) => {
    const isComplement = invoiceHelpers.isPaymentComplement(invoice);
    const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && invoiceHelpers.isPaidWithComplement(invoice);
    
    return (
      <tr
        key={invoice.uuid}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                  ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
                  ${hasComplement ? '!bg-blue-50/30 dark:!bg-blue-900/30 cursor-pointer' : ''}
                  ${invoice.locked ? 'opacity-80' : ''}
                  ${highlightedPaymentComplements.includes(invoice.uuid) ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}`}
        onClick={hasComplement ? () => handleFindPaymentComplement(invoice) : undefined}
      >
        {/* Lock Button */}
        <td className="pl-7 px-2 py-1 align-middle text-center">
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
              onClick={() => handleModals('openPreview', invoice)}
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

        {/* Payment Type - Fixed missing td opening tag */}
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

        {/* Cancelado Status */}
        <td className="px-2 py-1 align-middle text-center">
          {isComplement 
            ? <span className="text-gray-400">-</span>
            : invoice.estaCancelado
              ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-red-100 text-red-800">Sí</span>
              : <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">No</span>
          }
        </td>
        <td className="px-2 py-1 align-middle">
          {isComplement ? <span></span> : (
            invoice.locked ? (
              // Locked state - just show text without Popover
              <div className="flex items-center gap-1 px-2 py-1.5 max-w-[200px] opacity-80">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {invoice.categoria || 'Sin categoría'}
                </span>
              </div>
            ) : (
              // Unlocked state - show clickable Popover
              <Popover>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1.5 max-w-[200px] transition-colors">
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
                      onClick={() => handleCategorySelect(invoice, null)}
                    >
                      Sin categoría
                    </div>
                    {categories.map(category => (
                      <div
                        key={category.id || ''}
                        className={`text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center ${
                          // Compare with category.id directly instead of using categoriaId
                          invoice.categoria === category.name ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                        onClick={() => handleCategorySelect(invoice, category.id || null)}
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
          )}
        </td>

        {/* Amount Cells - Fixed missing td opening tags */}
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
        
        {/* Gravable badge */}
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
          onDoubleClick={() => !isComplement && !invoice.locked && handleModals('openDeductibility', invoice)}
        >
          {isComplement ? <span></span> : (
            <span>
              ${invoice.mesDeduccion && invoice.esDeducible 
                ? (invoice.gravadoModificado ? (invoice.gravadoISR || 0) : invoice.subTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 }) 
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )}
        </td>
        <td 
          className="pr-7 px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isComplement && !invoice.locked && handleModals('openDeductibility', invoice)}
        >
          {isComplement ? <span></span> : (
            <span>
              ${invoice.mesDeduccion && invoice.esDeducible 
                ? (invoice.gravadoModificado ? (invoice.gravadoIVA || 0) : (invoice.impuestoTrasladado || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 }) 
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )}
        </td>
      </tr>
    );
  });
  
  // Avoid re-renders for the memo component
  InvoiceRow.displayName = 'InvoiceRow';

  // Function to handle bulk verification of CFDIs
  const handleBulkVerifyCfdis = async () => {
    // Get all non-complemento invoices
    const invoicesToVerify = filteredInvoices.filter(invoice => invoice.tipoDeComprobante !== 'P');
    
    if (invoicesToVerify.length === 0) {
      toast({
        title: "No hay facturas para verificar",
        description: "No se encontraron facturas CFDI para verificar",
        variant: "default"
      });
      return;
    }

    setIsVerifying(true);
    setVerificationTotal(invoicesToVerify.length);
    setVerificationProgress(0);
    
    let verified = 0;
    let updated = 0;
    let errors = 0;
    let canceladas = 0;
    
    const batchSize = 5; // Process 5 invoices at a time to avoid overwhelming the server
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Process invoices in batches
    for (let i = 0; i < invoicesToVerify.length; i += batchSize) {
      const batch = invoicesToVerify.slice(i, i + batchSize);
      
      // Process each invoice sequentially within the batch with a delay
      for (const invoice of batch) {
        try {
          // Add 300ms delay between each CFDI verification to avoid overloading SAT's API
          await delay(300);
          
          const response = await fetch("/api/verify-cfdi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uuid: invoice.uuid,
              rfcEmisor: invoice.rfcEmisor,
              rfcReceptor: invoice.rfcReceptor,
              total: invoice.total,
            }),
          });
          
          if (!response.ok) throw new Error(`Error verificando CFDI ${invoice.uuid}`);
          
          const result = await response.json();
          verified++;
          
          // If the status has changed, update the invoice
          if ((result.status === "Cancelado" && !invoice.estaCancelado) || 
              (result.status !== "Cancelado" && invoice.estaCancelado)) {
            
            const newStatus = result.status === "Cancelado";
            if (newStatus) canceladas++;
            
            // Update invoice in the database
            await invoiceService.updateInvoice(clientId, invoice.uuid, { 
              estaCancelado: newStatus,
              fechaCancelación: result.cancellationDate || null
            });
            
            // Update local state
            handleUpdateInvoice({
              ...invoice, 
              estaCancelado: newStatus,
              fechaCancelación: result.cancellationDate || undefined
            });
            
            updated++;
          }
          
          // Update progress
          setVerificationProgress(prev => prev + 1);
          
        } catch (error) {
          console.error(`Error verifying CFDI ${invoice.uuid}:`, error);
          errors++;
          setVerificationProgress(prev => prev + 1);
        }
      }
      
      // No need for additional delay between batches since we've already delayed each individual request
    }
    
    // Show completion toast
    toast({
      title: "Verificación completada",
      description: `Se verificaron ${verified} facturas, se actualizaron ${updated} (${canceladas} canceladas) y hubo ${errors} errores.`,
      variant: "default"
    });
    
    setIsVerifying(false);
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Facturas Emitidas {year}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Badge> */}
            
            {/* Verify CFDIs button */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center whitespace-nowrap"
              onClick={handleBulkVerifyCfdis}
              disabled={isVerifying}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isVerifying ? "animate-spin" : ""}`} />
              {isVerifying 
                ? `Verificando (${verificationProgress}/${verificationTotal})` 
                : "Verificar CFDIs"}
            </Button>
            
            {/* Add income evaluation button */}
            <Button
              variant="black"
              size="sm"
              className="flex items-center whitespace-nowrap"
              onClick={handleEvaluateIncome}
              disabled={isEvaluating}
            >
              <Calculator className={`h-3.5 w-3.5 mr-1 ${isEvaluating ? "animate-spin" : ""}`} />
              {isEvaluating ? "Evaluando..." : "Evaluar Ingresos"}
            </Button>

          </div>
        </div>

        {/* Table - Fixed unclosed div tag */}
        <div className="relative">
          <div className="max-h-[calc(100vh-140px)] overflow-y-auto">
            <table className="w-full text-xs relative">
              <thead className="sticky top-0 z-20">
                <tr className="after:absolute after:content-[''] after:h-[4px] after:left-0 after:right-0 after:bottom-0 after:shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                  <th className="pl-7 px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center w-12">Lock</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Factura</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Receptor</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Uso/Pago</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Cancelado</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">SubTotal</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Impuestos</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Mes Cobro</th>
                  <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Ingreso</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado ISR</th>
                  <th className="pr-8 px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado IVA</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {sortedMonths.length > 0 ? (
                  sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      <tr className="bg-gray-200 dark:bg-gray-700">
                        <td colSpan={13} className="pl-7 px-2 py-1.5 font-medium">{dateUtils.getMonthName(month)}</td>
                      </tr>
                      
                      {invoicesByMonth[month].map(invoice => (
                        <InvoiceRow key={invoice.uuid} invoice={invoice} />
                      ))}
                      
                      {/* Monthly Totals */}
                      <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                        <td colSpan={13} className="px-7 py-1.5 text-right text-gray-500">
                          Total Gravado: ISR ${monthlyTaxTotals[month].isr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}   &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                          IVA ${monthlyTaxTotals[month].iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}   &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                          IVA Retenido ${monthlyTaxTotals[month].ivaRetenido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
        invoice={modalState.selectedInvoice}
        isOpen={modalState.isModalOpen}
        onClose={() => handleModals('closePreview')}
        onUpdate={handleUpdateInvoice}
      />
      
      <InvoiceDeductibilityEditor
        invoice={modalState.invoiceForDeductibility}
        isOpen={modalState.isDeductibilityEditorOpen}
        onClose={() => handleModals('closeDeductibility')}
        onSave={handleUpdateInvoice}
      />
    </div>
  );
}
