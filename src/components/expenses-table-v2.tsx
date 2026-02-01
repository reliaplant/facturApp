"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check, Tag, Calculator, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CFDI } from "@/models/CFDI";
import { CFDIPreviewModal } from "@/components/cfdi-preview-modal-v2";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CFDIDeductibilityEditor } from "@/components/cfdi-deductibility-editor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCFDITable } from "@/hooks/useCFDITable";
import { VerificationProgressModal } from "@/components/verification-progress-modal";

interface ExpensesTableProps {
  year: number;
  invoices: CFDI[];
  disableExport?: boolean;
  clientId: string;
  onInvoiceUpdate?: (updatedInvoice: CFDI) => void;
}

export function ExpensesTableV2({ year, invoices = [], disableExport = false, clientId, onInvoiceUpdate }: ExpensesTableProps) {
  // RFC filter is specific to expenses table
  const [rfcFilter, setRfcFilter] = useState<string>('all');

  const {
    modalState,
    categories,
    highlightedPaymentComplements,
    highlightedEvaluated,
    isEvaluating,
    isVerifying,
    verificationProgress,
    verificationTotal,
    filteredInvoices: allFilteredInvoices,
    invoicesByMonth: allInvoicesByMonth,
    sortedMonths: allSortedMonths,
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
    verificationModalState,
    handleCloseVerificationModal
  } = useCFDITable({ type: 'egresos', year, clientId, invoices, onInvoiceUpdate });

  // Get unique emisores for filter dropdown
  const uniqueEmisores = useMemo(() => {
    const emisorMap = new Map<string, string>();
    allFilteredInvoices.forEach(inv => {
      if (inv.rfcEmisor && !helpers.isPaymentComplement(inv)) {
        emisorMap.set(inv.rfcEmisor, inv.nombreEmisor || inv.rfcEmisor);
      }
    });
    return Array.from(emisorMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [allFilteredInvoices, helpers]);

  // Apply RFC filter on top of hook filtering
  const filteredInvoices = rfcFilter === 'all'
    ? allFilteredInvoices 
    : allFilteredInvoices.filter(invoice => invoice.rfcEmisor === rfcFilter);

  // Recalculate invoices by month after RFC filter
  const invoicesByMonth: Record<number, CFDI[]> = {};
  filteredInvoices.forEach(invoice => {
    try {
      const month = dateUtils.getMonth(invoice.fecha);
      if (!invoicesByMonth[month]) invoicesByMonth[month] = [];
      invoicesByMonth[month].push(invoice);
    } catch {}
  });
  const sortedMonths = Object.keys(invoicesByMonth).map(Number).sort((a, b) => a - b);

  // Row renderer
  const renderInvoiceRow = (invoice: CFDI) => {
    const isS01 = invoice.usoCFDI === 'S01';
    const isComplement = helpers.isPaymentComplement(invoice);
    const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && helpers.isPaidWithComplement(invoice);
    const needsComplement = helpers.needsPaymentComplement(invoice);
    const isAnnualDeduction = invoice.usoCFDI?.startsWith('D') || invoice.anual;
    const isHighlighted = highlightedPaymentComplements.includes(invoice.uuid);
    const isEvaluatedHighlight = highlightedEvaluated.includes(invoice.uuid);
    
    // Row classes
    const rowClasses = `
      border-t border-gray-200 dark:border-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer
      ${invoice.locked ? 'opacity-80' : ''}
      ${isHighlighted ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}
      ${isEvaluatedHighlight ? 'animate-skeleton-purple' : ''}
    `.trim();

    // Skip rendering certain cells for payment complements and S01
    const showCells = !isComplement;
    const showForS01 = !isS01 && showCells;

    return (
      <tr
        key={invoice.uuid}
        id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
        className={rowClasses}
        onClick={() => handleOpenPreview(invoice)}
      >
        {/* Lock Button */}
        <td className="pl-7 px-2 py-1 align-middle text-center h-[64px]">
          {isS01 || isComplement ? (
            <span className="h-5 w-5 block" />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`h-5 w-5 ${!invoice.locked ? 'bg-red-50 hover:bg-red-100' : ''}`}
              onClick={(e) => handleLockToggle(e, invoice)}
              disabled={invoice.estaCancelado}
            >
              {invoice.locked ? 
                <Lock className="h-3 w-3 text-gray-400" /> : 
                <Unlock className="h-3 w-3 text-red-500" />}
            </Button>
          )}
        </td>
        
        {/* Invoice Info */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className="text-xs">{format(new Date(invoice.fecha), 'dd MMM yyyy', { locale: es })}</span>
            <span 
              className={`text-[10px] text-left ${
                invoice.estaCancelado 
                  ? 'text-red-500 line-through' 
                  : 'text-purple-500'
              }`}
            >
              {invoice.uuid.substring(0, 8)}
            </span>
          </div>
        </td>

        {/* Emisor Info */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className={`truncate max-w-[30ch] text-xs ${isS01 ? "text-gray-400" : ""}`}>
              {invoice.nombreEmisor}
            </span>
            <span className={isS01 ? "text-gray-400 text-[10px]" : "text-purple-500 text-[10px]"}>
              {invoice.regimenFiscal || 'N/A'}
            </span>
          </div>
        </td>

        {/* Uso/Pago */}
        <td className="px-2 py-1 align-middle">
          <div className="flex flex-col">
            <span className={`text-xs ${isS01 ? "text-gray-400" : "font-medium"}`}>
              {invoice.usoCFDI}
            </span>
            {showForS01 && (
              <span className={`text-[10px] ${
                needsComplement ? 'text-red-500 font-medium' : 
                helpers.isPaidPPDInvoice(invoice) ? 'text-purple-600 font-medium' : 'text-purple-500'
              }`}>
                {invoice.formaPago} / {' '}
                {hasComplement ? (
                  <span className="cursor-pointer hover:underline hover:text-purple-800 transition-colors" onClick={(e) => { e.stopPropagation(); handleFindPaymentComplement(invoice); }}>
                    {invoice.metodoPago}
                    <Check className="h-3 w-3 inline ml-1 text-purple-600" />
                  </span>
                ) : invoice.metodoPago}
                {needsComplement && ' ⚠️'}
              </span>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="px-2 py-1 align-middle" onClick={(e) => e.stopPropagation()}>
          {isComplement || isS01 ? null : highlightedEvaluated.includes(invoice.uuid || '') ? (
            <span className="inline-block h-5 w-20 rounded animate-skeleton-purple" />
          ) : invoice.locked ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {invoice.categoria || 'Sin categoría'}
            </span>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] transition-colors cursor-pointer ${
                  invoice.categoria 
                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}>
                  {invoice.categoria || 'Sin categoría'}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="max-h-[200px] overflow-y-auto">
                  <div 
                    className="text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleCategorySelect(invoice, null); }}
                  >
                    Sin categoría
                  </div>
                  {categories.map(category => (
                    <div
                      key={category.id || ''}
                      className={`text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center ${
                        invoice.categoria === category.name ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                      }`}
                      onClick={(e) => { e.stopPropagation(); handleCategorySelect(invoice, category.id || null); }}
                    >
                      <span>{category.name}</span>
                      {invoice.categoria === category.name && <Check className="h-4 w-4 text-purple-500" />}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </td>

        {/* SubTotal */}
        <td className="px-2 py-1 align-middle text-right">
          {showCells && (
            <span className={`text-xs ${isS01 ? "text-gray-400" : ""}`}>
              ${invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          )}
        </td>

        {/* Impuestos */}
        <td className="px-2 py-1 align-middle">
          {showCells && (
            <div className={`flex flex-col text-[10px] text-right ${isS01 ? "text-gray-400" : "text-gray-500"}`}>
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
          {showCells && (
            <span className={`text-xs ${isS01 ? "text-gray-400" : ""}`}>
              ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          )}
        </td>
        
        {/* Month selection */}
        <td className="px-2 py-1 align-middle text-center" onClick={(e) => e.stopPropagation()}>
          {showForS01 && (
            highlightedEvaluated.includes(invoice.uuid || '') ? (
              <span className="inline-block h-4 w-16 rounded animate-skeleton-purple mx-auto" />
            ) : (
              <Select
                value={invoice.mesDeduccion?.toString() || "none"}
                onValueChange={(value) => handleMonthSelect(invoice.uuid, value)}
                disabled={invoice.locked}
              >
                <SelectTrigger className={`h-7 w-20 text-xs mx-auto ${needsComplement ? 'text-red-500' : ''}`}>
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem 
                      key={i+1} 
                      value={(i+1).toString()}
                      className={needsComplement ? 'text-red-500' : ''}
                    >
                      {dateUtils.getMonthAbbreviation(i+1)}
                      {needsComplement ? " (Sin CP)" : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value="13">ANUAL</SelectItem>
                </SelectContent>
              </Select>
            )
          )}
        </td>
        
        {/* Deductible status */}
        <td className="px-2 py-1 align-middle text-center">
          {showForS01 && (
            highlightedEvaluated.includes(invoice.uuid || '') ? (
              <span className="inline-block h-5 w-8 rounded animate-skeleton-purple mx-auto" />
            ) : (
              <Badge 
                variant="outline" 
                className={`cursor-pointer hover:opacity-80 transition-opacity ${
                  (isAnnualDeduction && invoice.esDeducible)
                    ? 'bg-purple-50 text-purple-700 border-purple-300' 
                    : invoice.esDeducible
                      ? 'bg-green-50 text-green-700 border-green-300' 
                      : 'bg-red-50 text-red-700 border-red-300'
                }`}
                onClick={(e) => handleToggleDeductible(e, invoice)}
              >
                {(isAnnualDeduction && invoice.esDeducible) ? 'Sí | Anual' : invoice.esDeducible ? 'Sí' : 'No'}
              </Badge>
            )
          )}
        </td>
        
        {/* Gravado ISR */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => showForS01 && !invoice.locked && handleOpenDeductibility(invoice)}
        >
          {showCells && !isS01 && (
            highlightedEvaluated.includes(invoice.uuid || '') ? (
              <span className="inline-block h-4 w-16 rounded animate-skeleton-purple" />
            ) : (isAnnualDeduction && invoice.esDeducible) ? (
              <span className="text-gray-400 text-xs">$0.00 (Anual)</span>
            ) : (
              <span className="text-xs">
                ${invoice.esDeducible && invoice.mesDeduccion 
                  ? (invoice.gravadoISR || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                  : '0.00'}
                {invoice.gravadoModificado && <span className="text-purple-500 ml-1">(Mod)</span>}
              </span>
            )
          )}
        </td>

        {/* Gravado IVA */}
        <td 
          className="px-2 py-1 align-middle text-right cursor-pointer"
          onDoubleClick={() => showForS01 && !invoice.locked && handleOpenDeductibility(invoice)}
        >
          {showCells && !isS01 && (
            highlightedEvaluated.includes(invoice.uuid || '') ? (
              <span className="inline-block h-4 w-16 rounded animate-skeleton-purple" />
            ) : (isAnnualDeduction && invoice.esDeducible) ? (
              <span className="text-gray-400 text-xs">$0.00 (Anual)</span>
            ) : (
              <span className="text-xs">
                ${invoice.esDeducible && invoice.mesDeduccion
                  ? (invoice.gravadoIVA || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                  : '0.00'}
                {invoice.gravadoModificado && <span className="text-purple-500 ml-1">(Mod)</span>}
              </span>
            )
          )}
        </td>
        
        {/* Exento */}
        <td className="pr-7 px-2 py-1 align-middle text-right">
          {showCells && !isS01 && (
            highlightedEvaluated.includes(invoice.uuid || '') ? (
              <span className="inline-block h-4 w-14 rounded animate-skeleton-purple" />
            ) : (
              <span className="text-xs">
                ${invoice.esDeducible && invoice.mesDeduccion
                  ? Math.max(0, (invoice.total || 0) - (invoice.gravadoIVA || 0) - (invoice.gravadoISR || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                  : '0.00'}
              </span>
            )
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-2">
      <div className="bg-white dark:bg-gray-800 border-b">
        {/* Header */}
        <div className="bg-gray-100 px-7 py-2 border-b border-gray-300 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium whitespace-nowrap">
            Facturas Recibidas {year}
          </h2>
          
          <div className="flex items-center gap-2">
            {/* RFC Filter Selector */}
            <Select value={rfcFilter} onValueChange={setRfcFilter}>
              <SelectTrigger className="h-7 w-[320px] text-xs">
                <SelectValue placeholder="Todos los emisores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los emisores</SelectItem>
                {uniqueEmisores.map(([rfc, nombre]) => (
                  <SelectItem key={rfc} value={rfc} className="text-xs">
                    {rfc} - {nombre.length > 20 ? nombre.substring(0, 20) + '...' : nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Verify CFDIs button */}
            <Button
              variant="outline"
              size="xs"
              className="flex items-center whitespace-nowrap"
              onClick={handleBulkVerify}
              disabled={isVerifying}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isVerifying ? "animate-spin" : ""}`} />
              {isVerifying 
                ? `Verificando (${verificationProgress}/${verificationTotal})` 
                : "Verificar CFDIs"}
            </Button>
            
            {/* Evaluate deductibility button */}
            <Button
              variant="black"
              size="xs"
              className="flex items-center whitespace-nowrap"
              onClick={handleEvaluate}
              disabled={isEvaluating}
            >
              <Calculator className={`h-3 w-3 mr-1 ${isEvaluating ? "animate-spin" : ""}`} />
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
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-left">Categoría</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">SubTotal</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Impuestos</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Total</th>
                  <th className="px-2 py-1.5 font-medium bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 text-center">Mes Pago</th>
                  <th className="px-2 py-1.5 font-medium text-center bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">¿Es deducible?</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado ISR</th>
                  <th className="px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Gravado IVA</th>
                  <th className="pr-8 px-2 py-1.5 font-medium text-right bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">Exento</th>
                </tr>
              </thead>
              <tbody className="mt-1">
                {sortedMonths.length > 0 ? (
                  sortedMonths.map((month) => (
                    <React.Fragment key={month}>
                      <tr className="bg-gray-200 dark:bg-gray-700 hover:!bg-gray-200 dark:hover:!bg-gray-700">
                        <td colSpan={14} className="pl-7 px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">{dateUtils.getMonthName(month)}</td>
                      </tr>
                      
                      {invoicesByMonth[month].map(renderInvoiceRow)}
                      
                      {/* Monthly Totals */}
                      <tr className="bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 hover:!bg-gray-100 dark:hover:!bg-gray-800">
                        <td colSpan={10} className="px-7 py-1.5 text-right text-xs text-gray-500 dark:text-gray-400">Total {dateUtils.getMonthName(month)}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-600 dark:text-gray-300">
                          ${monthlyTaxTotals[month]?.isr?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-600 dark:text-gray-300">
                          ${monthlyTaxTotals[month]?.iva?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                        <td className="pr-7 px-2 py-1.5 text-right text-xs text-gray-600 dark:text-gray-300">
                          ${monthlyTaxTotals[month]?.exento?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="px-2 py-4 text-center text-gray-500 text-xs">
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
      <CFDIPreviewModal
        cfdi={modalState.selectedCFDI}
        isOpen={modalState.isModalOpen}
        onClose={handleClosePreview}
        onUpdate={handleUpdateInvoice}
      />
      
      <CFDIDeductibilityEditor
        cfdi={modalState.cfdiForDeductibility}
        isOpen={modalState.isDeductibilityEditorOpen}
        onClose={handleCloseDeductibility}
        onSave={handleUpdateInvoice}
      />

      <VerificationProgressModal
        isOpen={verificationModalState.isOpen}
        isComplete={verificationModalState.isComplete}
        progress={verificationProgress}
        total={verificationTotal}
        canceledInvoices={verificationModalState.canceledInvoices}
        onClose={handleCloseVerificationModal}
      />
    </div>
  );
}
