'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenActivos() {
  const activos = [
    { 
      nombre: 'MacBook Pro M3', 
      categoria: 'Equipo de cómputo',
      costo: '$45,000.00',
      depAcum: '$13,500.00',
      valorActual: '$31,500.00'
    },
    { 
      nombre: 'Escritorio ejecutivo', 
      categoria: 'Mobiliario',
      costo: '$12,500.00',
      depAcum: '$1,250.00',
      valorActual: '$11,250.00'
    },
    { 
      nombre: 'iPhone 15 Pro', 
      categoria: 'Equipo de cómputo',
      costo: '$28,000.00',
      depAcum: '$8,400.00',
      valorActual: '$19,600.00'
    },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="activos"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Activos Fijos</h3>
          <p className="text-xs text-zinc-500">Control de depreciación fiscal</p>
        </div>

        {/* Resumen */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-zinc-100 p-3 mb-3"
        >
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[9px] text-zinc-400">Valor Total</p>
              <p className="text-sm font-bold text-zinc-800">$85,500</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-400">Dep. Acum.</p>
              <p className="text-sm font-bold text-zinc-800">$23,150</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-400">Valor Actual</p>
              <p className="text-sm font-bold text-violet-600">$62,350</p>
            </div>
          </div>
        </motion.div>

        <p className="text-[10px] text-zinc-500 mb-2">3 activos registrados</p>

        <div className="space-y-2 overflow-y-auto max-h-[300px] scrollbar-hide">
          {activos.map((activo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.1 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{activo.nombre}</p>
                  <p className="text-[10px] text-zinc-400">{activo.categoria}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div>
                  <p className="text-zinc-400">Costo</p>
                  <p className="text-zinc-700 font-medium">{activo.costo}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Dep. Acum.</p>
                  <p className="text-zinc-700 font-medium">{activo.depAcum}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Valor Actual</p>
                  <p className="text-violet-600 font-bold">{activo.valorActual}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
