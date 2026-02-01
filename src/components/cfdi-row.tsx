"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Check, Tag } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { CFDI } from "@/models/CFDI";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Category } from "@/models/Category";
import { CFDIHelpers, DateUtils } from "@/hooks/useCFDITable";

interface CFDIRowProps {
  invoice: CFDI;
  type: 'ingresos' | 'egresos';
  helpers: CFDIHelpers;
  dateUtils: DateUtils;
  categories: Category[];
  highlightedPaymentComplements: string[];
  onLockToggle: (e: React.MouseEvent, invoice: CFDI) => void;
  onMonthSelect: (invoiceUuid: string, month: string) => void;
  onToggleDeductible: (e: React.MouseEvent, invoice: CFDI) => void;
  onCategorySelect: (invoice: CFDI, categoryId: string | null) => void;
  onFindPaymentComplement: (invoice: CFDI) => void;
  onOpenPreview: (invoice: CFDI) => void;
  onOpenDeductibility: (invoice: CFDI) => void;
}

export const CFDIRow = React.memo(function CFDIRow({
  invoice,
  type,
  helpers,
  dateUtils,
  categories,
  highlightedPaymentComplements,
  onLockToggle,
  onMonthSelect,
  onToggleDeductible,
  onCategorySelect,
  onFindPaymentComplement,
  onOpenPreview,
  onOpenDeductibility
}: CFDIRowProps) {
  const isIngreso = type === 'ingresos';
  const isS01 = invoice.usoCFDI === 'S01';
  const isComplement = helpers.isPaymentComplement(invoice);
  const isAnnualDeduction = invoice.usoCFDI?.startsWith('D');
  const needsComplement = helpers.needsPaymentComplement(invoice);
  const hasComplement = !isComplement && invoice.metodoPago === 'PPD' && helpers.isPaidWithComplement(invoice);
  const isHighlighted = highlightedPaymentComplements.includes(invoice.uuid);
  
  // Row classes
  const rowClasses = `
    border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800
    ${isS01 ? 'bg-gray-100 dark:bg-gray-800/80 text-gray-400' : 'bg-white dark:bg-gray-950'}
    ${invoice.locked ? 'opacity-80' : ''}
    ${isComplement ? '!bg-blue-50 dark:bg-blue-900 text-blue-600' : ''}
    ${hasComplement ? '!bg-blue-50/30 dark:!bg-blue-900/30' : ''}
    ${isHighlighted ? '!bg-yellow-100 dark:!bg-yellow-900' : ''}
  `.trim();

  // Skip rendering certain cells for payment complements
  const showCells = !isComplement;
  const showForS01 = !isS01 && showCells;

  return (
    <tr
      id={isComplement ? `payment-complement-${invoice.uuid}` : undefined}
      className={rowClasses}
      onClick={hasComplement ? () => onFindPaymentComplement(invoice) : undefined}
      style={{ cursor: hasComplement ? 'pointer' : undefined }}
    >
      {/* Lock Button */}
      <td className="pl-7 px-2 py-1 align-middle text-center">
        {isS01 || isComplement ? (
          <span className="h-7 w-7 block" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${!invoice.locked ? 'bg-red-50 hover:bg-red-100' : ''}`}
            onClick={(e) => onLockToggle(e, invoice)}
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
          <span>{format(new Date(invoice.fecha), 'dd MMM yyyy', { locale: es })}</span>
          <button 
            className="text-blue-500 hover:text-blue-700 text-xs text-left"
            onClick={() => onOpenPreview(invoice)}
          >
            {invoice.uuid.substring(0, 8)}... ({invoice.tipoDeComprobante})
          </button>
        </div>
      </td>

      {/* Counterpart (Receptor for ingresos, Emisor for egresos) */}
      <td className="px-2 py-1 align-middle">
        <div className="flex flex-col">
          <span className={`truncate max-w-[40ch] ${isS01 ? "text-gray-400" : ""}`}>
            {isIngreso 
              ? `${invoice.nombreReceptor} (${invoice.regimenFiscalReceptor || 'N/A'})`
              : `${invoice.nombreEmisor} (${invoice.regimenFiscal || 'N/A'})`
            }
          </span>
          <span className={isS01 ? "text-gray-400" : "text-gray-500 text-xs"}>
            {isIngreso 
              ? `${invoice.rfcReceptor}, CP: ${invoice.domicilioFiscalReceptor || 'N/A'}`
              : invoice.rfcEmisor
            }
          </span>
        </div>
      </td>

      {/* Uso/Pago */}
      <td className="px-2 py-1 align-middle">
        <div className="flex flex-col">
          <span className={`${isS01 ? "text-gray-400" : "font-medium"}`}>
            {invoice.usoCFDI}
          </span>
          {showForS01 && (
            <span className={`text-xs ${
              needsComplement ? 'text-red-500 font-medium' : 
              helpers.isPaidPPDInvoice(invoice) ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}>
              {invoice.formaPago} / {' '}
              {hasComplement ? (
                <span className="cursor-pointer hover:underline" onClick={() => onFindPaymentComplement(invoice)}>
                  {invoice.metodoPago}
                  <Check className="h-3 w-3 inline ml-1 text-blue-600" />
                </span>
              ) : invoice.metodoPago}
              {needsComplement && ' ⚠️'}
            </span>
          )}
        </div>
      </td>

      {/* Cancelado Status */}
      <td className="px-2 py-1 align-middle text-center">
        {isComplement ? (
          <span className="text-gray-400">-</span>
        ) : invoice.estaCancelado ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-red-100 text-red-800">Sí</span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">No</span>
        )}
      </td>
      
      {/* Category */}
      <td className="px-2 py-1 align-middle">
        {isComplement || isS01 ? null : invoice.locked ? (
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
                  onClick={() => onCategorySelect(invoice, null)}
                >
                  Sin categoría
                </div>
                {categories.map(category => (
                  <div
                    key={category.id || ''}
                    className={`text-sm px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex justify-between items-center ${
                      invoice.categoria === category.name ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => onCategorySelect(invoice, category.id || null)}
                  >
                    <span>{category.name}</span>
                    {invoice.categoria === category.name && <Check className="h-4 w-4 text-blue-500" />}
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
          <span className={isS01 ? "text-gray-400" : ""}>
            ${invoice.subTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        )}
      </td>

      {/* Impuestos */}
      <td className="px-2 py-1 align-middle">
        {showCells && (
          <div className={`flex flex-col text-xs text-right ${isS01 ? "text-gray-400" : ""}`}>
            {(invoice.impuestoTrasladado || 0) > 0 && (
              <span>+IVA: ${(invoice.impuestoTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            )}
            {!isIngreso && (invoice.iepsTrasladado || 0) > 0 && (
              <span>+IEPS: ${(invoice.iepsTrasladado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            )}
            {(invoice.ivaRetenido || 0) > 0 && (
              <span>-IVA: ${(invoice.ivaRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            )}
            {(invoice.isrRetenido || 0) > 0 && (
              <span>-ISR: ${(invoice.isrRetenido || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            )}
            {/* Placeholder when no taxes */}
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
          <span className={isS01 ? "text-gray-400" : ""}>
            ${invoice.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </span>
        )}
      </td>
      
      {/* Month selection */}
      <td className="px-2 py-1 align-middle text-center">
        {showForS01 && (
          <Select
            value={invoice.mesDeduccion?.toString() || "none"}
            onValueChange={(value) => onMonthSelect(invoice.uuid, value)}
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
        )}
      </td>
      
      {/* Deductible status */}
      <td className="px-2 py-1 align-middle text-center">
        {showForS01 && (
          <Badge 
            variant="outline" 
            className={`cursor-pointer hover:opacity-80 transition-opacity ${
              (isAnnualDeduction && invoice.esDeducible)
                ? 'bg-purple-50 text-purple-700 border-purple-300' 
                : invoice.esDeducible
                  ? 'bg-green-50 text-green-700 border-green-300' 
                  : 'bg-red-50 text-red-700 border-red-300'
            }`}
            onClick={(e) => onToggleDeductible(e, invoice)}
          >
            {(isAnnualDeduction && invoice.esDeducible) ? 'Anual' : invoice.esDeducible ? 'Sí' : 'No'}
          </Badge>
        )}
      </td>
      
      {/* Gravado ISR */}
      <td 
        className="px-2 py-1 align-middle text-right cursor-pointer"
        onDoubleClick={() => showForS01 && !invoice.locked && onOpenDeductibility(invoice)}
      >
        {showCells && !isS01 && (
          (isAnnualDeduction && invoice.esDeducible) ? (
            <span className="text-gray-400">$0.00 (Anual)</span>
          ) : (
            <span>
              ${invoice.esDeducible && invoice.mesDeduccion 
                ? (invoice.gravadoModificado ? (invoice.gravadoISR || 0) : (isIngreso ? invoice.subTotal : (invoice.gravadoISR || 0))).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )
        )}
      </td>

      {/* Gravado IVA */}
      <td 
        className={`px-2 py-1 align-middle text-right cursor-pointer ${!isIngreso ? '' : 'pr-7'}`}
        onDoubleClick={() => showForS01 && !invoice.locked && onOpenDeductibility(invoice)}
      >
        {showCells && !isS01 && (
          (isAnnualDeduction && invoice.esDeducible) ? (
            <span className="text-gray-400">$0.00 (Anual)</span>
          ) : (
            <span>
              ${invoice.esDeducible && invoice.mesDeduccion
                ? (invoice.gravadoModificado ? (invoice.gravadoIVA || 0) : (invoice.impuestoTrasladado || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                : '0.00'}
              {invoice.gravadoModificado && <span className="text-blue-500 ml-1 text-xs">(Mod)</span>}
            </span>
          )
        )}
      </td>
      
      {/* Exento (only for egresos) */}
      {!isIngreso && (
        <td className="pr-7 px-2 py-1 align-middle text-right">
          {showCells && !isS01 && (
            <span>
              ${invoice.esDeducible && invoice.mesDeduccion
                ? Math.max(0, (invoice.total || 0) - (invoice.gravadoIVA || 0) - (invoice.gravadoISR || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })
                : '0.00'}
            </span>
          )}
        </td>
      )}
    </tr>
  );
});
