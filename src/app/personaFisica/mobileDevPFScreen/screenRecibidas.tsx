'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenRecibidas() {
  const facturas = [
    { 
      emisor: 'Papelería Nacional', 
      folio: 'A-45293', 
      fecha: '12/05/2023', 
      monto: '$2,340.00',
      estatus: 'Válida',
      color: 'bg-emerald-100 text-emerald-800' 
    },
    { 
      emisor: 'Servicios Digitales', 
      folio: 'FS-1205', 
      fecha: '10/05/2023', 
      monto: '$1,890.00',
      estatus: 'Válida',
      color: 'bg-emerald-100 text-emerald-800' 
    },
    { 
      emisor: 'Transportes Rápidos', 
      folio: 'T-3829', 
      fecha: '01/05/2023', 
      monto: '$580.00',
      estatus: 'En revisión',
      color: 'bg-amber-100 text-amber-800' 
    },
    { 
      emisor: 'Renta de Oficina', 
      folio: 'R-9201', 
      fecha: '01/05/2023', 
      monto: '$7,500.00',
      estatus: 'Válida',
      color: 'bg-emerald-100 text-emerald-800' 
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="recibidas"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Facturas Recibidas</h3>
          <p className="text-sm text-zinc-600">Validación automática</p>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[400px] scrollbar-hide">
          {facturas.map((factura, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-zinc-800">{factura.emisor}</p>
                <span className={`px-2 py-1 ${factura.color} text-xs rounded-full`}>
                  {factura.estatus}
                </span>
              </div>
              <div className="mt-2 flex justify-between items-center">
                <div>
                  <p className="text-xs text-zinc-500">Folio: {factura.folio}</p>
                  <p className="text-xs text-zinc-500">Fecha: {factura.fecha}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-800">{factura.monto}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
