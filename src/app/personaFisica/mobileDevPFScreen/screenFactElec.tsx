'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenFactElec() {
  const facturas = [
    { fecha: '15 Nov 2023', monto: '$1,250.00', estatus: 'Vigente', statusColor: 'bg-emerald-100 text-emerald-800' },
    { fecha: '08 Nov 2023', monto: '$3,480.00', estatus: 'Cancelada', statusColor: 'bg-red-100 text-red-800' },
    { fecha: '01 Nov 2023', monto: '$2,760.00', estatus: 'Pendiente', statusColor: 'bg-amber-100 text-amber-800' },
    { fecha: '28 Oct 2023', monto: '$5,430.00', estatus: 'Vigente', statusColor: 'bg-emerald-100 text-emerald-800' },
    { fecha: '15 Oct 2023', monto: '$1,890.00', estatus: 'Cancelada', statusColor: 'bg-red-100 text-red-800' },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="facturacion"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Mis Facturas</h3>
          <p className="text-sm text-zinc-600">Historial de facturación</p>
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[400px] scrollbar-hide">
          {facturas.map((factura, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-600">{factura.fecha}</p>
                <span className={`px-2 py-1 ${factura.statusColor} text-xs rounded-full`}>
                  {factura.estatus}
                </span>
              </div>
              <p className="text-lg font-semibold mt-1 text-zinc-800">{factura.monto}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
