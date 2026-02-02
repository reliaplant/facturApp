'use client';

import { motion, AnimatePresence } from 'framer-motion';

export default function ScreenAnual() {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="anual"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <div className="text-center mb-3">
          <h3 className="text-lg font-semibold text-zinc-800">Declaración Anual</h3>
          <p className="text-xs text-zinc-500">Ejercicio fiscal 2025</p>
        </div>

        {/* Resumen del año */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-zinc-100 p-3 mb-3"
        >
          <p className="text-[10px] text-zinc-500 mb-2">Resumen del ejercicio</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] text-zinc-400">Ingresos</p>
              <p className="text-sm font-bold text-zinc-800">$842,500</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-400">Gastos deducibles</p>
              <p className="text-sm font-bold text-zinc-800">$298,340</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-400">ISR pagado</p>
              <p className="text-sm font-bold text-zinc-800">$98,450</p>
            </div>
            <div>
              <p className="text-[9px] text-zinc-400">Ded. personales</p>
              <p className="text-sm font-bold text-zinc-800">$45,200</p>
            </div>
          </div>
        </motion.div>

        {/* Resultado */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-emerald-50 rounded-xl p-3 mb-3"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-zinc-600">Resultado estimado</p>
              <p className="text-lg font-bold text-emerald-600">$12,340 a favor</p>
            </div>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-lg">✓</span>
            </div>
          </div>
        </motion.div>

        {/* Fechas importantes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-zinc-100 p-3"
        >
          <p className="text-[10px] text-zinc-500 mb-2">Fecha límite de presentación</p>
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-sm font-medium text-zinc-800">30 de abril de 2026</p>
              <p className="text-[10px] text-zinc-400">Faltan 88 días</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
