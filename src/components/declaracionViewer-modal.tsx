import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Declaracion } from '../models/declaracion';
import { formatCurrency } from '@/lib/utils';

interface DeclaracionViewerModalProps {
  open: boolean;
  onClose: () => void;
  declaracion: Declaracion | null;
}

const DeclaracionViewerModal: React.FC<DeclaracionViewerModalProps> = ({
  open,
  onClose,
  declaracion
}) => {
  if (!declaracion) return null;

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const getNombreMes = (mes: string) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mesNum = parseInt(mes);
    return meses[mesNum - 1];
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex justify-between items-center ">
          <DialogTitle className="text-lg font-medium">
            Declaración {getNombreMes(declaracion.mes)} {declaracion.anio}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-1 pb-3">

          {/* Información General */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">Información General</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Tipo de declaración:</span>
                <span className="ml-2 capitalize">{declaracion.tipoDeclaracion || 'Ordinaria'}</span>
              </div>
              <div>
                <span className="text-gray-500">Estatus:</span>
                <span className="ml-2 capitalize">{declaracion.estatus || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500">Fecha de presentación:</span>
                <span className="ml-2">{formatDate(declaracion.fechaPresentacion)}</span>
              </div>
              <div>
                <span className="text-gray-500">Fecha límite de pago:</span>
                <span className="ml-2">{formatDate(declaracion.fechaLimitePago)}</span>
              </div>
              <div>
                <span className="text-gray-500">Cliente pagó impuestos:</span>
                <span className="ml-2">{declaracion.clientePagoImpuestos ? 'Sí' : 'No'}</span>
              </div>
              <div>
                <span className="text-gray-500">Cliente pagó servicio:</span>
                <span className="ml-2">{declaracion.clientePagoServicio ? 'Sí' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Ingresos */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">Ingresos</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Ingresos del mes:</span>
                <span className="ml-2">{formatCurrency(declaracion.ingresosMes)}</span>
              </div>
              <div>
                <span className="text-gray-500">Ingresos acumulados:</span>
                <span className="ml-2">{formatCurrency(declaracion.ingresosAcumulados)}</span>
              </div>
            </div>
          </div>

          {/* Deducciones */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">Deducciones</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Deducciones del mes:</span>
                <span className="ml-2">{formatCurrency(declaracion.deduccionesMes)}</span>
              </div>
              <div>
                <span className="text-gray-500">Depreciación mensual:</span>
                <span className="ml-2">{formatCurrency(declaracion.depreciacionMensual)}</span>
              </div>
              <div>
                <span className="text-gray-500">Total deducciones del periodo:</span>
                <span className="ml-2">{formatCurrency(declaracion.totalDeduccionesPeriodo)}</span>
              </div>
              <div>
                <span className="text-gray-500">Deducciones acumuladas:</span>
                <span className="ml-2">{formatCurrency(declaracion.deduccionesAcumuladas)}</span>
              </div>
            </div>
          </div>

          {/* Utilidad */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">Utilidad</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Utilidad del mes:</span>
                <span className="ml-2">{formatCurrency(declaracion.utilidadMes)}</span>
              </div>
              <div>
                <span className="text-gray-500">Utilidad acumulada:</span>
                <span className="ml-2">{formatCurrency(declaracion.utilidadAcumulada)}</span>
              </div>
            </div>
          </div>

          {/* IVA */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">IVA</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">IVA cobrado:</span>
                <span className="ml-2">{formatCurrency(declaracion.ivaCobrado)}</span>
              </div>
              <div>
                <span className="text-gray-500">IVA pagado:</span>
                <span className="ml-2">{formatCurrency(declaracion.ivaPagado)}</span>
              </div>
              <div>
                <span className="text-gray-500">IVA retenido:</span>
                <span className="ml-2">{formatCurrency(declaracion.ivaRetenido)}</span>
              </div>
              <div>
                <span className="text-gray-500">IVA por pagar:</span>
                <span className="ml-2">{formatCurrency(declaracion.ivaPorPagar)}</span>
              </div>
              <div>
                <span className="text-gray-500">IVA a favor:</span>
                <span className="ml-2">{formatCurrency(declaracion.ivaAFavor)}</span>
              </div>
              <div>
                <span className="text-gray-500">Monto IVA declarado:</span>
                <span className="ml-2 font-medium">{formatCurrency(declaracion.montoIVA)}</span>
              </div>
            </div>
          </div>

          {/* ISR */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-semibold mb-2">ISR</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Base del impuesto:</span>
                <span className="ml-2">{formatCurrency(declaracion.baseImpuesto)}</span>
              </div>
              <div>
                <span className="text-gray-500">Límite inferior:</span>
                <span className="ml-2">{formatCurrency(declaracion.limiteInferior)}</span>
              </div>
              <div>
                <span className="text-gray-500">Excedente límite inferior:</span>
                <span className="ml-2">{formatCurrency(declaracion.excedenteLimiteInferior)}</span>
              </div>
              <div>
                <span className="text-gray-500">Porcentaje excedente:</span>
                <span className="ml-2">{declaracion.porcentajeExcedente}%</span>
              </div>
              <div>
                <span className="text-gray-500">Impuesto marginal:</span>
                <span className="ml-2">{formatCurrency(declaracion.impuestoMarginal)}</span>
              </div>
              <div>
                <span className="text-gray-500">Cuota fija:</span>
                <span className="ml-2">{formatCurrency(declaracion.cuotaFija)}</span>
              </div>
              <div>
                <span className="text-gray-500">Impuestos Art. 113:</span>
                <span className="ml-2">{formatCurrency(declaracion.impuestosArt113)}</span>
              </div>
              <div>
                <span className="text-gray-500">Pagos provisionales anteriores:</span>
                <span className="ml-2">{formatCurrency(declaracion.pagosProvisionalesAnteriores)}</span>
              </div>
              <div>
                <span className="text-gray-500">Retenciones del periodo:</span>
                <span className="ml-2">{formatCurrency(declaracion.retencionesPeriodo)}</span>
              </div>
              <div>
                <span className="text-gray-500">Retenciones acumuladas:</span>
                <span className="ml-2">{formatCurrency(declaracion.retencionesAcumuladas)}</span>
              </div>
              <div>
                <span className="text-gray-500">ISR a cargo:</span>
                <span className="ml-2">{formatCurrency(declaracion.isrACargo)}</span>
              </div>
              <div>
                <span className="text-gray-500">Impuesto por pagar:</span>
                <span className="ml-2">{formatCurrency(declaracion.impuestoPorPagar)}</span>
              </div>
              <div>
                <span className="text-gray-500">Monto ISR declarado:</span>
                <span className="ml-2 font-medium">{formatCurrency(declaracion.montoISR)}</span>
              </div>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeclaracionViewerModal;
