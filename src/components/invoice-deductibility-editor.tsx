"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
// Remove Textarea import as we'll use a regular HTML textarea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Invoice } from "@/models/Invoice";

interface InvoiceDeductibilityEditorProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInvoice: Invoice) => void;
}

export function InvoiceDeductibilityEditor({
  invoice,
  isOpen,
  onClose,
  onSave
}: InvoiceDeductibilityEditorProps) {
  // Default values
  const [formData, setFormData] = useState({
    esDeducible: false,
    mesDeduccion: "none",
    gravadoISR: 0,
    gravadoIVA: 0,
    gravadoModificado: false,
    notasDeducibilidad: ""
  });

  // Calculate proper gravado values
  const calculateGravados = (inv: Invoice) => {
    // Get IVA value from trasladado field
    const ivaValue = inv.impuestoTrasladado || 0;
    
    // Calculate ISR base (IVA ÷ 0.16)
    const gravadoISR = Math.round(ivaValue / 0.16 * 100) / 100;
    
    // Calculate IVA base (ISR base × 0.16)
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    
    return { gravadoISR, gravadoIVA };
  };

  // Initialize form when invoice changes
  useEffect(() => {
    if (invoice) {
      // Calculate proper gravado values
      const { gravadoISR, gravadoIVA } = calculateGravados(invoice);
      
      setFormData({
        esDeducible: invoice.esDeducible || false,
        mesDeduccion: invoice.mesDeduccion?.toString() || "none",
        gravadoISR: invoice.gravadoISR || gravadoISR,
        gravadoIVA: invoice.gravadoIVA || gravadoIVA,
        gravadoModificado: invoice.gravadoModificado || false,
        notasDeducibilidad: invoice.notasDeducibilidad || ""
      });
    }
  }, [invoice]);

  const handleSave = () => {
    if (!invoice) return;
    
    const updatedInvoice: Invoice = {
      ...invoice,
      esDeducible: formData.esDeducible,
      mesDeduccion: formData.mesDeduccion === "none" ? undefined : parseInt(formData.mesDeduccion),
      gravadoISR: formData.esDeducible ? formData.gravadoISR : 0,
      gravadoIVA: formData.esDeducible ? formData.gravadoIVA : 0,
      gravadoModificado: formData.gravadoModificado,
      notasDeducibilidad: formData.notasDeducibilidad
    };
    
    onSave(updatedInvoice);
    onClose(); // Add this line to close the dialog after saving
  };

  // Handle reset to recalculate values based on invoice data
  const handleReset = () => {
    if (!invoice) return;
    
    const { gravadoISR, gravadoIVA } = calculateGravados(invoice);
    
    setFormData({
      ...formData,
      gravadoISR,
      gravadoIVA,
      gravadoModificado: false // Reset the flag when values are reset
    });
  };

  // Function to get month abbreviations in Spanish
  const getMonthAbbreviation = (month: number): string => {
    const monthAbbreviations = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return monthAbbreviations[month - 1] || '';
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configuración de Deducibilidad</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Deductible Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isDeductible" 
              checked={formData.esDeducible}
              onCheckedChange={(checked) => 
                setFormData({...formData, esDeducible: checked as boolean})
              }
            />
            <Label htmlFor="isDeductible">Factura deducible</Label>
          </div>

          {/* Month Selection */}
          {formData.esDeducible && (
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="month-selection">Mes de Pago</Label>
              <Select
                value={formData.mesDeduccion}
                onValueChange={(value) => setFormData({...formData, mesDeduccion: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthNum = i+1;
                    const needsWarning = invoice.metodoPago === 'PPD' && 
                      !((invoice.pagadoConComplementos || []).length > 0);
                    
                    return (
                      <SelectItem key={monthNum} value={monthNum.toString()}>
                        {getMonthAbbreviation(monthNum)}{needsWarning ? " (Sin CP)" : ""}
                      </SelectItem>
                    );
                  })}
                  <SelectItem value="13">ANUAL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Gravados Inputs */}
          {formData.esDeducible && formData.mesDeduccion !== "none" && (
            <>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="gravadoISR">Gravado ISR</Label>
                  <span 
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                    onClick={handleReset}
                  >
                    Restablecer valores
                  </span>
                </div>
                <Input
                  id="gravadoISR"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.gravadoISR}
                  onChange={(e) => {
                    const newISR = parseFloat(e.target.value) || 0;
                    const newIVA = Math.round(newISR * 0.16 * 100) / 100;
                    
                    // Check if value actually changed from calculated value
                    const { gravadoISR: calculatedISR } = calculateGravados(invoice!);
                    const isModified = Math.abs(newISR - calculatedISR) > 0.01; // Allow small rounding differences
                    
                    setFormData({
                      ...formData,
                      gravadoISR: newISR,
                      gravadoIVA: newIVA,
                      gravadoModificado: isModified
                    });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calculado como IVA trasladado ÷ 0.16
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="gravadoIVA">Gravado IVA</Label>
                <Input
                  id="gravadoIVA"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.gravadoIVA}
                  onChange={(e) => {
                    const newIVA = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      gravadoIVA: newIVA
                    });
                  }}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calculado automáticamente como Gravado ISR × 0.16
                </p>
              </div>
            </>
          )}

          {/* Deductibility Notes Field - using regular textarea */}
          {formData.esDeducible && (
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="notasDeducibilidad">Notas sobre deducibilidad</Label>
              <textarea
                id="notasDeducibilidad"
                placeholder="Agrega notas o comentarios sobre la deducibilidad de esta factura..."
                value={formData.notasDeducibilidad}
                onChange={(e) => setFormData({...formData, notasDeducibilidad: e.target.value})}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background 
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-y"
              />
            </div>
          )}

        
        </div>

        <DialogFooter className="flex gap-2 items-center">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
