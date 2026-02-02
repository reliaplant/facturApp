'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenDeclaraciones() {
  const declaraciones = [
    { mes: 'Enero 2026', tipo: 'Ord.', monto: '$12,450', pagada: false },
    { mes: 'Diciembre 2025', tipo: 'Ord.', monto: '$8,320', pagada: true },
    { mes: 'Noviembre 2025', tipo: 'Ord.', monto: '$9,150', pagada: true },
    { mes: 'Octubre 2025', tipo: 'Ord.', monto: '$7,890', pagada: true },
    { mes: 'Septiembre 2025', tipo: 'Compl.', monto: '$6,540', pagada: true },
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="declaraciones"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Declaraciones Mensuales</h3>
          <p className="text-xs text-zinc-500">Estado de declaraciones 2025-2026</p>
        </div>

        {/* Banner de pago pendiente */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-emerald-700 p-3 rounded-xl text-white mb-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-emerald-600 rounded-full flex items-center justify-center">
              <span className="text-xs">💵</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold">Pago pendiente: Enero 2026</p>
              <p className="text-[9px] opacity-80">Monto: $12,450.00</p>
            </div>
          </div>
        </motion.div>
        
        <div className="space-y-2 overflow-y-auto max-h-[320px] scrollbar-hide">
          {declaraciones.map((decl, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
              className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-800">{decl.mes}</p>
                    <span className="text-[9px] font-bold text-violet-600">{decl.tipo}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    {decl.pagada ? 'Pagada' : 'Pendiente de pago'}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${decl.pagada ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {decl.monto}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
