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

const fixedAssetService = new FixedAssetService();

export const AddFixedAssetDialog = ({ clientId, onAssetAdded }: { clientId: string, onAssetAdded: () => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateFixedAssetData>>({
    clientId,
    name: '',
    type: '',
    purchaseDate: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
    cost: 0,
    depreciationMethod: 'straightLine', // Siempre línea recta
    usefulLifeMonths: 60, // 5 años por defecto (en meses)
    residualValue: 0, // Siempre 0
    invoiceNumber: '',
    notes: '',
    // Asegurar que tenemos todos los campos necesarios que podrían requerirse en el backend

  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'depreciationYears') {
      // Convertir años a meses para el campo usefulLifeMonths
      const months = parseInt(value) * 12;
      setFormData({
        ...formData,
        usefulLifeMonths: months
      });
      return;
    }
    
    setFormData({
      ...formData,
      [name]: value
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

      // Asegurar que todos los valores numéricos son números, no cadenas
      const assetData = {
        ...formData,
        cost: Number(formData.cost),
        usefulLifeMonths: Number(formData.usefulLifeMonths),
        residualValue: 0,
        depreciationMethod: 'straightLine'
      } as CreateFixedAssetData;

      console.log("Creando activo con datos:", assetData);

      // Crear el activo
      await fixedAssetService.createFixedAsset(assetData);
      
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
        invoiceNumber: '',
        notes: '',
      });
      onAssetAdded();
    } catch (error) {
      console.error("Error al crear activo:", error);
      // Mostrar más detalles del error para facilitar la depuración
      let errorMessage = "No se pudo crear el activo. Intente nuevamente.";
      if (error instanceof Error) {
        errorMessage += ` Error: ${error.message}`;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
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
              <Label htmlFor="cost" className="text-right">Valor *</Label>
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