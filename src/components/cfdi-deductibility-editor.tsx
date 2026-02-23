"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
// Remove Textarea import as we'll use a regular HTML textarea
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CFDI } from "@/models/CFDI";

interface CFDIDeductibilityEditorProps {
  cfdi: CFDI | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedCFDI: CFDI) => void;
}

export function CFDIDeductibilityEditor({
  cfdi,
  isOpen,
  onClose,
  onSave
}: CFDIDeductibilityEditorProps) {
  // Default values
  const [formData, setFormData] = useState({
    esDeducible: false,
    mesDeduccion: "none",
    gravadoISR: 0,
    gravadoIVA: 0,
    gravadoModificado: false,
    notasDeducibilidad: ""
  });
  
  // Track if user is inputting values in MXN or original currency
  const [inputInMXN, setInputInMXN] = useState(true);

  // Calculate proper gravado values
  const calculateGravados = (inv: CFDI) => {
    // Get IVA value from trasladado field
    const ivaValue = inv.impuestoTrasladado || 0;
    
    // Calculate ISR base (IVA ÷ 0.16)
    const gravadoISR = Math.round(ivaValue / 0.16 * 100) / 100;
    
    // Calculate IVA base (ISR base × 0.16)
    const gravadoIVA = Math.round(gravadoISR * 0.16 * 100) / 100;
    
    return { gravadoISR, gravadoIVA };
  };

  // Initialize form when cfdi changes
  useEffect(() => {
    if (cfdi) {
      // Calculate proper gravado values
      const { gravadoISR, gravadoIVA } = calculateGravados(cfdi);
      
      // Apply exchange rate if foreign currency
      const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
      const existingISR = cfdi.gravadoISR || gravadoISR;
      const existingIVA = cfdi.gravadoIVA || gravadoIVA;
      
      setFormData({
        esDeducible: cfdi.esDeducible || false,
        mesDeduccion: cfdi.mesDeduccion?.toString() || "none",
        // If foreign currency and modified, values are already in MXN in DB
        // Show them in MXN by default
        gravadoISR: cfdi.gravadoModificado ? existingISR : existingISR * tipoCambio,
        gravadoIVA: cfdi.gravadoModificado ? existingIVA : existingIVA * tipoCambio,
        gravadoModificado: cfdi.gravadoModificado || false,
        notasDeducibilidad: cfdi.notasDeducibilidad || ""
      });
      
      // Reset input mode to MXN when opening
      setInputInMXN(true);
    }
  }, [cfdi]);

  const handleSave = () => {
    if (!cfdi) return;
    
    // Calculate what the values should be automatically
    const { gravadoISR: calculatedISR, gravadoIVA: calculatedIVA } = calculateGravados(cfdi);
    
    // Get exchange rate
    const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
    const isForeignCurrency = cfdi.moneda && cfdi.moneda !== 'MXN';
    
    // Convert form values to MXN if user input is in original currency
    let finalISR = formData.gravadoISR;
    let finalIVA = formData.gravadoIVA;
    
    if (isForeignCurrency && !inputInMXN) {
      // User entered in original currency, convert to MXN
      finalISR = formData.gravadoISR * tipoCambio;
      finalIVA = formData.gravadoIVA * tipoCambio;
    }
    
    // Check if values were modified from the calculated values (in MXN)
    const calculatedISRinMXN = calculatedISR * tipoCambio;
    const calculatedIVAinMXN = calculatedIVA * tipoCambio;
    
    const isModified = 
      Math.abs((finalISR || 0) - (calculatedISRinMXN || 0)) > 0.01 ||
      Math.abs((finalIVA || 0) - (calculatedIVAinMXN || 0)) > 0.01;
    
    console.log("Saving cfdi with modified gravado values:", {
      calculatedISR,
      calculatedIVA,
      formISR: formData.gravadoISR,
      formIVA: formData.gravadoIVA,
      finalISR,
      finalIVA,
      inputInMXN,
      tipoCambio,
      isModified
    });
    
    const updatedCFDI: CFDI = {
      ...cfdi,
      esDeducible: formData.esDeducible,
      mesDeduccion: formData.mesDeduccion === "none" ? undefined : parseInt(formData.mesDeduccion),
      // Always save in MXN
      gravadoISR: formData.esDeducible ? finalISR : 0,
      gravadoIVA: formData.esDeducible ? finalIVA : 0,
      // IMPORTANT: This flag must be set explicitly to true when values differ
      gravadoModificado: isModified,
      notasDeducibilidad: formData.notasDeducibilidad
    };
    
    console.log("Saving to Firebase with values:", {
      gravadoISR: updatedCFDI.gravadoISR,
      gravadoIVA: updatedCFDI.gravadoIVA,
      gravadoModificado: updatedCFDI.gravadoModificado
    });
    
    onSave(updatedCFDI);
    onClose();
  };

  // Handle reset to recalculate values based on cfdi data
  const handleReset = () => {
    if (!cfdi) return;
    
    const { gravadoISR, gravadoIVA } = calculateGravados(cfdi);
    
    // Apply exchange rate if foreign currency and showing in MXN
    const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
    
    setFormData({
      ...formData,
      gravadoISR: inputInMXN ? gravadoISR * tipoCambio : gravadoISR,
      gravadoIVA: inputInMXN ? gravadoIVA * tipoCambio : gravadoIVA,
      gravadoModificado: false // Reset the flag when values are reset
    });
  };
  
  // Handle currency toggle for input
  const handleCurrencyToggle = () => {
    if (!cfdi) return;
    
    const tipoCambio = (cfdi.moneda && cfdi.moneda !== 'MXN') ? (cfdi.tipoCambio || 1) : 1;
    const newInputInMXN = !inputInMXN;
    
    // Convert current values
    setFormData({
      ...formData,
      gravadoISR: newInputInMXN 
        ? formData.gravadoISR * tipoCambio  // Convert to MXN
        : formData.gravadoISR / tipoCambio, // Convert to original currency
      gravadoIVA: newInputInMXN 
        ? formData.gravadoIVA * tipoCambio 
        : formData.gravadoIVA / tipoCambio
    });
    
    setInputInMXN(newInputInMXN);
  };

  // Function to get month abbreviations in Spanish
  const getMonthAbbreviation = (month: number): string => {
    const monthAbbreviations = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return monthAbbreviations[month - 1] || '';
  };

  if (!cfdi) return null;

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
                    const needsWarning = cfdi.metodoPago === 'PPD' && 
                      !((cfdi.pagadoConComplementos || []).length > 0);
                    
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
              {/* Currency toggle for foreign currency invoices */}
              {cfdi.moneda && cfdi.moneda !== 'MXN' && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Factura en {cfdi.moneda}
                    </span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      Tipo de cambio: {cfdi.tipoCambio?.toFixed(4)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCurrencyToggle}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      inputInMXN 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}
                  >
                    Ingresando en: {inputInMXN ? 'MXN' : cfdi.moneda}
                  </button>
                </div>
              )}
            
              <div className="grid grid-cols-1 gap-2">
                {/* Add back the Reset Values button */}
                <div className="flex justify-between items-center">
                  <Label htmlFor="gravadoISR">
                    Gravado ISR {cfdi.moneda && cfdi.moneda !== 'MXN' && (
                      <span className="text-xs text-gray-500">
                        ({inputInMXN ? 'MXN' : cfdi.moneda})
                      </span>
                    )}
                  </Label>
                  <span 
                    className="text-xs text-blue-600 hover:underline cursor-pointer"
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
                    // No longer automatically update IVA when ISR changes
                    setFormData({
                      ...formData,
                      gravadoISR: newISR,
                      // IVA is now independent and manually edited
                      gravadoModificado: true
                    });
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normalmente calculado como IVA trasladado ÷ 0.16
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="gravadoIVA">
                  Gravado IVA {cfdi.moneda && cfdi.moneda !== 'MXN' && (
                    <span className="text-xs text-gray-500">
                      ({inputInMXN ? 'MXN' : cfdi.moneda})
                    </span>
                  )}
                </Label>
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
                      gravadoIVA: newIVA,
                      gravadoModificado: true
                    });
                  }}
                  // Removed the disabled attribute to allow manual editing
                />
                <p className="text-xs text-gray-500 mt-1">
                  Normalmente calculado como Gravado ISR × 0.16
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
