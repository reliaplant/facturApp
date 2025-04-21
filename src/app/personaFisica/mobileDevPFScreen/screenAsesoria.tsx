'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenAsesoria() {
  const items = [
    { fecha: 'Consulta #1', estatus: 'Resuelta', statusColor: 'bg-emerald-100 text-emerald-800', monto: 'Facturación' },
    { fecha: 'Consulta #2', estatus: 'En proceso', statusColor: 'bg-amber-100 text-amber-800', monto: 'Deducciones' },
    { fecha: 'Consulta #3', estatus: 'Programada', statusColor: 'bg-blue-100 text-blue-800', monto: 'Dec. Anual' },
    { fecha: 'Consulta #4', estatus: 'Nueva', statusColor: 'bg-violet-100 text-violet-800', monto: 'Impuestos' }
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="asesoria"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-zinc-800">Asesoría</h3>
          <p className="text-sm text-zinc-600">Consultas y seguimiento</p>
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[400px] scrollbar-hide">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-600">{item.fecha}</p>
                <span className={`px-2 py-1 ${item.statusColor} text-xs rounded-full`}>
                  {item.estatus}
                </span>
              </div>
              <p className="text-lg font-semibold mt-1 text-zinc-800">{item.monto}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
