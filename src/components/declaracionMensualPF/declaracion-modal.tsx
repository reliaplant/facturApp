import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Declaracion } from '@/models/declaracion';
import { useToast } from '@/components/ui/use-toast';
import { declaracionService } from '@/services/declaracion-service';

interface DeclaracionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (declaracion: Declaracion) => void;
  year: number;
  clientId: string;
  declaracion?: Declaracion | null;
}

const DeclaracionModal: React.FC<DeclaracionModalProps> = ({
  open,
  onClose,
  onSave,
  year,
  clientId,
  declaracion = null
}) => {
  const isEditMode = !!declaracion;
  const [newDeclaracion, setNewDeclaracion] = useState<Partial<Declaracion>>({
    mes: '',
    anio: year,
    tipoDeclaracion: 'ordinaria',
    clientePagoImpuestos: false,
    clientePagoServicio: false,
    fechaPresentacion: new Date(),
    fechaLimitePago: null,
    montoISR: 0,
    montoIVA: 0
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Reset form when modal opens or year changes
  useEffect(() => {
    if (open) {
      if (declaracion) {
        // Edit mode - populate form with existing data
        setNewDeclaracion({
          ...declaracion,
          // Ensure dates are properly handled
          fechaPresentacion: declaracion.fechaPresentacion 
            ? new Date(declaracion.fechaPresentacion) 
            : new Date(),
          fechaLimitePago: declaracion.fechaLimitePago 
            ? new Date(declaracion.fechaLimitePago) 
            : null
        });
      } else {
        // Create mode - reset form
        setNewDeclaracion({
          mes: '',
          anio: year,
          tipoDeclaracion: 'ordinaria',
          clientePagoImpuestos: false,
          clientePagoServicio: false,
          fechaPresentacion: new Date(),
          fechaLimitePago: null,
          montoISR: 0,
          montoIVA: 0
        });
      }
    }
  }, [open, year, declaracion]);

  const handleSave = async () => {
    if (!clientId) {
      console.error("Cannot save declaration: No client ID provided");
      toast({
        title: "Error",
        description: "No se pudo guardar la declaración: ID de cliente faltante",
        variant: "destructive",
      });
      return;
    }

    if (newDeclaracion.mes) {
      setSaving(true);
      try {
        console.log(`${isEditMode ? 'Updating' : 'Creating'} declaration for client ${clientId}`);
        
        // Create a full Declaracion object from form data
        const declaracionData: Declaracion = {
          id: newDeclaracion.id,
          mes: newDeclaracion.mes as string,
          anio: year,
          tipoDeclaracion: newDeclaracion.tipoDeclaracion || 'ordinaria',
          clientePagoImpuestos: Boolean(newDeclaracion.clientePagoImpuestos),
          clientePagoServicio: Boolean(newDeclaracion.clientePagoServicio),
          fechaPresentacion: newDeclaracion.fechaPresentacion || new Date(),
          fechaLimitePago: newDeclaracion.fechaLimitePago || null,
          montoISR: Number(newDeclaracion.montoISR || 0),
          montoIVA: Number(newDeclaracion.montoIVA || 0),
          archivoLineaCaptura: null,
          urlArchivoLineaCaptura: null
        };
        
        if (isEditMode && declaracionData.id) {
          // Update existing declaration
          await declaracionService.updateDeclaracion(clientId, declaracionData);
          
          toast({
            title: "Declaración actualizada",
            description: `Se ha actualizado la declaración de ${getMesNombre(declaracionData.mes)} ${year}`,
          });
        } else {
          // Check if declaration already exists for this month/year
          const exists = await declaracionService.declaracionExists(
            clientId, 
            declaracionData.mes, 
            declaracionData.anio
          );
          
          if (exists) {
            toast({
              title: "Declaración duplicada",
              description: `Ya existe una declaración para ${getMesNombre(declaracionData.mes)} ${year}`,
              variant: "destructive"
            });
            setSaving(false);
            return;
          }
          
          // Create new declaration
          const declaracionId = await declaracionService.createDeclaracion(clientId, declaracionData);
          declaracionData.id = declaracionId;
          
          toast({
            title: "Declaración creada",
            description: `Se ha creado la declaración para ${getMesNombre(declaracionData.mes)} ${year}`,
          });
        }
        
        // Notify parent component
        onSave(declaracionData);
        
        // Close modal
        onClose();
      } catch (error) {
        console.error("Error al guardar la declaración:", error);
        toast({
          title: "Error",
          description: `No se pudo ${isEditMode ? 'actualizar' : 'crear'} la declaración`,
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }
  };

  // Helper function to get month name
  const getMesNombre = (mes: string): string => {
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return meses[parseInt(mes) - 1] || "";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar' : 'Nueva'} Declaración
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="mes">Mes</Label>
            <Select
              value={newDeclaracion.mes}
              onValueChange={(value) => setNewDeclaracion({...newDeclaracion, mes: value})}
              disabled={isEditMode} // Can't change month in edit mode
            >
              <SelectTrigger id="mes">
                <SelectValue placeholder="Selecciona el mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Enero</SelectItem>
                <SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem>
                <SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="tipoDeclaracion">Tipo de Declaración</Label>
            <Select
              value={newDeclaracion.tipoDeclaracion || 'ordinaria'}
              onValueChange={(value) => setNewDeclaracion({...newDeclaracion, tipoDeclaracion: value})}
            >
              <SelectTrigger id="tipoDeclaracion">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ordinaria">Ordinaria</SelectItem>
                <SelectItem value="complementaria">Complementaria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="montoISR" className="mb-1 block">Monto ISR</Label>
              <input
                id="montoISR"
                type="number"
                value={newDeclaracion.montoISR}
                onChange={(e) => setNewDeclaracion({
                  ...newDeclaracion, 
                  montoISR: parseFloat(e.target.value) || 0
                })}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <Label htmlFor="montoIVA" className="mb-1 block">Monto IVA</Label>
              <input
                id="montoIVA"
                type="number"
                value={newDeclaracion.montoIVA}
                onChange={(e) => setNewDeclaracion({
                  ...newDeclaracion, 
                  montoIVA: parseFloat(e.target.value) || 0
                })}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                id="clientePagoImpuestos"
                type="checkbox"
                checked={newDeclaracion.clientePagoImpuestos}
                onChange={(e) => setNewDeclaracion({
                  ...newDeclaracion, 
                  clientePagoImpuestos: e.target.checked
                })}
                className="h-4 w-4 mr-2"
              />
              <Label htmlFor="clientePagoImpuestos">Cliente Pagó Impuestos</Label>
            </div>
            <div className="flex items-center">
              <input
                id="clientePagoServicio"
                type="checkbox"
                checked={newDeclaracion.clientePagoServicio}
                onChange={(e) => setNewDeclaracion({
                  ...newDeclaracion, 
                  clientePagoServicio: e.target.checked
                })}
                className="h-4 w-4 mr-2"
              />
              <Label htmlFor="clientePagoServicio">Cliente Pagó Servicio</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!newDeclaracion.mes || saving}>
            {saving ? "Guardando..." : isEditMode ? "Actualizar" : "Crear"} Declaración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclaracionModal;
