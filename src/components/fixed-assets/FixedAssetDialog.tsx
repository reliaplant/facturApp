import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil } from "lucide-react";
import { CreateFixedAssetData, FixedAsset } from "@/models/FixedAsset";
import { FixedAssetService } from "@/services/fixed-asset-service";

const fixedAssetService = new FixedAssetService();

interface FixedAssetDialogProps {
  clientId: string;
  asset?: FixedAsset;
  onSuccess: () => void;
}

export const FixedAssetDialog = ({ clientId, asset, onSuccess }: FixedAssetDialogProps) => {
  const isEditMode = !!asset;
  const [isOpen, setIsOpen] = useState(false);
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
      const newCost = parseFloat(value);
      if (formData.deductibleValue && formData.deductibleValue > newCost) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: type === 'number' ? parseFloat(value) : value,
          deductibleValue: newCost 
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogTrigger asChild>
      {isEditMode ? (
        <Button variant="outline" size="xs" onClick={() => setIsOpen(true)}>
        <Pencil className="h-3 w-4 mr-1" />
        Editar
        </Button>
      ) : (
        <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="h-3 w-4 mr-1" />
        Nuevo Activo
        </Button>
      )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Editar' : 'Añadir'} Activo Fijo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {validationErrors.form && (
              <div className="col-span-4 text-red-500 text-sm">
                {validationErrors.form}
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre *</Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  name="name"
                  className={validationErrors.name ? "border-red-500" : ""}
                  value={formData.name}
                  onChange={handleInputChange}
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs">{validationErrors.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Tipo *</Label>
              <div className="col-span-3 space-y-1">
                <Select 
                  name="type"
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger className={validationErrors.type ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione tipo de activo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobiliario">Mobiliario y Equipo de Oficina</SelectItem>
                    <SelectItem value="computacion">Equipo de Cómputo</SelectItem>
                    <SelectItem value="vehiculos">Vehículos</SelectItem>
                    <SelectItem value="maquinaria">Maquinaria y Equipo</SelectItem>
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchaseDate" className="text-right">Fecha de Compra *</Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  className={validationErrors.purchaseDate ? "border-red-500" : ""}
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                />
                {validationErrors.purchaseDate && (
                  <p className="text-red-500 text-xs">{validationErrors.purchaseDate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depreciationStartDate" className="text-right">Inicio de Depreciación</Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="depreciationStartDate"
                  name="depreciationStartDate"
                  type="date"
                  className={validationErrors.depreciationStartDate ? "border-red-500" : ""}
                  value={formData.depreciationStartDate || ''}
                  onChange={handleInputChange}
                  placeholder="Desde fecha de compra"
                />
                {validationErrors.depreciationStartDate && (
                  <p className="text-red-500 text-xs">{validationErrors.depreciationStartDate}</p>
                )}
                {!formData.depreciationStartDate && (
                  <p className="text-xs text-gray-500">Si se deja en blanco, la depreciación inicia desde la fecha de compra</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">Valor *</Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="cost"
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className={validationErrors.cost ? "border-red-500" : ""}
                  value={formData.cost || ''}
                  onChange={handleInputChange}
                />
                {validationErrors.cost && (
                  <p className="text-red-500 text-xs">{validationErrors.cost}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductibleValue" className="text-right">Valor Deducible</Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="deductibleValue"
                  name="deductibleValue"
                  type="number"
                  min="0"
                  max={formData.cost?.toString()}
                  step="0.01"
                  className={validationErrors.deductibleValue ? "border-red-500" : ""}
                  value={formData.deductibleValue || ''}
                  onChange={handleInputChange}
                />
                {validationErrors.deductibleValue && (
                  <p className="text-red-500 text-xs">{validationErrors.deductibleValue}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depreciationYears" className="text-right">Años de Depreciación *</Label>
              <Select 
                name="depreciationYears"
                value={currentDepreciationYears.toString()}
                onValueChange={(value) => handleSelectChange('depreciationYears', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Años de depreciación" />
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

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invoiceNumber" className="text-right">Nº Factura</Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                className="col-span-3"
                value={formData.invoiceNumber || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notas</Label>
              <Input
                id="notes"
                name="notes"
                className="col-span-3"
                value={formData.notes || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
