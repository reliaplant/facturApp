"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Invoice } from "@/models/Invoice";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Check, X, Pencil } from "lucide-react";

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedInvoice: Invoice) => void;
  showDeductibilityEditor?: boolean;
  onDeductibilityEditorClose?: () => void;
}

export function InvoicePreviewModal({ 
  invoice, 
  isOpen, 
  onClose, 
  onUpdate,
  showDeductibilityEditor = false,
  onDeductibilityEditorClose
}: InvoicePreviewModalProps) {
  if (!invoice) return null;

  const [editingDeductibility, setEditingDeductibility] = useState(showDeductibilityEditor);
  const [deductibilityData, setDeductibilityData] = useState({
    isDeductible: false,
    deductibilityType: 'full',
    deductiblePercentage: 100,
    deductibleAmount: 0,
    deductibilityNotes: '',
    amountType: 'percentage',
    deductionMonth: 0, // Agregamos el mes de deducción
  });

  // Actualizar el estado local cuando cambia la factura seleccionada
  useEffect(() => {
    if (invoice) {
      const invoiceMonth = new Date(invoice.date).getMonth() + 1;
      setDeductibilityData({
        isDeductible: invoice.isDeductible || false,
        deductibilityType: invoice.deductibilityType || 'full',
        deductiblePercentage: invoice.deductiblePercentage || 100,
        deductibleAmount: invoice.deductibleAmount || 0,
        deductibilityNotes: invoice.deductibilityNotes || '',
        amountType: invoice.deductibleAmount && invoice.deductibleAmount > 0 ? 'fixed' : 'percentage',
        deductionMonth: invoice.deductionMonth || invoiceMonth,
      });
    }
  }, [invoice]);

  // También actualizar el estado de edición cuando cambia la prop showDeductibilityEditor
  useEffect(() => {
    setEditingDeductibility(showDeductibilityEditor);
  }, [showDeductibilityEditor]);

  const isIncome = invoice.cfdiType === "I";
  const date = invoice.date ? new Date(invoice.date).toLocaleDateString('es-MX') : 'N/A';
  
  // Calculate exact values for display
  const subtotal = invoice.subtotal || 0;
  const iva = invoice.tax || 0;
  const retencionISR = invoice.retainedIsr || 0;
  const retencionIVA = invoice.retainedVat || 0;
  const descuento = invoice.discount || 0;
  const totalAPagar = invoice.total || 0;
  
  // Calcula el monto deducible basado en el tipo y porcentaje/monto
  const calculateDeductibleAmount = () => {
    if (!deductibilityData.isDeductible) return 0;
    
    if (deductibilityData.amountType === 'fixed') {
      return deductibilityData.deductibleAmount;
    } else {
      // Tipo porcentaje
      if (deductibilityData.deductibilityType === 'full') {
        return totalAPagar;
      } else {
        return (totalAPagar * deductibilityData.deductiblePercentage) / 100;
      }
    }
  };
  
  // Función para obtener las abreviaturas de meses en español
  const getMonthAbbreviation = (month: number): string => {
    // Valor especial para deducción anual
    if (month === 13) return 'ANUAL';
    
    const monthAbbreviations = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return monthAbbreviations[month - 1] || '';
  };

  const handleSaveDeductibility = () => {
    if (onUpdate && invoice) {
      const updatedInvoice = {
        ...invoice,
        isDeductible: deductibilityData.isDeductible,
        deductibilityType: deductibilityData.amountType === 'fixed' 
          ? 'fixed' as 'full' | 'partial' | 'fixed' | 'none'
          : deductibilityData.deductibilityType as 'full' | 'partial' | 'fixed' | 'none',
        deductiblePercentage: deductibilityData.deductiblePercentage,
        deductibleAmount: deductibilityData.amountType === 'fixed' 
          ? deductibilityData.deductibleAmount 
          : calculateDeductibleAmount(),
        deductibilityNotes: deductibilityData.deductibilityNotes,
        deductionMonth: deductibilityData.deductionMonth
      };
      onUpdate(updatedInvoice);
    }
    setEditingDeductibility(false);
    if (onDeductibilityEditorClose) {
      onDeductibilityEditorClose();
    }
  };

  const handleCancelDeductibility = () => {
    setEditingDeductibility(false);
    if (onDeductibilityEditorClose) {
      onDeductibilityEditorClose();
    }
  };

  // Función para mostrar el valor deducible en la UI
  const getDeductibleDisplay = () => {
    if (!invoice.isDeductible) return null;
    
    if (invoice.deductibilityType === 'fixed' && invoice.deductibleAmount) {
      return `${formatCurrency(invoice.deductibleAmount)}`;
    } else if (invoice.deductibilityType === 'partial') {
      return `${invoice.deductiblePercentage}%`;
    } else {
      return 'Sí';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              {isIncome ? "Factura Recibida" : "Factura Emitida"} 
              {invoice.isCancelled && <span className="ml-2 text-red-500">(CANCELADA)</span>}
            </div>
            
            {!isIncome && ( // Only show for expenses
              <div className="flex items-center gap-2">
                {!editingDeductibility ? (
                  <>
                    <div className="flex items-center text-sm">
                      <span className="mr-2">Deducible:</span>
                      {invoice.isDeductible ? (
                        <span className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          {getDeductibleDisplay()}
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <X className="h-4 w-4 mr-1" />No
                        </span>
                      )}
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Opciones de deducibilidad</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditingDeductibility(true)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar deducibilidad
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelDeductibility}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveDeductibility}>
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Deductibility Editor */}
        {!isIncome && editingDeductibility && (
          <div className="bg-gray-50 p-4 mb-4 rounded-lg border">
            <h3 className="font-medium mb-3">Configuración de deducibilidad</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isDeductible" 
                  checked={deductibilityData.isDeductible}
                  onCheckedChange={(checked: boolean) => 
                    setDeductibilityData({...deductibilityData, isDeductible: checked})
                  }
                />
                <Label htmlFor="isDeductible">Factura deducible</Label>
              </div>
              
              {deductibilityData.isDeductible && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amountType" className="mb-1 block">Tipo de deducción</Label>
                      <select 
                        id="amountType"
                        className="w-full rounded-md border border-input px-3 py-2"
                        value={deductibilityData.amountType}
                        onChange={(e) => setDeductibilityData({
                          ...deductibilityData, 
                          amountType: e.target.value as 'percentage' | 'fixed'
                        })}
                      >
                        <option value="percentage">Porcentaje del total</option>
                        <option value="fixed">Monto fijo</option>
                      </select>
                    </div>

                    {deductibilityData.amountType === 'percentage' ? (
                      <div>
                        <Label htmlFor="deductibilityType" className="mb-1 block">Tipo de porcentaje</Label>
                        <select 
                          id="deductibilityType"
                          className="w-full rounded-md border border-input px-3 py-2"
                          value={deductibilityData.deductibilityType}
                          onChange={(e) => setDeductibilityData({
                            ...deductibilityData, 
                            deductibilityType: e.target.value as 'full' | 'partial' | 'none'
                          })}
                        >
                          <option value="full">100% deducible</option>
                          <option value="partial">Parcialmente deducible</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="deductibleAmount" className="mb-1 block">Monto deducible</Label>
                        <div className="flex items-center">
                          <Input
                            id="deductibleAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            max={totalAPagar}
                            value={deductibilityData.deductibleAmount}
                            onChange={(e) => setDeductibilityData({
                              ...deductibilityData,
                              deductibleAmount: Number(e.target.value)
                            })}
                            className="mr-2"
                          />
                          <span>MXN</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {deductibilityData.amountType === 'percentage' && deductibilityData.deductibilityType === 'partial' && (
                    <div>
                      <Label htmlFor="deductiblePercentage" className="mb-1 block">Porcentaje deducible</Label>
                      <div className="flex items-center">
                        <Input
                          id="deductiblePercentage"
                          type="number"
                          min="0"
                          max="100"
                          value={deductibilityData.deductiblePercentage}
                          onChange={(e) => setDeductibilityData({
                            ...deductibilityData,
                            deductiblePercentage: Number(e.target.value)
                          })}
                          className="mr-2"
                        />
                        <span>%</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="deductionMonth" className="mb-1 block">Mes de deducción</Label>
                    <select 
                      id="deductionMonth"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={deductibilityData.deductionMonth}
                      onChange={(e) => setDeductibilityData({
                        ...deductibilityData, 
                        deductionMonth: Number(e.target.value)
                      })}
                    >
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                      <option value="13">Anual</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      La deducción se aplica en el mes en que se realizó el pago, no necesariamente en el mes de emisión.
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-gray-100 rounded-md">
                    <div className="text-sm font-medium mb-2">Resumen de deducibilidad</div>
                    <div className="flex justify-between items-center">
                      <span>Total de la factura:</span>
                      <span>{formatCurrency(totalAPagar)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1 font-medium">
                      <span>Monto deducible:</span>
                      <span className="text-green-600">{formatCurrency(calculateDeductibleAmount())}</span>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="deductibilityNotes" className="mb-1 block">Notas</Label>
                    <Input
                      id="deductibilityNotes"
                      value={deductibilityData.deductibilityNotes || ''}
                      onChange={(e) => setDeductibilityData({
                        ...deductibilityData,
                        deductibilityNotes: e.target.value
                      })}
                      placeholder="Notas sobre la deducibilidad"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="border rounded-lg p-6 bg-white text-black print:shadow-none">
          {/* Encabezado de la factura */}
          <div className="flex justify-between border-b pb-4 mb-4">
            <div>
              <div className="text-xl font-bold mb-1">
                {isIncome ? invoice.receiverName : invoice.issuerName}
              </div>
              <div className="text-gray-600">
                RFC: {isIncome ? invoice.receiverRfc : invoice.issuerRfc}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm mb-1">Factura: {invoice.uuid.substring(0, 8).toUpperCase()}</div>
              <div className="text-sm">Fecha: {date}</div>
              <div className="text-sm">Tipo: {invoice.cfdiType === "I" ? "Ingreso" : "Egreso"}</div>
            </div>
          </div>

          {/* Datos del emisor/receptor */}
          <div className="grid grid-cols-2 gap-4 mb-6 border-b pb-4">
            <div>
              <div className="text-sm font-medium mb-2">Emisor:</div>
              <div className="text-sm">{invoice.issuerName}</div>
              <div className="text-sm text-gray-600">RFC: {invoice.issuerRfc}</div>
              <div className="text-sm text-gray-600">
                Régimen Fiscal: {invoice.fiscalRegime || "No especificado"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Receptor:</div>
              <div className="text-sm">{invoice.receiverName}</div>
              <div className="text-sm text-gray-600">RFC: {invoice.receiverRfc}</div>
              <div className="text-sm text-gray-600">
                Uso CFDI: {invoice.cfdiUsage || "No especificado"}
              </div>
            </div>
          </div>

          {/* Conceptos de la factura */}
          <div className="mb-6">
            <div className="text-sm font-medium mb-2">Conceptos:</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-center py-2">Cantidad</th>
                  <th className="text-right py-2">Valor Unit.</th>
                  <th className="text-right py-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {invoice.concepts?.map(concept => (
                  <tr key={concept.id} className="border-b">
                    <td className="py-2">{concept.description}</td>
                    <td className="text-center py-2">{concept.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(concept.unitValue || 0)}</td>
                    <td className="text-right py-2">{formatCurrency(concept.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end">
            <div className="w-72 border rounded-md overflow-hidden">
              {/* Encabezado de Totales */}
              <div className="bg-gray-100 py-2 px-4 font-medium text-sm border-b">
                RESUMEN
              </div>
              
              {/* Lista de conceptos monetarios */}
              <div className="p-4 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Subtotal:</div>
                  <div className="text-sm">{formatCurrency(subtotal)}</div>
                </div>
                
                {/* IVA Trasladado */}
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">+ IVA (16%):</div>
                  <div className="text-sm text-blue-600">{formatCurrency(iva)}</div>
                </div>
                
                {/* Retenciones */}
                {retencionISR > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">- Retención ISR:</div>
                    <div className="text-sm text-red-600">-{formatCurrency(retencionISR)}</div>
                  </div>
                )}
                
                {retencionIVA > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">- Retención IVA:</div>
                    <div className="text-sm text-red-600">-{formatCurrency(retencionIVA)}</div>
                  </div>
                )}
                
                {/* Descuento */}
                {descuento > 0 && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">- Descuento:</div>
                    <div className="text-sm text-red-600">-{formatCurrency(descuento)}</div>
                  </div>
                )}
                
                {/* Separador */}
                <hr className="my-2" />
                
                {/* Total a Pagar */}
                <div className="flex justify-between items-center bg-gray-50 p-2 -mx-2 rounded">
                  <div className="text-base font-bold">Total a Pagar:</div>
                  <div className="text-base font-bold">{formatCurrency(totalAPagar)}</div>
                </div>
                
                {/* Deductibility info */}
                {!isIncome && invoice.isDeductible && (
                  <>
                    <hr className="my-2" />
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">Monto deducible:</div>
                      <div className="text-sm text-green-600">
                        {invoice.deductibilityType === 'fixed' && invoice.deductibleAmount
                          ? formatCurrency(invoice.deductibleAmount)
                          : invoice.deductibilityType === 'partial'
                            ? `${formatCurrency((totalAPagar * invoice.deductiblePercentage!) / 100)} (${invoice.deductiblePercentage}%)`
                            : formatCurrency(totalAPagar)
                        }
                      </div>
                    </div>
                  </>
                )}
                
                {/* Deductibility notes */}
                {!isIncome && invoice.isDeductible && invoice.deductibilityNotes && (
                  <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded">
                    <strong>Nota:</strong> {invoice.deductibilityNotes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información de pago */}
          <div className="mt-6 pt-4 border-t text-sm">
            <div className="mb-1"><strong>Forma de Pago:</strong> {invoice.paymentForm === '01' ? 'Efectivo' : 
                            invoice.paymentForm === '03' ? 'Transferencia electrónica' : 
                            invoice.paymentForm === '04' ? 'Tarjeta de crédito' : 
                            invoice.paymentForm === '28' ? 'Tarjeta de débito' : 
                            invoice.paymentForm || 'No especificado'}</div>
            <div className="mb-1"><strong>Método de Pago:</strong> {invoice.paymentMethod === 'PUE' ? 'Pago en una sola exhibición' : 
                                invoice.paymentMethod === 'PPD' ? 'Pago en parcialidades o diferido' : 
                                invoice.paymentMethod || 'No especificado'}</div>
          </div>

          {/* Sello digital */}
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-gray-500 break-all">
              <strong>UUID:</strong> {invoice.uuid}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={() => window.print()}>
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
