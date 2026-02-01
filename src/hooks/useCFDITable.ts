"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CFDI } from "@/models/CFDI";
import { cfdiService } from "@/services/cfdi-service";
import { categoryService } from "@/services/category-service";
import { Category } from "@/models/Category";
import { useToast } from "@/components/ui/use-toast";

// Types
export type TableType = 'ingresos' | 'egresos';

export interface CFDITableState {
  selectedCFDI: CFDI | null;
  isModalOpen: boolean;
  isDeductibilityEditorOpen: boolean;
  cfdiForDeductibility: CFDI | null;
}

export interface UseCFDITableOptions {
  type: TableType;
  year: number;
  clientId: string;
  invoices: CFDI[];
  onInvoiceUpdate?: (updatedInvoice: CFDI) => void;
}

export interface UseCFDITableReturn {
  // State
  modalState: CFDITableState;
  categories: Category[];
  highlightedPaymentComplements: string[];
  highlightedEvaluated: string[];
  isEvaluating: boolean;
  isVerifying: boolean;
  verificationProgress: number;
  verificationTotal: number;
  verificationModalState: VerificationModalState;
  
  // Processed data
  filteredInvoices: CFDI[];
  invoicesByMonth: Record<number, CFDI[]>;
  sortedMonths: number[];
  totalAmount: number;
  monthlyTaxTotals: Record<number, { isr: number; iva: number; ivaRetenido: number; ieps?: number; exento?: number }>;
  
  // Helpers
  helpers: CFDIHelpers;
  dateUtils: DateUtils;
  
  // Handlers
  handleUpdateInvoice: (invoice: CFDI) => Promise<void>;
  handleLockToggle: (e: React.MouseEvent, invoice: CFDI) => Promise<void>;
  handleMonthSelect: (invoiceUuid: string, month: string) => Promise<void>;
  handleToggleDeductible: (e: React.MouseEvent, invoice: CFDI) => Promise<void>;
  handleCategorySelect: (invoice: CFDI, categoryId: string | null) => Promise<void>;
  handleFindPaymentComplement: (invoice: CFDI) => void;
  handleOpenPreview: (invoice: CFDI) => void;
  handleClosePreview: () => void;
  handleOpenDeductibility: (invoice: CFDI) => void;
  handleCloseDeductibility: () => void;
  handleEvaluate: () => Promise<void>;
  handleBulkVerify: () => Promise<void>;
  handleCloseVerificationModal: () => void;
}

export interface CFDIHelpers {
  isPaymentComplement: (invoice: CFDI) => boolean;
  isPaidWithComplement: (invoice: CFDI) => boolean;
  isPaidPPDInvoice: (invoice: CFDI) => boolean;
  isAnnualDeduction: (invoice: CFDI) => boolean;
  isNonDeductible: (invoice: CFDI) => boolean;
  needsPaymentComplement: (invoice: CFDI) => boolean;
  calculateGravados: (invoice: CFDI) => { gravadoISR: number; gravadoIVA: number };
}

export interface DateUtils {
  getMonth: (dateString: string) => number;
  getMonthName: (month: number) => string;
  getMonthAbbreviation: (month: number) => string;
}

export interface CanceledInvoiceInfo {
  uuid: string;
  fecha: string;
  emisor: string;
  rfcEmisor: string;
  total: number;
  fechaCancelacion?: string;
}

export interface VerificationModalState {
  isOpen: boolean;
  isComplete: boolean;
  canceledInvoices: CanceledInvoiceInfo[];
}

// Pre-compute payment complement map for O(1) lookups instead of O(n) searches
function buildPaymentComplementMap(invoices: CFDI[]): Map<string, CFDI[]> {
  const map = new Map<string, CFDI[]>();
  
  invoices
    .filter(inv => inv.tipoDeComprobante === 'P')
    .forEach(pc => {
      pc.docsRelacionadoComplementoPago?.forEach(uuid => {
        const key = uuid.toUpperCase();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(pc);
      });
    });
  
  return map;
}

