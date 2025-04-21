import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Plus } from "lucide-react";
import { CreateFixedAssetData } from "@/models/FixedAsset";
import { FixedAssetService } from "@/services/fixed-asset-service";
import { FISCAL_CATEGORIES, annualRateToMonths } from "./utils";

const fixedAssetService = new FixedAssetService();

export const AddFixedAssetDialog = ({ clientId, onAssetAdded }: { clientId: string, onAssetAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customRate, setCustomRate] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateFixedAssetData>>({
    clientId,
    name: '',
    type: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    cost: 0,
    depreciationMethod: 'straightLine',
    usefulLifeMonths: 60, // 5 años por defecto
    residualValue: 0,
    fiscalCategory: '',
    deductionRate: 10, // Tasa por defecto del 10%
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'fiscalCategory' && !customRate) {
      // Buscar la tasa de depreciación para la categoría seleccionada
      const category = FISCAL_CATEGORIES.find(cat => cat.id === value);
      if (category) {
        // Actualizar la tasa de depreciación y calcular la vida útil en meses
        const deductionRate = category.defaultRate;
        const usefulLifeMonths = annualRateToMonths(deductionRate);
        
        setFormData({
          ...formData,
          [name]: value,
          deductionRate: deductionRate,
          usefulLifeMonths: usefulLifeMonths
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDeductionRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rate = parseFloat(e.target.value);
    setCustomRate(true);
    setFormData({
      ...formData,
      deductionRate: rate,
      usefulLifeMonths: annualRateToMonths(rate)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validar datos obligatorios
      if (!formData.name || !formData.type || !formData.purchaseDate || !formData.cost || formData.cost <= 0) {
        toast({
          title: "Error",
          description: "Por favor, complete todos los campos obligatorios.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Crear el activo
      await fixedAssetService.createFixedAsset(formData as CreateFixedAssetData);
      toast({
        title: "Éxito",
        description: "Activo fijo creado correctamente.",
      });
      
      // Cerrar el diálogo y actualizar la lista
      setIsOpen(false);
      setFormData({
        clientId,
        name: '',
        type: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        cost: 0,
        depreciationMethod: 'straightLine',
        usefulLifeMonths: 60,
        residualValue: 0,
        fiscalCategory: '',
        deductionRate: 10,
      });
      setCustomRate(false);
      onAssetAdded();
    } catch (error) {
      console.error("Error al crear activo:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el activo. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Activo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir Activo Fijo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre *</Label>
              <Input
                id="name"
                name="name"
                className="col-span-3"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Tipo *</Label>
              <Select 
                name="type"
                value={formData.type}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger className="col-span-3">
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
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchaseDate" className="text-right">Fecha de Compra *</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                className="col-span-3"
                value={formData.purchaseDate}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">Valor Original *</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                className="col-span-3"
                value={formData.cost || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="depreciationMethod" className="text-right">Método Deprec. *</Label>
              <Select 
                name="depreciationMethod"
                value={formData.depreciationMethod}
                onValueChange={(value) => handleSelectChange('depreciationMethod', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Método de depreciación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straightLine">Línea Recta</SelectItem>
                  <SelectItem value="doubleDecline">Doble Declinación</SelectItem>
                  <SelectItem value="sumOfYears">Suma de Años Dígitos</SelectItem>
                  <SelectItem value="units">Unidades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="usefulLifeMonths" className="text-right">Vida útil (meses) *</Label>
              <Input
                id="usefulLifeMonths"
                name="usefulLifeMonths"
                type="number"
                min="1"
                className="col-span-3"
                value={formData.usefulLifeMonths || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="residualValue" className="text-right">Valor Residual *</Label>
              <Input
                id="residualValue"
                name="residualValue"
                type="number"
                min="0"
                step="0.01"
                className="col-span-3"
                value={formData.residualValue || ''}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fiscalCategory" className="text-right">Categoría Fiscal *</Label>
              <Select 
                name="fiscalCategory"
                value={formData.fiscalCategory}
                onValueChange={(value) => handleSelectChange('fiscalCategory', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Categoría fiscal" />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.defaultRate}%)
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deductionRate" className="text-right">% Deducción Anual</Label>
              <Input
                id="deductionRate"
                name="deductionRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="col-span-3"
                value={formData.deductionRate || ''}
                onChange={handleDeductionRateChange}
              />
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