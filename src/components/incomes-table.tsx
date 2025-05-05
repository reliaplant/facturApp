"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check, Tag, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { ExportInvoicesExcel } from "@/components/export-invoices-excel";
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
    // Simplified gravados calculation
    calculateGravados: (invoice: Invoice) => {
      const ivaValue = invoice.impuestoTrasladado || 0;
      const gravadoISR = ivaValue !== undefined ? Math.round(ivaValue / 0.16 * 100) / 100 : invoice.subTotal;
      const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
      return { gravadoISR, gravadoIVA };
    }
  }), [invoices]);

  // Date utilities
  const dateUtils = useMemo(() => ({
    getMonth: (dateString: string): number => new Date(dateString).getMonth() + 1,
    getMonthName: (month: number): string => format(new Date(year, month - 1, 1), 'MMMM', { locale: es }),
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
    const taxTotals: Record<number, { isr: number; iva: number }> = {};
    for (let i = 1; i <= 13; i++) taxTotals[i] = { isr: 0, iva: 0 };
    
    filtered.forEach(invoice => {
      try {
        // Group by month
        const month = dateUtils.getMonth(invoice.fecha);
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(invoice);
        
        // Calculate tax totals
        if (invoice.mesDeduccion && !invoice.estaCancelado && invoice.esDeducible) {
          taxTotals[invoice.mesDeduccion].isr += invoice.gravadoISR || invoice.subTotal;
          taxTotals[invoice.mesDeduccion].iva += invoice.gravadoIVA || (invoice.impuestoTrasladado || 0);
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

  // Event handlers
  const handleUpdateInvoice = useCallback((updatedInvoice: Invoice) => {
    setUpdatedInvoices(prev => {
      const newState = { ...prev, [updatedInvoice.uuid]: updatedInvoice };
      if (modalState.selectedInvoice?.uuid === updatedInvoice.uuid) {
        setModalState(prev => ({ ...prev, selectedInvoice: updatedInvoice }));
      }
      return newState;
    });
  }, [modalState.selectedInvoice]);

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
    const numericMonth = isActive ? parseInt(month) : undefined;
    
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
            : <span className="text-sm">{invoice.concepto || 'Sin concepto'}</span>
          }
        </td>
        <td className="px-2 py-1 align-middle">
          {isComplement ? <span></span> : (
            invoice.locked ? (
              // Locked state - just show text without Popover
              <div className="flex items-center gap-1 px-2 py-1 max-w-[200px] opacity-80">
                <Tag className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {invoice.categoria || 'Sin categoría'}
                </span>
              </div>
            ) : (
              // Unlocked state - show clickable Popover
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
          onDoubleClick={() => !isComplement && !invoice.locked && handleModals('openDeductibility', invoice)}
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
          className="pr-7 px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => !isComplement && !invoice.locked && handleModals('openDeductibility', invoice)}
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
  });
  
  // Avoid re-renders for the memo component
  InvoiceRow.displayName = 'InvoiceRow';

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium whitespace-nowrap">
            Facturas Emitidas {year}
          </h2>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-0.5 whitespace-nowrap">
              Total: ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Badge>
            
            {/* Add a simple button that doesn't do anything yet */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Sincronizar
            </Button>
            
            {!disableExport && <ExportInvoicesExcel invoices={filteredInvoices} year={year} fileName={`Ingresos_${year}.xlsx`} />}
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
