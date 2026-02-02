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
import { MonthlyFiscalData } from '@/components/fiscal-summary';

interface DeclaracionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (declaracion: Declaracion) => void;
  year: number;
  clientId: string;
  declaracion?: Declaracion | null;
  fiscalData?: MonthlyFiscalData[];
  calculateMonthISR?: (month: number, amount: number) => any;
  getAccumulatedRetainedISR?: (month: number) => number;
}

const DeclaracionModal: React.FC<DeclaracionModalProps> = ({
  open,
  onClose,
  onSave,
  year,
  clientId,
  declaracion = null,
  fiscalData = [],
  calculateMonthISR,
  getAccumulatedRetainedISR
}) => {
  const isEditMode = !!declaracion?.id;
  const [newDeclaracion, setNewDeclaracion] = useState<Partial<Declaracion>>({
    mes: '',
    anio: year,
    tipoDeclaracion: 'ordinaria',
    estatus: 'vigente',
    clientePagoImpuestos: false,
    clientePagoServicio: false,
    fechaPresentacion: new Date(),
    fechaLimitePago: null,
    montoISR: 0,
    montoIVA: 0,
    // Initialize all fields from the expanded interface with defaults
    ingresosMes: 0,
    ingresosAcumulados: 0,
    deduccionesMes: 0,
    depreciacionMensual: 0,
    totalDeduccionesPeriodo: 0,
    deduccionesAcumuladas: 0,
    utilidadMes: 0,
    utilidadAcumulada: 0,
    ivaCobrado: 0,
    ivaPagado: 0,
    ivaRetenido: 0,
    ivaPorPagar: 0,
    ivaAFavor: 0,
    baseImpuesto: 0,
    limiteInferior: 0,
    excedenteLimiteInferior: 0,
    porcentajeExcedente: 0,
    impuestoMarginal: 0,
    cuotaFija: 0,
    impuestosArt113: 0,
    pagosProvisionalesAnteriores: 0,
    retencionesPeriodo: 0,
    retencionesAcumuladas: 0,
    isrACargo: 0,
    impuestoPorPagar: 0
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
        // Create mode - reset form with minimal fields (rest will be populated when selecting month)
        setNewDeclaracion({
          mes: '',
          anio: year,
          tipoDeclaracion: 'ordinaria',
          estatus: 'vigente',
          clientePagoImpuestos: false,
          clientePagoServicio: false,
          fechaPresentacion: new Date(),
          fechaLimitePago: null,
          montoISR: 0,
          montoIVA: 0,
          // Initialize all fields from the expanded interface with defaults
          ingresosMes: 0,
          ingresosAcumulados: 0,
          deduccionesMes: 0,
          depreciacionMensual: 0,
          totalDeduccionesPeriodo: 0,
          deduccionesAcumuladas: 0,
          utilidadMes: 0,
          utilidadAcumulada: 0,
          ivaCobrado: 0,
          ivaPagado: 0,
          ivaRetenido: 0,
          ivaPorPagar: 0,
          ivaAFavor: 0,
          baseImpuesto: 0,
          limiteInferior: 0,
          excedenteLimiteInferior: 0,
          porcentajeExcedente: 0,
          impuestoMarginal: 0,
          cuotaFija: 0,
          impuestosArt113: 0,
          pagosProvisionalesAnteriores: 0,
          retencionesPeriodo: 0,
          retencionesAcumuladas: 0,
          isrACargo: 0,
          impuestoPorPagar: 0
        });
      }
    }
  }, [open, year, declaracion]);

  // Update tax amounts and all fiscal data fields when month is selected
  const handleMonthChange = (month: string) => {
    // Get the month index for the fiscal data (0-indexed)
    // Month "1" (Enero) = fiscalData[0], Month "2" (Febrero) = fiscalData[1], etc.
    const selectedMonthNumber = parseInt(month);
    const fiscalMonthIndex = selectedMonthNumber - 1; // Convert to 0-indexed
    
    console.log(`Selected ${month} (${getMesNombre(month)}), using fiscal data from index: ${fiscalMonthIndex}`);
    
    if (fiscalData && fiscalData[fiscalMonthIndex] && calculateMonthISR && getAccumulatedRetainedISR) {
      const monthData = fiscalData[fiscalMonthIndex];
      
      // Get depreciation directly from the monthData where we now explicitly include it
      const depreciationValue = monthData.depreciation || 0;
      
      // Calculate ISR
      const income = monthData.periodProfit;
      const isrCalc = calculateMonthISR(fiscalMonthIndex, income);
      const accRetentions = getAccumulatedRetainedISR(fiscalMonthIndex);
      
      // Calculate previous ISR payments
      let previousPayments = 0;
      for (let i = 0; i < fiscalMonthIndex; i++) {
        const prevIncome = fiscalData[i]?.periodProfit || 0;
        const prevIsrCalc = calculateMonthISR(i, prevIncome);
        const prevRetentions = getAccumulatedRetainedISR(i);
        const prevIsrCharge = Math.max(0, prevIsrCalc.totalTax - prevRetentions - 
          (i > 0 ? previousPayments : 0));
        previousPayments += prevIsrCharge;
      }
      
      // Calculate ISR to pay
      const isrCharge = Math.max(0, isrCalc.totalTax - accRetentions - previousPayments);
      
      // Calculate IVA to pay
      const ivaCollected = monthData.ivaCollected;
      const ivaPaid = monthData.ivaPaid;
      const ivaRetenido = monthData.ivaRetenido;
      const ivaCharge = Math.max(0, ivaCollected - ivaPaid - ivaRetenido);
      const ivaCredit = Math.max(0, ivaPaid + ivaRetenido - ivaCollected);
      
      // Set fecha límite de pago to 17th of next month
      const fechaLimite = new Date(year, selectedMonthNumber, 17);
      // If it's December, move to January of next year
      if (selectedMonthNumber === 12) {
        fechaLimite.setFullYear(year + 1);
        fechaLimite.setMonth(0);
      }

      // Get total deductions for this month (expenses + depreciation)
      const totalDeductions = monthData.expenseAmount + depreciationValue;
      
      // Update the form with calculated values and ALL fields from the fiscal data
      setNewDeclaracion({
        ...newDeclaracion,
        mes: month,
        fechaLimitePago: fechaLimite,
        // Visible fields
        montoISR: isrCharge,
        montoIVA: ivaCharge,
        
        // Populate all hidden fiscal fields
        ingresosMes: monthData.incomeAmount,
        ingresosAcumulados: monthData.periodIncomesTotal,
        deduccionesMes: monthData.expenseAmount,
        depreciacionMensual: depreciationValue,
        totalDeduccionesPeriodo: totalDeductions,
        deduccionesAcumuladas: monthData.periodExpensesTotal,
        utilidadMes: monthData.profit,
        utilidadAcumulada: monthData.periodProfit,
        ivaCobrado: monthData.ivaCollected,
        ivaPagado: monthData.ivaPaid,
        ivaRetenido: monthData.ivaRetenido,
        ivaPorPagar: ivaCharge,
        ivaAFavor: ivaCredit,
        baseImpuesto: isrCalc.taxBase,
        limiteInferior: isrCalc.lowerLimit,
        excedenteLimiteInferior: isrCalc.excess,
        porcentajeExcedente: isrCalc.percentage,
        impuestoMarginal: isrCalc.marginalTax,
        cuotaFija: isrCalc.fixedFee,
        impuestosArt113: isrCalc.totalTax,
        pagosProvisionalesAnteriores: previousPayments,
        retencionesPeriodo: getMonthlyRetainedISR(fiscalMonthIndex),
        retencionesAcumuladas: accRetentions,
        isrACargo: isrCharge,
        impuestoPorPagar: isrCharge
      });
    } else {
      // If fiscal data isn't available, just update the month
      setNewDeclaracion({
        ...newDeclaracion,
        mes: month
      });
    }
  };

  // Calculate retained ISR for a month (helper function)
  const getMonthlyRetainedISR = (month: number) => {
    if (getAccumulatedRetainedISR) {
      // If we have the accumulated function, we can calculate the monthly
      // by subtracting the previous month's accumulated from the current
      if (month === 0) {
        return getAccumulatedRetainedISR(0);
      } else {
        return getAccumulatedRetainedISR(month) - getAccumulatedRetainedISR(month - 1);
      }
    }
    return 0;
  };

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
          estatus: newDeclaracion.estatus || 'vigente',
          clientePagoImpuestos: Boolean(newDeclaracion.clientePagoImpuestos),
          clientePagoServicio: Boolean(newDeclaracion.clientePagoServicio),
          fechaPresentacion: newDeclaracion.fechaPresentacion || new Date(),
          fechaLimitePago: newDeclaracion.fechaLimitePago || null,
          montoISR: Number(newDeclaracion.montoISR || 0),
          montoIVA: Number(newDeclaracion.montoIVA || 0),
          archivoLineaCaptura: newDeclaracion.archivoLineaCaptura,
          urlArchivoLineaCaptura: newDeclaracion.urlArchivoLineaCaptura,
          
          // Include all fiscal data fields
          ingresosMes: Number(newDeclaracion.ingresosMes || 0),
          ingresosAcumulados: Number(newDeclaracion.ingresosAcumulados || 0),
          deduccionesMes: Number(newDeclaracion.deduccionesMes || 0),
          depreciacionMensual: Number(newDeclaracion.depreciacionMensual || 0),
          totalDeduccionesPeriodo: Number(newDeclaracion.totalDeduccionesPeriodo || 0),
          deduccionesAcumuladas: Number(newDeclaracion.deduccionesAcumuladas || 0),
          utilidadMes: Number(newDeclaracion.utilidadMes || 0),
          utilidadAcumulada: Number(newDeclaracion.utilidadAcumulada || 0),
          ivaCobrado: Number(newDeclaracion.ivaCobrado || 0),
          ivaPagado: Number(newDeclaracion.ivaPagado || 0),
          ivaRetenido: Number(newDeclaracion.ivaRetenido || 0),
          ivaPorPagar: Number(newDeclaracion.ivaPorPagar || 0),
          ivaAFavor: Number(newDeclaracion.ivaAFavor || 0),
          baseImpuesto: Number(newDeclaracion.baseImpuesto || 0),
          limiteInferior: Number(newDeclaracion.limiteInferior || 0),
          excedenteLimiteInferior: Number(newDeclaracion.excedenteLimiteInferior || 0),
          porcentajeExcedente: Number(newDeclaracion.porcentajeExcedente || 0),
          impuestoMarginal: Number(newDeclaracion.impuestoMarginal || 0),
          cuotaFija: Number(newDeclaracion.cuotaFija || 0),
          impuestosArt113: Number(newDeclaracion.impuestosArt113 || 0),
          pagosProvisionalesAnteriores: Number(newDeclaracion.pagosProvisionalesAnteriores || 0),
          retencionesPeriodo: Number(newDeclaracion.retencionesPeriodo || 0),
          retencionesAcumuladas: Number(newDeclaracion.retencionesAcumuladas || 0),
          isrACargo: Number(newDeclaracion.isrACargo || 0),
          impuestoPorPagar: Number(newDeclaracion.impuestoPorPagar || 0)
        };
        
        if (isEditMode && declaracionData.id) {
          // Update existing declaration
          await declaracionService.updateDeclaracion(clientId, declaracionData);
          
          toast({
            title: "Declaración actualizada",
            description: `Se ha actualizado la declaración de ${getMesNombre(declaracionData.mes)} ${year}`,
          });
        } else {
          // Create new declaration (service will automatically mark previous ones as 'sustituida')
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
          {/* Only show month and declaration type fields */}
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="mes">Mes a declarar</Label>
            <Select
              value={newDeclaracion.mes}
              onValueChange={handleMonthChange}
              disabled={isEditMode} // Can't change month in edit mode
            >
              <SelectTrigger id="mes">
                <SelectValue placeholder="Selecciona el mes" />
              </SelectTrigger>
              <SelectContent>
                {/* Mes a declarar = el mes del que se reportan los ingresos */}
                <SelectItem value="1">Enero {year}</SelectItem>
                <SelectItem value="2">Febrero {year}</SelectItem>
                <SelectItem value="3">Marzo {year}</SelectItem>
                <SelectItem value="4">Abril {year}</SelectItem>
                <SelectItem value="5">Mayo {year}</SelectItem>
                <SelectItem value="6">Junio {year}</SelectItem>
                <SelectItem value="7">Julio {year}</SelectItem>
                <SelectItem value="8">Agosto {year}</SelectItem>
                <SelectItem value="9">Septiembre {year}</SelectItem>
                <SelectItem value="10">Octubre {year}</SelectItem>
                <SelectItem value="11">Noviembre {year}</SelectItem>
                <SelectItem value="12">Diciembre {year}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="tipoDeclaracion">Tipo de Declaración</Label>
            <Select
              value={newDeclaracion.tipoDeclaracion || 'ordinaria'}
              onValueChange={(value: "ordinaria" | "complementaria") => setNewDeclaracion({...newDeclaracion, tipoDeclaracion: value})}
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
