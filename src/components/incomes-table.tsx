"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/models/Invoice";
import { InvoicePreviewModal } from "@/components/invoice-preview-modal";
import { useToast } from "@/components/ui/use-toast";
import { ExportInvoicesExcel } from "@/components/export-invoices-excel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IncomesTableProps {
  year: number;
  invoices: Invoice[];
  disableExport?: boolean;
}

export function IncomesTable({ year, invoices = [], disableExport = false }: IncomesTableProps) {
  // Remove searchTerm state variable
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatedInvoices, setUpdatedInvoices] = useState<Record<string, Invoice>>({});
  const { toast } = useToast();

  // Load/Save updatedInvoices from/to localStorage
  useEffect(() => {
    try {
      const savedInvoices = localStorage.getItem(`updatedEmittedInvoices_${year}`);
      if (savedInvoices) {
        setUpdatedInvoices(JSON.parse(savedInvoices));
      }
    } catch (error) { /* Ignore storage errors */ }
  }, [year]);
  
  // Separate effect to save to localStorage when updatedInvoices changes
  useEffect(() => {
    // Skip the initial render
    if (Object.keys(updatedInvoices).length === 0) return;
    
    try {
      localStorage.setItem(`updatedEmittedInvoices_${year}`, JSON.stringify(updatedInvoices));
    } catch (error) { /* Ignore storage errors */ }
  }, [updatedInvoices, year]);

  // Logging for debugging
  useEffect(() => {
    console.log(`Incomes: ${invoices.length} total, ${invoices.filter(inv => !inv.recibida).length} emitted`);
  }, [invoices]);
  
  // Merge and filter invoices - removed searchTerm filter
  const mergedInvoices = invoices.map(invoice => updatedInvoices[invoice.id] || invoice);
  const filteredInvoices = mergedInvoices.filter(invoice => {
    try {
      return new Date(invoice.fecha).getFullYear() === year && !invoice.recibida;
    } catch (error) { return false; }
  });
  
  const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);

  // Date and month utilities
  const getMonth = (dateString: string): number => new Date(dateString).getMonth() + 1;
  
  const getMonthName = (month: number): string => 
    format(new Date(year, month - 1, 1), 'MMMM', { locale: es });
  
  const getMonthAbbreviation = (month: number): string => {
    if (month === 13) return 'ANUAL';
    const monthAbbreviations = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return monthAbbreviations[month - 1] || '';
  };

  // Group invoices by month
  const invoicesByMonth = filteredInvoices.reduce((acc: Record<number, Invoice[]>, invoice) => {
    const month = getMonth(invoice.fecha);
    (acc[month] = acc[month] || []).push(invoice);
    return acc;
  }, {});
  
  const sortedMonths = Object.keys(invoicesByMonth).map(Number).sort((a, b) => a - b);

  // Handle invoice interactions
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  // Helper function to safely save to localStorage during updates
  const safelyUpdateInvoice = (updatedInvoice: Invoice) => {
    // Create the new state first
    const newUpdatedInvoices = {
      ...updatedInvoices,
      [updatedInvoice.id]: updatedInvoice
    };
    
    // Update state
    setUpdatedInvoices(newUpdatedInvoices);
    
    // Update selected invoice if needed
    if (selectedInvoice?.id === updatedInvoice.id) {
      setSelectedInvoice(updatedInvoice);
    }
    
    // Skip localStorage operations in the handleUpdateInvoice function
    // since the useEffect above will handle that
    
    toast({
      title: "Factura actualizada",
      description: "La información ha sido actualizada correctamente.",
    });
  };

  // Replace handleUpdateInvoice with safelyUpdateInvoice
  const handleUpdateInvoice = safelyUpdateInvoice;

  const handleLockToggle = (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    const updatedInvoice = { ...invoice, locked: !invoice.locked };
    handleUpdateInvoice(updatedInvoice);
    
    toast({
      title: updatedInvoice.locked ? "Factura bloqueada" : "Factura desbloqueada",
      description: updatedInvoice.locked 
        ? "La factura ha sido bloqueada para evitar cambios accidentales" 
        : "La factura puede ser modificada",
    });
  };

  const handleMonthSelect = (invoiceId: string, month: string) => {
    const invoice = filteredInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    
    handleUpdateInvoice({
      ...invoice,
      mesDeduccion: month === "none" ? undefined : parseInt(month),
      esDeducible: month !== "none"
    });
  };
  
  // Auto-assign PUE invoices to their issue month - fix potential loop
  useEffect(() => {
    let updatesNeeded: Record<string, Invoice> = {};
    let hasUpdates = false;
    
    filteredInvoices.forEach(invoice => {
      if (invoice.metodoPago === "PUE" && !invoice.mesDeduccion && !invoice.locked) {
        updatesNeeded[invoice.id] = {
          ...invoice,
          mesDeduccion: getMonth(invoice.fecha),
          esDeducible: true
        };
        hasUpdates = true;
      }
    });
    
    if (hasUpdates) {
      // Use setState with function to ensure we're working with latest state
      setUpdatedInvoices(prev => ({ ...prev, ...updatesNeeded }));
      // Skip direct localStorage operations here
    }
  }, [filteredInvoices]); // Only depend on filteredInvoices, not year

  // Helper functions
  const isGravado = (invoice: Invoice) => invoice.mesDeduccion && !invoice.estaCancelado;
  
  // Calculate totals for tax reporting
  const calculateMonthlyTaxTotals = () => {
    const monthlyTotals: Record<number, { isr: number; iva: number }> = {};
    
    // Initialize all months including annual (13)
    for (let i = 1; i <= 13; i++) {
      monthlyTotals[i] = { isr: 0, iva: 0 };
    }
    
    filteredInvoices.forEach(invoice => {
      if (invoice.mesDeduccion && !invoice.estaCancelado) {
        monthlyTotals[invoice.mesDeduccion].isr += invoice.subTotal;
        monthlyTotals[invoice.mesDeduccion].iva += invoice.Gravado || invoice.subTotal;
      }
    });
    
    return monthlyTotals;
  };
  
  const monthlyTaxTotals = calculateMonthlyTaxTotals();
  
  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border">
          {/* Simplified header without search bar */}
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
                    <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado</th>
                    <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Vig.</th>
                  </tr>
                </thead>
                <tbody className="mt-1">
                  {sortedMonths.length > 0 ? (
                    sortedMonths.map((month) => (
                      <React.Fragment key={month}>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <td colSpan={12} className="px-2 py-1.5 font-medium">{getMonthName(month)}</td>
                        </tr>
                        
                        {invoicesByMonth[month].map((invoice, index) => (
                          <tr
                            key={invoice.id}
                            className={`border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-gray-50 dark:bg-gray-900'}
                                      ${invoice.locked ? 'opacity-80' : ''}`}
                          >
                            {/* Lock Button */}
                            <td className="px-2 py-1 align-middle text-center">
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
                                <span className="text-gray-500 text-xs">
                                  {invoice.formaPago} / {invoice.metodoPago}
                                </span>
                              </div>
                            </td>

                            {/* Concept */}
                            <td className="px-2 py-1 align-middle">
                              <span className="text-sm">{invoice.concepto || invoice.descripcion || 'Sin concepto'}</span>
                            </td>
                            
                            {/* Category */}
                            <td className="px-2 py-1 align-middle">
                              <span className="text-sm">{invoice.categoria || 'Sin categoría'}</span>
                            </td>

                            {/* Amount Cells */}
                            <td className="px-2 py-1 align-middle text-right">
                              ${invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="px-2 py-1 align-middle">
                              <div className="flex flex-col text-xs text-right">
                                <span>+IVA: ${(invoice.impuestoTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                <span>-IVA: ${(invoice.ivaRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                                <span>-ISR: ${(invoice.isrRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </td>
                            
                            <td className="px-2 py-1 align-middle text-right font-medium">
                              ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </td>
                            
                            {/* Collection Month */}
                            <td className="px-2 py-1 align-middle text-center">
                              <Select
                                value={invoice.mesDeduccion?.toString() || "none"}
                                onValueChange={(value) => handleMonthSelect(invoice.id, value)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SelectTrigger className="h-7 w-20 text-xs mx-auto">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i+1} value={(i+1).toString()}>
                                      {getMonthAbbreviation(i+1)}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="13">ANUAL</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            
                            {/* Taxable Amount */}
                            <td className="px-2 py-1 align-middle text-right">
                              ${isGravado(invoice) 
                                ? invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }) 
                                : '0.00'}
                            </td>
                            
                            {/* Valid Status */}
                            <td className="px-2 py-1 align-middle text-center">
                              {!invoice.estaCancelado 
                                ? <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Sí</Badge>
                                : <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">No</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                        
                        {/* Monthly Totals */}
                        <tr className="bg-gray-100 dark:bg-gray-800 font-medium border-t border-gray-300 dark:border-gray-600">
                          <td colSpan={11} className="px-2 py-1.5 text-right text-gray-500">
                            Total Gravado: ISR ${monthlyTaxTotals[month].isr.toLocaleString('es-MX', { minimumFractionDigits: 2 })}   &nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;   
                            IVA ${monthlyTaxTotals[month].iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={1} className="px-2 py-1.5 text-right">
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-2 py-4 text-center text-gray-500 text-xs">
                        No se encontraron facturas CFDI recibidas para el año {year} con los filtros actuales
                      </td>
                    </tr>
                  )}
                  
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add the invoice preview modal */}
        <InvoicePreviewModal
          invoice={selectedInvoice}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateInvoice}
        />
      </div>
    </TooltipProvider>
  );
}
