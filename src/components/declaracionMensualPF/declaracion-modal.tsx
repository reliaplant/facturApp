import React, { useState } from 'react';
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

interface DeclaracionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (declaracion: Declaracion) => void;
  year: number;
}

const DeclaracionModal: React.FC<DeclaracionModalProps> = ({
  open,
  onClose,
  onSave,
  year
}) => {
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

  // Reset form when modal opens or year changes
  React.useEffect(() => {
    if (open) {
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
  }, [open, year]);

  const handleSave = () => {
    if (newDeclaracion.mes) {
      // Create a full Declaracion object from partial data
      const declaracion: Declaracion = {
        mes: newDeclaracion.mes as string,
        anio: year,
        tipoDeclaracion: newDeclaracion.tipoDeclaracion || 'ordinaria',
        clientePagoImpuestos: false,
        clientePagoServicio: false,
        fechaPresentacion: new Date(),
        fechaLimitePago: null,
        montoISR: 0,
        montoIVA: 0
      };
      
      onSave(declaracion);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nueva Declaración</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="mes">Mes</Label>
            <Select
              value={newDeclaracion.mes}
              onValueChange={(value) => setNewDeclaracion({...newDeclaracion, mes: value})}
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
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!newDeclaracion.mes}>
            Crear Declaración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclaracionModal;
