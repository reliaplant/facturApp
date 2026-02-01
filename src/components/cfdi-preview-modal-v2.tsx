"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CFDI } from "@/models/CFDI";
import { X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CFDIPreviewModalProps {
  cfdi: CFDI | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (cfdi: CFDI) => void;
}

// Catálogo de uso CFDI
const usoCFDICatalogo: Record<string, string> = {
  'G01': 'Adquisición de mercancías',
  'G02': 'Devoluciones, descuentos o bonificaciones',
  'G03': 'Gastos en general',
  'I01': 'Construcciones',
  'I02': 'Mobiliario y equipo de oficina',
  'I03': 'Equipo de transporte',
  'I04': 'Equipo de computo y accesorios',
  'I05': 'Dados, troqueles, herramental',
  'I06': 'Comunicaciones telefónicas',
  'I07': 'Comunicaciones satelitales',
  'I08': 'Otra maquinaria y equipo',
  'D01': 'Honorarios médicos y gastos hospitalarios',
  'D02': 'Gastos médicos por incapacidad',
  'D03': 'Gastos funerales',
  'D04': 'Donativos',
  'D05': 'Intereses hipotecarios',
  'D06': 'Aportaciones voluntarias al SAR',
  'D07': 'Primas por seguros de gastos médicos',
  'D08': 'Gastos de transportación escolar',
  'D09': 'Depósitos en cuentas de ahorro',
  'D10': 'Pago de servicios educativos',
  'S01': 'Sin efectos fiscales',
  'CP01': 'Pagos',
  'CN01': 'Nómina',
};

// Catálogo de forma de pago
const formaPagoCatalogo: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '12': 'Dación en pago',
  '13': 'Pago por subrogación',
  '14': 'Pago por consignación',
  '15': 'Condonación',
  '17': 'Compensación',
  '23': 'Novación',
  '24': 'Confusión',
  '25': 'Remisión de deuda',
  '26': 'Prescripción o caducidad',
  '27': 'A satisfacción del acreedor',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '30': 'Aplicación de anticipos',
  '31': 'Intermediario pagos',
  '99': 'Por definir',
};

// Catálogo de método de pago
const metodoPagoCatalogo: Record<string, string> = {
  'PUE': 'Pago en Una sola Exhibición',
  'PPD': 'Pago en Parcialidades o Diferido',
};

// Catálogo de tipo de comprobante
const tipoComprobanteCatalogo: Record<string, string> = {
  'I': 'Ingreso',
  'E': 'Egreso',
  'P': 'Pago',
  'N': 'Nómina',
  'T': 'Traslado',
};

// Catálogo de régimen fiscal
const regimenFiscalCatalogo: Record<string, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '609': 'Consolidación',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
};

