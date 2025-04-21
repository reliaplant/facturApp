'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenEmitidas() {
  const facturas = [
    { 
      cliente: 'Empresas ABC', 
      folio: 'FAC-2023-145', 
      fecha: '15/05/2023', 
      monto: '$5,800.00',
      estatus: 'Pagada',
      color: 'bg-emerald-100 text-emerald-800' 
    },
    { 
      cliente: 'Servicios XYZ', 
      folio: 'FAC-2023-144', 
      fecha: '10/05/2023', 
      monto: '$3,200.00',
      estatus: 'Pendiente',
      color: 'bg-amber-100 text-amber-800' 
    },
    { 
      cliente: 'Consultoría Legal', 
      folio: 'FAC-2023-143', 
      fecha: '02/05/2023', 
      monto: '$7,500.00',
      estatus: 'Pagada',
      color: 'bg-emerald-100 text-emerald-800' 
    },
    { 
      cliente: 'Distribuidora Nacional', 
      folio: 'FAC-2023-142', 
      fecha: '28/04/2023', 
      monto: '$4,150.00',
      estatus: 'Pagada',
      color: 'bg-emerald-100 text-emerald-800' 
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="emitidas"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Facturas Emitidas</h3>
          <p className="text-sm text-zinc-600">Control de ingresos</p>
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
                <p className="text-sm font-medium text-zinc-800">{factura.cliente}</p>
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
