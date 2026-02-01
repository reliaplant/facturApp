"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { CanceledInvoiceInfo } from "@/hooks/useCFDITable";

interface VerificationProgressModalProps {
  isOpen: boolean;
  isComplete: boolean;
  progress: number;
  total: number;
  canceledInvoices: CanceledInvoiceInfo[];
  onClose: () => void;
}

export function VerificationProgressModal({
  isOpen,
  isComplete,
  progress,
  total,
  canceledInvoices,
  onClose
}: VerificationProgressModalProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;
  const hasCanceled = canceledInvoices.length > 0;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      minimumFractionDigits: 2 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-gray-50">
          <DialogTitle className="text-sm font-medium flex items-center gap-2">
            {!isComplete ? (
              <>
                <div className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                Verificando CFDIs...
              </>
            ) : hasCanceled ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Verificación completada - Se encontraron facturas canceladas
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Verificación completada
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4">
          {/* Progress section */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{progress} de {total} facturas ({percentage}%)</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Results section - only show when complete */}
          {isComplete && (
            <div className="border-t pt-4">
              {hasCanceled ? (
                <>
                  <div className="flex items-center gap-2 text-amber-600 mb-3">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Se encontraron {canceledInvoices.length} factura{canceledInvoices.length > 1 ? 's' : ''} cancelada{canceledInvoices.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="max-h-[250px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">UUID</th>
                          <th className="text-left p-2 font-medium">Emisor</th>
                          <th className="text-right p-2 font-medium">Total</th>
                          <th className="text-left p-2 font-medium">Fecha Cancel.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canceledInvoices.map((inv) => (
                          <tr key={inv.uuid} className="border-t hover:bg-red-50">
                            <td className="p-2 font-mono text-purple-600 text-[10px]">
                              {inv.uuid.substring(0, 8)}...
                            </td>
                            <td className="p-2">
                              <div className="truncate max-w-[150px]" title={inv.emisor}>
                                {inv.emisor}
                              </div>
                              <div className="text-[10px] text-gray-400">{inv.rfcEmisor}</div>
                            </td>
                            <td className="p-2 text-right">{formatCurrency(inv.total)}</td>
                            <td className="p-2 text-red-600">
                              {inv.fechaCancelacion ? formatDate(inv.fechaCancelacion) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-600 py-4">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">No se encontraron facturas canceladas</span>
                </div>
              )}
            </div>
          )}

          {/* Close button - only show when complete */}
          {isComplete && (
            <div className="mt-4 flex justify-end">
              <Button size="xs" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
