import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CreateFixedAssetData, FixedAsset } from "@/models/FixedAsset";
import { FixedAssetService } from "@/services/fixed-asset-service";

const fixedAssetService = new FixedAssetService();

interface FixedAssetDialogProps {
  clientId: string;
  asset?: FixedAsset;
  onSuccess: () => void;
  onDelete?: (asset: FixedAsset) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const FixedAssetDialog = ({ clientId, asset, onSuccess, onDelete, open: controlledOpen, onOpenChange }: FixedAssetDialogProps) => {
  const isEditMode = !!asset;
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use controlled or uncontrolled state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Initial form data
  const getInitialFormData = () => {
    if (isEditMode && asset) {
      return {
        clientId: asset.clientId,
        name: asset.name,
        type: asset.type,
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : new Date().toISOString().split('T')[0],
        cost: asset.cost,
        usefulLifeMonths: asset.usefulLifeMonths,
        deductibleValue: asset.deductibleValue || asset.cost,
        invoiceNumber: asset.invoiceNumber || '',
        notes: asset.notes || '',
        depreciationStartDate: asset.depreciationStartDate ? asset.depreciationStartDate.split("T")[0] : ''
      };
    }
    
    return {
      clientId,
      name: '',
      type: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      cost: 0,
      usefulLifeMonths: 60,
      deductibleValue: 0,
      invoiceNumber: '',
      notes: '',
      depreciationStartDate: ''
    };
  };
  
  const [formData, setFormData] = useState<Partial<CreateFixedAssetData>>(getInitialFormData());
  
  // Reset form when asset changes
  useEffect(() => {
    setFormData(getInitialFormData());
    setValidationErrors({});
  }, [asset, clientId, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Limpiar error de validación al cambiar el campo
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
    
    // Validar valor deducible
    if (name === 'deductibleValue') {
      const numValue = parseFloat(value);
      const cost = formData.cost || 0;
      
      if (numValue > cost) {
        setValidationErrors(prev => ({
          ...prev,
          deductibleValue: 'No puede ser mayor que el valor de compra'
        }));
        return;
      }
    }
    
    // Actualizar costo puede requerir actualizar valor deducible
    if (name === 'cost') {
      const newCost = parseFloat(value) || 0;
      if (formData.deductibleValue && formData.deductibleValue > newCost) {
        setFormData(prev => ({ 
          ...prev, 
          cost: newCost, // Always set as number to match the expected type
          deductibleValue: newCost 
        }));
        return;
      }
    }
    
    // Handle numeric fields properly
    if (name === 'cost' || name === 'deductibleValue' || name === 'usefulLifeMonths') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0 // Ensure it's always a number, default to 0 if invalid
      }));
    } else {
      // For non-numeric fields, use the string value directly
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setValidationErrors(prev => ({ ...prev, [name]: '' }));
    
    if (name === 'depreciationYears') {
      setFormData(prev => ({
        ...prev,
        usefulLifeMonths: parseInt(value) * 12
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'El nombre es requerido';
    if (!formData.type) errors.type = 'El tipo es requerido';
    if (!formData.purchaseDate) errors.purchaseDate = 'La fecha de compra es requerida';
    if (!formData.cost || formData.cost <= 0) errors.cost = 'El valor debe ser mayor a 0';
    if (formData.deductibleValue && formData.deductibleValue > (formData.cost || 0)) {
      errors.deductibleValue = 'No puede ser mayor que el valor de compra';
    }
    
    // Validar que la fecha de inicio de depreciación no sea anterior a la fecha de compra
    if (formData.depreciationStartDate && formData.purchaseDate && 
        new Date(formData.depreciationStartDate) < new Date(formData.purchaseDate)) {
      errors.depreciationStartDate = 'No puede ser anterior a la fecha de compra';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setIsLoading(true);

    try {
      const assetData = {
        ...formData,
        cost: Number(formData.cost),
        usefulLifeMonths: Number(formData.usefulLifeMonths),
        residualValue: 0,
        depreciationMethod: 'straightLine',
        deductibleValue: Number(formData.deductibleValue || formData.cost),
        // Si depreciationStartDate está vacío, no lo incluimos
        ...(formData.depreciationStartDate ? { depreciationStartDate: formData.depreciationStartDate } : {})
      } as CreateFixedAssetData;

      if (isEditMode && asset) {
        await fixedAssetService.updateFixedAsset(clientId, asset.id, assetData);
      } else {
        await fixedAssetService.createFixedAsset({
          ...assetData,
          clientId,
        });
      }
      
      setIsOpen(false);
      setFormData(getInitialFormData());
      onSuccess();
    } catch (error) {
      console.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} activo:`, error);
      setValidationErrors({
        form: `Error: No se pudo ${isEditMode ? 'actualizar' : 'crear'} el activo. ${error instanceof Error ? error.message : ''}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate current depreciation years for display
  const currentDepreciationYears = Math.round((formData.usefulLifeMonths || 60) / 12);
  
  // If controlled externally (from row click), don't show trigger button
  const showTrigger = controlledOpen === undefined;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="xs" className="text-xs bg-black hover:bg-gray-800 text-white" onClick={() => setIsOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[420px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base font-semibold">{isEditMode ? 'Editar' : 'Agregar'} Activo Fijo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
            {validationErrors.form && (
              <div className="text-red-500 text-xs">
                {validationErrors.form}
              </div>
            )}

            {/* Row 1: Nombre + Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs text-gray-500">Nombre *</Label>
                <Input
                  id="name"
                  name="name"
                  className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
                  value={formData.name}
                  onChange={handleInputChange}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs">{validationErrors.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="type" className="text-xs text-gray-500">Tipo *</Label>
                <Select 
                  name="type"
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger className={`h-9 text-sm ${validationErrors.type ? "border-red-500" : ""}`}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobiliario">Mobiliario</SelectItem>
                    <SelectItem value="computacion">Cómputo</SelectItem>
                    <SelectItem value="vehiculos">Vehículos</SelectItem>
                    <SelectItem value="maquinaria">Maquinaria</SelectItem>
                    <SelectItem value="edificios">Edificios</SelectItem>
                    <SelectItem value="terrenos">Terrenos</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.type && (
                  <p className="text-red-500 text-xs">{validationErrors.type}</p>
                )}
              </div>
            </div>

            {/* Row 2: Fecha Compra + Inicio Depreciación */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="purchaseDate" className="text-xs text-gray-500">Fecha Compra *</Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  className={`h-9 text-sm ${validationErrors.purchaseDate ? "border-red-500" : ""}`}
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                />
                {validationErrors.purchaseDate && (
                  <p className="text-red-500 text-xs">{validationErrors.purchaseDate}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="depreciationStartDate" className="text-xs text-gray-500">Inicio Depreciación</Label>
                <Input
                  id="depreciationStartDate"
                  name="depreciationStartDate"
                  type="date"
                  className={`h-9 text-sm ${validationErrors.depreciationStartDate ? "border-red-500" : ""}`}
                  value={formData.depreciationStartDate || ''}
                  onChange={handleInputChange}
                />
                {validationErrors.depreciationStartDate && (
                  <p className="text-red-500 text-xs">{validationErrors.depreciationStartDate}</p>
                )}
              </div>
            </div>

            {/* Row 3: Valor + Valor Deducible */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cost" className="text-xs text-gray-500">Valor Compra *</Label>
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className={`h-9 text-sm ${validationErrors.cost ? "border-red-500" : ""}`}
                  value={formData.cost || ''}
                  onChange={handleInputChange}
                />
                {validationErrors.cost && (
                  <p className="text-red-500 text-xs">{validationErrors.cost}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="deductibleValue" className="text-xs text-gray-500">Valor Deducible</Label>
                <Input
                  id="deductibleValue"
                  name="deductibleValue"
                  type="number"
                  min="0"
                  max={formData.cost?.toString()}
                  step="0.01"
                  className={`h-9 text-sm ${validationErrors.deductibleValue ? "border-red-500" : ""}`}
                  value={formData.deductibleValue || ''}
                  onChange={handleInputChange}
                />
                {validationErrors.deductibleValue && (
                  <p className="text-red-500 text-xs">{validationErrors.deductibleValue}</p>
                )}
              </div>
            </div>

            {/* Row 4: Años Depreciación + Nº Factura */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="depreciationYears" className="text-xs text-gray-500">Años Depreciación</Label>
                <Select 
                  name="depreciationYears"
                  value={currentDepreciationYears.toString()}
                  onValueChange={(value) => handleSelectChange('depreciationYears', value)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Años" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 año</SelectItem>
                    <SelectItem value="2">2 años</SelectItem>
                    <SelectItem value="3">3 años</SelectItem>
                    <SelectItem value="4">4 años</SelectItem>
                    <SelectItem value="5">5 años</SelectItem>
                    <SelectItem value="10">10 años</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="invoiceNumber" className="text-xs text-gray-500">Nº Factura</Label>
                <Input
                  id="invoiceNumber"
                  name="invoiceNumber"
                  className="h-9 text-sm"
                  value={formData.invoiceNumber || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Row 5: Notas */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs text-gray-500">Notas</Label>
              <Input
                id="notes"
                name="notes"
                className="h-9 text-sm"
                value={formData.notes || ''}
                onChange={handleInputChange}
              />
            </div>

          <DialogFooter className="pt-4">
            <div className="flex w-full justify-between">
              {/* Delete button - only show when editing */}
              {isEditMode && asset && onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDelete(asset);
                    setIsOpen(false);
                  }}
                  disabled={isLoading}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isLoading} className="bg-black hover:bg-gray-800">
                  {isLoading ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