export function CFDIPreviewModal({ cfdi, isOpen, onClose, onUpdate }: CFDIPreviewModalProps) {
  if (!cfdi) return null;

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '$0.00';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const isComplementoPago = cfdi.tipoDeComprobante === 'P';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] max-h-[95vh] p-0 gap-0 flex flex-col overflow-hidden [&>button]:hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg ${cfdi.estaCancelado ? 'bg-red-100 border-red-300' : 'bg-gray-100'}`}>
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold uppercase">{tipoComprobanteCatalogo[cfdi.tipoDeComprobante || 'I'] || cfdi.tipoDeComprobante}</span>
            <span className="font-mono text-purple-600">{cfdi.uuid}</span>
            {cfdi.estaCancelado && <span className="bg-red-500 text-white px-2 py-0.5 text-xs font-semibold">CANCELADO</span>}
          </div>
          <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 bg-white p-4 text-xs">
          {/* Fecha y serie/folio */}
          <div className="flex justify-between mb-4 pb-2 border-b">
            <div>
              <span className="text-gray-500">Fecha emisión: </span>
              <span>{formatDate(cfdi.fecha)}</span>
            </div>
            <div>
              <span className="text-gray-500">Serie / Folio: </span>
              <span>{cfdi.serie || '-'} / {cfdi.folio || '-'}</span>
            </div>
          </div>

          {/* Emisor y Receptor */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Emisor */}
            <div className="border p-3">
              <div className="font-semibold mb-2 pb-1 border-b">EMISOR</div>
              <table className="w-full">
                <tbody>
                  <tr><td className="text-gray-500 align-top w-20 py-0.5">RFC:</td><td className="font-mono py-0.5">{cfdi.rfcEmisor}</td></tr>
                  <tr><td className="text-gray-500 align-top py-0.5">Nombre:</td><td className="py-0.5">{cfdi.nombreEmisor}</td></tr>
                  <tr><td className="text-gray-500 align-top py-0.5">Régimen:</td><td className="py-0.5">{cfdi.regimenFiscal} - {regimenFiscalCatalogo[cfdi.regimenFiscal] || '-'}</td></tr>
                  {cfdi.lugarExpedicion && <tr><td className="text-gray-500 align-top py-0.5">CP:</td><td className="py-0.5">{cfdi.lugarExpedicion}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Receptor */}
            <div className="border p-3">
              <div className="font-semibold mb-2 pb-1 border-b">RECEPTOR</div>
              <table className="w-full">
                <tbody>
                  <tr><td className="text-gray-500 align-top w-20 py-0.5">RFC:</td><td className="font-mono py-0.5">{cfdi.rfcReceptor}</td></tr>
                  <tr><td className="text-gray-500 align-top py-0.5">Nombre:</td><td className="py-0.5">{cfdi.nombreReceptor}</td></tr>
                  {cfdi.regimenFiscalReceptor && <tr><td className="text-gray-500 align-top py-0.5">Régimen:</td><td className="py-0.5">{cfdi.regimenFiscalReceptor} - {regimenFiscalCatalogo[cfdi.regimenFiscalReceptor] || '-'}</td></tr>}
                  {cfdi.domicilioFiscalReceptor && <tr><td className="text-gray-500 align-top py-0.5">CP:</td><td className="py-0.5">{cfdi.domicilioFiscalReceptor}</td></tr>}
                  <tr><td className="text-gray-500 align-top py-0.5">Uso CFDI:</td><td className="py-0.5">{cfdi.usoCFDI} - {usoCFDICatalogo[cfdi.usoCFDI] || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Info de pago */}
          <div className="grid grid-cols-4 gap-4 mb-4 p-3 border bg-gray-50">
            <div>
              <div className="text-gray-500">Forma Pago</div>
              <div>{cfdi.formaPago} - {formaPagoCatalogo[cfdi.formaPago] || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Método Pago</div>
              <div>{cfdi.metodoPago} - {metodoPagoCatalogo[cfdi.metodoPago] || '-'}</div>
            </div>
            <div>
              <div className="text-gray-500">Moneda</div>
              <div>{cfdi.moneda || 'MXN'}</div>
            </div>
            <div>
              <div className="text-gray-500">Versión</div>
              <div>{cfdi.version || '4.0'}</div>
            </div>
          </div>

          {/* Conceptos */}
          {!isComplementoPago && cfdi.conceptos && cfdi.conceptos.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold mb-2">CONCEPTOS</div>
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Clave</th>
                    <th className="border p-2 text-left">Descripción</th>
                    <th className="border p-2 text-center">Cant</th>
                    <th className="border p-2 text-center">Unidad</th>
                    <th className="border p-2 text-right">P.Unit</th>
                    <th className="border p-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {cfdi.conceptos.map((concepto, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 font-mono">{concepto.claveProdServ}</td>
                      <td className="border p-2">{concepto.descripcion}</td>
                      <td className="border p-2 text-center">{concepto.cantidad}</td>
                      <td className="border p-2 text-center">{concepto.unidad || concepto.claveUnidad}</td>
                      <td className="border p-2 text-right">{formatCurrency(concepto.valorUnitario)}</td>
                      <td className="border p-2 text-right">{formatCurrency(concepto.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Complemento de Pago */}
          {isComplementoPago && cfdi.pagos && cfdi.pagos.length > 0 && (
            <div className="mb-4">
              <div className="font-semibold mb-2">PAGOS</div>
              {cfdi.pagos.map((pago, idx) => (
                <div key={idx} className="border p-3 mb-2">
                  <div className="grid grid-cols-4 gap-4 mb-2">
                    <div><span className="text-gray-500">Fecha: </span>{pago.fechaPago}</div>
                    <div><span className="text-gray-500">Forma: </span>{pago.formaPago}</div>
                    <div><span className="text-gray-500">Moneda: </span>{pago.moneda}</div>
                    <div><span className="text-gray-500">Monto: </span>{formatCurrency(pago.monto)}</div>
                  </div>
                  {pago.doctoRelacionados && pago.doctoRelacionados.length > 0 && (
                    <table className="w-full border-collapse border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-2 text-left">UUID Documento</th>
                          <th className="border p-2 text-center">Parc.</th>
                          <th className="border p-2 text-right">Saldo Ant</th>
                          <th className="border p-2 text-right">Pagado</th>
                          <th className="border p-2 text-right">Saldo Ins</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pago.doctoRelacionados.map((doc, docIdx) => (
                          <tr key={docIdx}>
                            <td className="border p-2 font-mono">{doc.idDocumento}</td>
                            <td className="border p-2 text-center">{doc.numParcialidad}</td>
                            <td className="border p-2 text-right">{formatCurrency(doc.impSaldoAnt)}</td>
                            <td className="border p-2 text-right">{formatCurrency(doc.impPagado)}</td>
                            <td className="border p-2 text-right">{formatCurrency(doc.impSaldoInsoluto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Totales */}
          <div className="flex justify-end">
            <table className="w-64 border-collapse border">
              <tbody>
                <tr className="border-b">
                  <td className="p-2">Subtotal</td>
                  <td className="p-2 text-right">{formatCurrency(cfdi.subTotal)}</td>
                </tr>
                {(cfdi.descuento || 0) > 0 && (
                  <tr className="border-b">
                    <td className="p-2">Descuento</td>
                    <td className="p-2 text-right">-{formatCurrency(cfdi.descuento)}</td>
                  </tr>
                )}
                {(cfdi.impuestoTrasladado || 0) > 0 && (
                  <tr className="border-b">
                    <td className="p-2">IVA Trasl.</td>
                    <td className="p-2 text-right">{formatCurrency(cfdi.impuestoTrasladado)}</td>
                  </tr>
                )}
                {(cfdi.ivaRetenido || 0) > 0 && (
                  <tr className="border-b">
                    <td className="p-2">IVA Ret.</td>
                    <td className="p-2 text-right">-{formatCurrency(cfdi.ivaRetenido)}</td>
                  </tr>
                )}
                {(cfdi.isrRetenido || 0) > 0 && (
                  <tr className="border-b">
                    <td className="p-2">ISR Ret.</td>
                    <td className="p-2 text-right">-{formatCurrency(cfdi.isrRetenido)}</td>
                  </tr>
                )}
                <tr className="bg-gray-100 font-semibold">
                  <td className="p-2">TOTAL</td>
                  <td className="p-2 text-right">{formatCurrency(cfdi.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