export function useCFDITable({ type, year, clientId, invoices, onInvoiceUpdate }: UseCFDITableOptions): UseCFDITableReturn {
  const { toast } = useToast();
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // LOCAL STATE for tracking updated invoices - THIS IS KEY FOR REACTIVITY
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, CFDI>>({});
  
  // Reset updated invoices when props change significantly
  useEffect(() => {
    setUpdatedInvoices({});
  }, [clientId, year]);
  
  // Merge props with local updates
  const mergedInvoices = useMemo(() => {
    return invoices.map(invoice => updatedInvoices[invoice.uuid] || invoice);
  }, [invoices, updatedInvoices]);
  
  // Consolidated modal state
  const [modalState, setModalState] = useState<CFDITableState>({
    selectedCFDI: null,
    isModalOpen: false,
    isDeductibilityEditorOpen: false,
    cfdiForDeductibility: null
  });
  
  // Other state
  const [categories, setCategories] = useState<Category[]>([]);
  const [highlightedPaymentComplements, setHighlightedPaymentComplements] = useState<string[]>([]);
  const [highlightedEvaluated, setHighlightedEvaluated] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationTotal, setVerificationTotal] = useState(0);
  const [verificationModalState, setVerificationModalState] = useState<VerificationModalState>({
    isOpen: false,
    isComplete: false,
    canceledInvoices: []
  });

  // Fetch categories once
  useEffect(() => {
    categoryService.getAllCategories().then(setCategories).catch(() => {});
  }, []);

  // Cleanup highlight timer
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  // Pre-compute payment complement map - O(n) once instead of O(n²) per render
  const paymentComplementMap = useMemo(() => buildPaymentComplementMap(mergedInvoices), [mergedInvoices]);

  // Optimized helper functions
  const helpers: CFDIHelpers = useMemo(() => ({
    isPaymentComplement: (invoice: CFDI) => invoice.tipoDeComprobante === 'P',
    
    isPaidWithComplement: (invoice: CFDI) => {
      if ((invoice.pagadoConComplementos?.length ?? 0) > 0) return true;
      return paymentComplementMap.has(invoice.uuid.toUpperCase());
    },
    
    isPaidPPDInvoice: (invoice: CFDI) => {
      if (invoice.metodoPago !== 'PPD') return false;
      if ((invoice.pagadoConComplementos?.length ?? 0) > 0) return true;
      return paymentComplementMap.has(invoice.uuid.toUpperCase());
    },
    
    isAnnualDeduction: (invoice: CFDI) => invoice.anual || invoice.usoCFDI?.startsWith('D'),
    
    isNonDeductible: (invoice: CFDI) => invoice.usoCFDI === 'S01',
    
    needsPaymentComplement: (invoice: CFDI) => {
      if (invoice.metodoPago !== 'PPD') return false;
      if ((invoice.pagadoConComplementos?.length ?? 0) > 0) return false;
      return !paymentComplementMap.has(invoice.uuid.toUpperCase());
    },
    
    calculateGravados: (invoice: CFDI) => {
      if (type === 'ingresos') {
        // For income: gravadoISR = subtotal, gravadoIVA = IVA trasladado
        return {
          gravadoISR: invoice.subTotal,
          gravadoIVA: invoice.impuestoTrasladado || 0
        };
      } else {
        // For expenses: more complex calculation
        if (!invoice.mesDeduccion || invoice.estaCancelado) {
          return { gravadoISR: 0, gravadoIVA: 0 };
        }
        if (invoice.anual || invoice.usoCFDI?.startsWith('D')) {
          return { gravadoISR: 0, gravadoIVA: 0 };
        }
        
        const ivaValue = invoice.impuestoTrasladado || 0;
        if (ivaValue === 0) {
          return { gravadoISR: invoice.total, gravadoIVA: 0 };
        }
        
        const gravadoISR = Math.round(ivaValue / 0.16 * 100) / 100;
        const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
        return { gravadoISR, gravadoIVA };
      }
    }
  }), [type, paymentComplementMap]);

  // Date utilities
  const dateUtils: DateUtils = useMemo(() => ({
    getMonth: (dateString: string) => new Date(dateString).getMonth() + 1,
    getMonthName: (month: number) => {
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return months[month - 1] || '';
    },
    getMonthAbbreviation: (month: number) => {
      if (month === 13) return 'ANUAL';
      return ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][month - 1] || '';
    }
  }), []);

  // Process and filter invoices
  const { filteredInvoices, invoicesByMonth, sortedMonths, totalAmount, monthlyTaxTotals } = useMemo(() => {
    const isIngreso = type === 'ingresos';
    
    // Filter for current year and correct type - USE MERGED INVOICES
    const filtered = mergedInvoices.filter(invoice => {
      try {
        const invoiceYear = new Date(invoice.fecha).getFullYear();
        const correctType = isIngreso ? invoice.esIngreso : invoice.esEgreso;
        return invoiceYear === year && correctType;
      } catch { return false; }
    });
    
    // Calculate total and group by month
    const total = filtered.reduce((sum, inv) => sum + inv.total, 0);
    const byMonth: Record<number, CFDI[]> = {};
    
    // Initialize tax totals
    const taxTotals: Record<number, { isr: number; iva: number; ivaRetenido: number; ieps: number; exento: number }> = {};
    for (let i = 1; i <= 13; i++) {
      taxTotals[i] = { isr: 0, iva: 0, ivaRetenido: 0, ieps: 0, exento: 0 };
    }
    
    filtered.forEach(invoice => {
      try {
        const month = dateUtils.getMonth(invoice.fecha);
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(invoice);
        
        // Calculate tax totals for deductible invoices
        if (invoice.mesDeduccion && !invoice.estaCancelado && invoice.esDeducible) {
          const isrValue = invoice.gravadoModificado ? (invoice.gravadoISR || 0) : 
                          (isIngreso ? invoice.subTotal : (invoice.gravadoISR || 0));
          const ivaValue = invoice.gravadoModificado ? (invoice.gravadoIVA || 0) : 
                          (invoice.impuestoTrasladado || 0);
          
          taxTotals[invoice.mesDeduccion].isr += isrValue;
          taxTotals[invoice.mesDeduccion].iva += ivaValue;
          taxTotals[invoice.mesDeduccion].ivaRetenido += invoice.ivaRetenido || 0;
          taxTotals[invoice.mesDeduccion].ieps += invoice.iepsTrasladado || 0;
          
          // Calculate exento for expenses
          if (!isIngreso) {
            const exentoAmount = Math.max(0, (invoice.total || 0) - (invoice.gravadoIVA || 0) - (invoice.gravadoISR || 0));
            taxTotals[invoice.mesDeduccion].exento += exentoAmount;
          }
        }
      } catch {}
    });
    
    // Sort invoices within each month
    Object.values(byMonth).forEach(monthInvoices => {
      monthInvoices.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    });
    
    const months = Object.keys(byMonth).map(Number).sort((a, b) => a - b);
    
    return { filteredInvoices: filtered, invoicesByMonth: byMonth, sortedMonths: months, totalAmount: total, monthlyTaxTotals: taxTotals };
  }, [mergedInvoices, year, type, dateUtils]);

  // Handlers
  const handleUpdateInvoice = useCallback(async (updatedInvoice: CFDI) => {
    // IMMEDIATELY update local state for instant UI feedback
    setUpdatedInvoices(prev => ({
      ...prev,
      [updatedInvoice.uuid]: updatedInvoice
    }));
    
    // Update modal state if needed
    if (modalState.selectedCFDI?.uuid === updatedInvoice.uuid) {
      setModalState(prev => ({ ...prev, selectedCFDI: updatedInvoice }));
    }
    
    // Notify parent component to update its state
    onInvoiceUpdate?.(updatedInvoice);
    
    // Then persist to Firebase (fire and forget for better UX)
    try {
      await cfdiService.updateInvoice(clientId, updatedInvoice.uuid, {
        esDeducible: updatedInvoice.esDeducible,
        mesDeduccion: updatedInvoice.mesDeduccion,
        gravadoISR: updatedInvoice.gravadoISR,
        gravadoIVA: updatedInvoice.gravadoIVA,
        gravadoModificado: updatedInvoice.gravadoModificado,
        notasDeducibilidad: updatedInvoice.notasDeducibilidad,
        categoria: updatedInvoice.categoria,
        locked: updatedInvoice.locked
      });
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive"
      });
    }
  }, [clientId, modalState.selectedCFDI, toast, onInvoiceUpdate]);

  const handleLockToggle = useCallback(async (e: React.MouseEvent, invoice: CFDI) => {
    e.stopPropagation();
    const newLockedStatus = !invoice.locked;
    
    try {
      await cfdiService.updateInvoice(clientId, invoice.uuid, { locked: newLockedStatus });
      await handleUpdateInvoice({ ...invoice, locked: newLockedStatus });
    } catch {}
  }, [clientId, handleUpdateInvoice]);

  const handleMonthSelect = useCallback(async (invoiceUuid: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.uuid === invoiceUuid);
    if (!invoice || invoice.locked) return;
    
    const isActive = month !== "none";
    const numericMonth = isActive ? parseInt(month) : undefined;
    
    if (numericMonth === 0) return;
    
    try {
      let updateData: Partial<CFDI> = {
        mesDeduccion: numericMonth,
        esDeducible: isActive
      };
      
      if (isActive && !invoice.gravadoModificado) {
        const { gravadoISR, gravadoIVA } = helpers.calculateGravados({ ...invoice, ...updateData });
        updateData = { ...updateData, gravadoISR, gravadoIVA, gravadoModificado: false };
      } else if (!isActive && !invoice.gravadoModificado) {
        updateData = { ...updateData, gravadoISR: 0, gravadoIVA: 0, gravadoModificado: false };
      }
      
      await cfdiService.updateInvoice(clientId, invoice.uuid, updateData);
      await handleUpdateInvoice({ ...invoice, ...updateData });
    } catch {}
  }, [filteredInvoices, helpers, clientId, handleUpdateInvoice]);

  const handleToggleDeductible = useCallback(async (e: React.MouseEvent, invoice: CFDI) => {
    e.stopPropagation();
    
    if (invoice.locked || helpers.isPaymentComplement(invoice) || invoice.usoCFDI === 'S01') return;
    
    try {
      const newDeductibleStatus = !invoice.esDeducible;
      const isAnnualType = helpers.isAnnualDeduction(invoice);
      
      let updateData: Partial<CFDI> = {
        esDeducible: newDeductibleStatus,
        anual: isAnnualType ? true : invoice.anual
      };
      
      if (newDeductibleStatus) {
        const currentMonth = isAnnualType ? 13 : (invoice.mesDeduccion || dateUtils.getMonth(new Date().toISOString()));
        updateData.mesDeduccion = currentMonth;
        
        if (!invoice.gravadoModificado) {
          const { gravadoISR, gravadoIVA } = helpers.calculateGravados({ ...invoice, ...updateData, mesDeduccion: currentMonth });
          updateData = { ...updateData, gravadoISR, gravadoIVA, gravadoModificado: false };
        }
      } else if (!invoice.gravadoModificado) {
        updateData = { ...updateData, gravadoISR: 0, gravadoIVA: 0, gravadoModificado: false };
      }
      
      await cfdiService.updateInvoice(clientId, invoice.uuid, updateData);
      await handleUpdateInvoice({ ...invoice, ...updateData });
    } catch {}
  }, [helpers, dateUtils, clientId, handleUpdateInvoice]);

  const handleCategorySelect = useCallback(async (invoice: CFDI, categoryId: string | null) => {
    if (invoice.locked) return;
    
    try {
      const category = categoryId ? categories.find(c => c.id === categoryId) : null;
      const categoryName = category ? category.name : '';
      
      await cfdiService.updateInvoice(clientId, invoice.uuid, { categoria: categoryName });
      await handleUpdateInvoice({ ...invoice, categoria: categoryName });
      
      // If a category was assigned (not removed) and this is an expense invoice,
      // check if the supplier has a default category - if not, assign this one
      if (categoryName && invoice.esEgreso && invoice.rfcEmisor) {
        const wasSet = await cfdiService.setSupplierDefaultCategoryIfEmpty(
          clientId, 
          invoice.rfcEmisor, 
          categoryName
        );
        if (wasSet) {
          toast({
            title: "Categoría asignada al proveedor",
            description: `"${categoryName}" se guardó como categoría por defecto para ${invoice.rfcEmisor}`,
            variant: "default"
          });
        }
      }
    } catch {}
  }, [categories, clientId, handleUpdateInvoice, toast]);

  const handleFindPaymentComplement = useCallback((invoice: CFDI) => {
    if (!helpers.isPaidPPDInvoice(invoice)) return;
    
    const complements = paymentComplementMap.get(invoice.uuid.toUpperCase());
    if (!complements?.length) return;
    
    const complementElement = document.getElementById(`payment-complement-${complements[0].uuid}`);
    if (complementElement) {
      complementElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedPaymentComplements([complements[0].uuid]);
      
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightedPaymentComplements([]), 3000);
    }
  }, [helpers, paymentComplementMap]);

  // Modal handlers
  const handleOpenPreview = useCallback((invoice: CFDI) => {
    setModalState(prev => ({ ...prev, selectedCFDI: invoice, isModalOpen: true }));
  }, []);

  const handleClosePreview = useCallback(() => {
    setModalState(prev => ({ ...prev, isModalOpen: false }));
  }, []);

  const handleOpenDeductibility = useCallback((invoice: CFDI) => {
    setModalState(prev => ({ ...prev, cfdiForDeductibility: invoice, isDeductibilityEditorOpen: true }));
  }, []);

  const handleCloseDeductibility = useCallback(() => {
    setModalState(prev => ({ ...prev, isDeductibilityEditorOpen: false }));
  }, []);

  // Evaluation handler
  const handleEvaluate = useCallback(async () => {
    setIsEvaluating(true);
    try {
      if (type === 'egresos') {
        await cfdiService.syncSuppliersFromInvoices(clientId).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const result = type === 'ingresos' 
        ? await cfdiService.evaluateIncome(clientId)
        : await cfdiService.evaluateDeductibility(clientId);
      
      // Always refresh and highlight all unlocked invoices that were evaluated
      const freshInvoices = await cfdiService.getInvoices(clientId);
      const freshMap: Record<string, CFDI> = {};
      const evaluatedUuids: string[] = [];
      
      freshInvoices.forEach(inv => {
        freshMap[inv.uuid] = inv;
        // Track ALL unlocked ones that match the type (these were all evaluated)
        if (!inv.locked && inv.tipoDeComprobante !== 'P' && ((type === 'egresos' && inv.esEgreso) || (type === 'ingresos' && !inv.esEgreso))) {
          evaluatedUuids.push(inv.uuid);
        }
        // Notify parent for each invoice
        onInvoiceUpdate?.(inv);
      });
      setUpdatedInvoices(freshMap);
      
      // Highlight evaluated invoices for 4 seconds
      setHighlightedEvaluated(evaluatedUuids);
      setTimeout(() => {
        setHighlightedEvaluated([]);
      }, 4000);
      
      toast({
        title: "Evaluación completada",
        description: type === 'ingresos' 
          ? `Se evaluaron los ingresos para las ${result.processed} facturas sin bloqueo de edición 🔓`
          : `Se evaluó la deducibilidad para las ${result.processed} facturas sin bloqueo de edición 🔓`,
        variant: "default"
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo completar la evaluación.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  }, [type, clientId, toast, onInvoiceUpdate]);

  // Bulk verification handler
  const handleBulkVerify = useCallback(async () => {
    const invoicesToVerify = filteredInvoices.filter(inv => inv.tipoDeComprobante !== 'P');
    
    if (invoicesToVerify.length === 0) {
      toast({ title: "No hay facturas para verificar", variant: "default" });
      return;
    }

    // Open modal and reset state
    setVerificationModalState({
      isOpen: true,
      isComplete: false,
      canceledInvoices: []
    });
    
    setIsVerifying(true);
    setVerificationTotal(invoicesToVerify.length);
    setVerificationProgress(0);
    
    let verified = 0, errors = 0;
    const canceledFound: CanceledInvoiceInfo[] = [];
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (const invoice of invoicesToVerify) {
      try {
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
        
        if (!response.ok) throw new Error();
        
        const result = await response.json();
        verified++;
        
        // Check if invoice was not canceled before but now is
        const wasCanceled = invoice.estaCancelado;
        const nowCanceled = result.status === "Cancelado";
        
        if (nowCanceled !== wasCanceled) {
          await cfdiService.updateInvoice(clientId, invoice.uuid, { 
            estaCancelado: nowCanceled,
            fechaCancelación: result.cancellationDate || null
          });
          
          // Track new cancellations (wasn't canceled before, now is)
          if (!wasCanceled && nowCanceled) {
            canceledFound.push({
              uuid: invoice.uuid,
              fecha: invoice.fecha,
              emisor: invoice.nombreEmisor || invoice.rfcEmisor,
              rfcEmisor: invoice.rfcEmisor,
              total: invoice.total,
              fechaCancelacion: result.cancellationDate
            });
          }
        }
        
        setVerificationProgress(prev => prev + 1);
      } catch {
        errors++;
        setVerificationProgress(prev => prev + 1);
      }
    }
    
    // Update modal state with results
    setVerificationModalState({
      isOpen: true,
      isComplete: true,
      canceledInvoices: canceledFound
    });
    
    setIsVerifying(false);
  }, [filteredInvoices, clientId, toast]);

  // Close verification modal
  const handleCloseVerificationModal = useCallback(() => {
    setVerificationModalState({
      isOpen: false,
      isComplete: false,
      canceledInvoices: []
    });
  }, []);

  return {
    modalState,
    categories,
    highlightedPaymentComplements,
    isEvaluating,
    isVerifying,
    verificationProgress,
    verificationTotal,
    verificationModalState,
    filteredInvoices,
    invoicesByMonth,
    sortedMonths,
    totalAmount,
    monthlyTaxTotals,
    helpers,
    dateUtils,
    handleUpdateInvoice,
    handleLockToggle,
    handleMonthSelect,
    handleToggleDeductible,
    handleCategorySelect,
    handleFindPaymentComplement,
    handleOpenPreview,
    handleClosePreview,
    handleOpenDeductibility,
    handleCloseDeductibility,
    handleEvaluate,
    handleBulkVerify,
    handleCloseVerificationModal,
    highlightedEvaluated
  };
}
